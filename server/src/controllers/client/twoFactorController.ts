import type { Context } from 'hono';
import type { Env, HonoVariables } from '../../types/env';
import { verifyPassword } from '../../utils/crypto';
import {
  generateTotpSecret,
  generateTotpUrl,
  verifyTotpCode,
  generateRecoveryTokens,
} from '../../services/auth/twoFactor';
import { AppError } from '../../utils/errors';
import { logActivity } from '../../services/activity';

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>;

export async function index(c: AppContext) {
  const user = c.var.user!;
  const prisma = c.var.prisma;

  if (user.useTotp) {
    throw new AppError('Two-factor authentication is already enabled on this account.', 400, 'BadRequestError');
  }

  const secret = generateTotpSecret();
  const imageUrl = generateTotpUrl(secret, user.email);

  // Store the secret temporarily on the user (not yet enabled)
  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: secret },
  });

  return c.json({
    data: {
      image_url_data: imageUrl,
      secret,
    },
  });
}

export async function store(c: AppContext) {
  const user = c.var.user!;
  const prisma = c.var.prisma;
  const { code, password } = await c.req.json();

  if (!code || !password) {
    throw new AppError('The code and password fields are required.', 422, 'ValidationError');
  }

  if (typeof code !== 'string' || code.length !== 6) {
    throw new AppError('The code must be a 6-digit string.', 422, 'ValidationError');
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    throw new AppError('The password provided was not valid.', 400, 'BadRequestError');
  }

  // Refetch user to get latest totp_secret
  const freshUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!freshUser?.totpSecret) {
    throw new AppError('Two-factor setup has not been initiated.', 400, 'BadRequestError');
  }

  const codeValid = verifyTotpCode(freshUser.totpSecret, code);
  if (!codeValid) {
    throw new AppError('The provided two-factor token is invalid.', 400, 'BadRequestError');
  }

  // Generate recovery tokens
  const { raw, hashed } = await generateRecoveryTokens();

  // Enable 2FA and store recovery tokens
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        useTotp: true,
        totpAuthenticatedAt: new Date(),
      },
    }),
    prisma.recoveryToken.deleteMany({ where: { userId: user.id } }),
    ...hashed.map((token) =>
      prisma.recoveryToken.create({
        data: { userId: user.id, token },
      }),
    ),
  ]);

  await logActivity(prisma, {
    event: 'user:two-factor.create',
    ip: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1',
    userId: user.id,
  });

  return c.json({
    object: 'recovery_tokens',
    attributes: {
      tokens: raw,
    },
  });
}

export async function deleteTwoFactor(c: AppContext) {
  const user = c.var.user!;
  const prisma = c.var.prisma;
  const { password } = await c.req.json();

  if (!password) {
    throw new AppError('The password field is required.', 422, 'ValidationError');
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    throw new AppError('The password provided was not valid.', 400, 'BadRequestError');
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        useTotp: false,
        totpAuthenticatedAt: new Date(),
      },
    }),
    prisma.recoveryToken.deleteMany({ where: { userId: user.id } }),
  ]);

  await logActivity(prisma, {
    event: 'user:two-factor.delete',
    ip: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1',
    userId: user.id,
  });

  return c.body(null, 204);
}
