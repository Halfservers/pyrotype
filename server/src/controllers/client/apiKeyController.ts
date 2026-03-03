import type { Context } from 'hono';
import type { Env, HonoVariables } from '../../types/env';
import { generateApiKeyIdentifier, generateApiKeyToken } from '../../services/auth/apiKey';
import { AppError } from '../../utils/errors';

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>;

const KEY_TYPE_ACCOUNT = 1;

function transformApiKey(key: {
  identifier: string;
  memo: string | null;
  allowedIps: unknown;
  lastUsedAt: Date | null;
  createdAt: Date;
}) {
  return {
    object: 'api_key',
    attributes: {
      identifier: key.identifier,
      description: key.memo ?? '',
      allowed_ips: key.allowedIps ?? [],
      last_used_at: key.lastUsedAt?.toISOString() ?? null,
      created_at: key.createdAt.toISOString(),
    },
  };
}

export async function index(c: AppContext) {
  const user = c.var.user!;
  const prisma = c.var.prisma;

  const keys = await prisma.apiKey.findMany({
    where: { userId: user.id, keyType: KEY_TYPE_ACCOUNT },
    orderBy: { createdAt: 'desc' },
  });

  return c.json({
    object: 'list',
    data: keys.map(transformApiKey),
  });
}

export async function store(c: AppContext) {
  const user = c.var.user!;
  const prisma = c.var.prisma;
  const { description, allowed_ips } = await c.req.json();

  // Check limit
  const count = await prisma.apiKey.count({
    where: { userId: user.id, keyType: KEY_TYPE_ACCOUNT },
  });

  if (count >= 25) {
    throw new AppError('You have reached the account limit for number of API keys.', 400, 'BadRequestError');
  }

  const identifier = generateApiKeyIdentifier();
  const { plain, hashed } = await generateApiKeyToken();

  const key = await prisma.apiKey.create({
    data: {
      userId: user.id,
      keyType: KEY_TYPE_ACCOUNT,
      identifier,
      token: hashed,
      memo: description ?? null,
      allowedIps: Array.isArray(allowed_ips) ? allowed_ips as string[] : undefined,
    },
  });

  return c.json({
    ...transformApiKey(key),
    meta: {
      secret_token: plain,
    },
  });
}

export async function deleteKey(c: AppContext) {
  const user = c.var.user!;
  const prisma = c.var.prisma;
  const identifier = c.req.param('identifier');

  const key = await prisma.apiKey.findFirst({
    where: {
      userId: user.id,
      keyType: KEY_TYPE_ACCOUNT,
      identifier,
    },
  });

  if (!key) {
    throw new AppError('API key not found.', 404, 'NotFoundError');
  }

  await prisma.apiKey.delete({ where: { id: key.id } });

  return c.body(null, 204);
}
