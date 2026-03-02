import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { verifyPassword } from '../../utils/crypto';
import {
  generateTotpSecret,
  generateTotpUrl,
  verifyTotpCode,
  generateRecoveryTokens,
} from '../../services/auth/twoFactor';
import { AppError } from '../../utils/errors';

export async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;

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

    res.json({
      data: {
        image_url_data: imageUrl,
        secret,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function store(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { code, password } = req.body;

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

    res.json({
      object: 'recovery_tokens',
      attributes: {
        tokens: raw,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteTwoFactor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { password } = req.body;

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

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
