import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { generateApiKeyIdentifier, generateApiKeyToken } from '../../services/auth/apiKey';
import { AppError } from '../../utils/errors';

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

export async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;

    const keys = await prisma.apiKey.findMany({
      where: { userId: user.id, keyType: KEY_TYPE_ACCOUNT },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      object: 'list',
      data: keys.map(transformApiKey),
    });
  } catch (err) {
    next(err);
  }
}

export async function store(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { description, allowed_ips } = req.body;

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

    res.json({
      ...transformApiKey(key),
      meta: {
        secret_token: plain,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const identifier = req.params.identifier as string;

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

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
