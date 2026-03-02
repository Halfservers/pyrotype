import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';

function transformSSHKey(key: {
  name: string;
  fingerprint: string;
  publicKey: string;
  createdAt: Date;
}) {
  return {
    object: 'ssh_key',
    attributes: {
      name: key.name,
      fingerprint: key.fingerprint,
      public_key: key.publicKey,
      created_at: key.createdAt.toISOString(),
    },
  };
}

function computeFingerprint(publicKey: string): string {
  // Extract the key data (second part of the SSH public key format)
  const parts = publicKey.trim().split(/\s+/);
  const keyData = parts.length >= 2 ? parts[1] : parts[0];
  const hash = crypto.createHash('sha256').update(Buffer.from(keyData, 'base64')).digest('base64');
  return `SHA256:${hash.replace(/=+$/, '')}`;
}

export async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;

    const keys = await prisma.userSSHKey.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      object: 'list',
      data: keys.map(transformSSHKey),
    });
  } catch (err) {
    next(err);
  }
}

export async function store(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { name, public_key } = req.body;

    if (!name || !public_key) {
      throw new AppError('The name and public_key fields are required.', 422, 'ValidationError');
    }

    const fingerprint = computeFingerprint(public_key);

    // Check for duplicate fingerprint
    const existing = await prisma.userSSHKey.findFirst({
      where: { userId: user.id, fingerprint, deletedAt: null },
    });

    if (existing) {
      throw new AppError('This SSH key is already added to your account.', 422, 'ValidationError');
    }

    const key = await prisma.userSSHKey.create({
      data: {
        userId: user.id,
        name,
        publicKey: public_key,
        fingerprint,
      },
    });

    res.json(transformSSHKey(key));
  } catch (err) {
    next(err);
  }
}

export async function deleteSSHKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { fingerprint } = req.body;

    if (!fingerprint) {
      throw new AppError('The fingerprint field is required.', 422, 'ValidationError');
    }

    const key = await prisma.userSSHKey.findFirst({
      where: { userId: user.id, fingerprint, deletedAt: null },
    });

    if (key) {
      await prisma.userSSHKey.update({
        where: { id: key.id },
        data: { deletedAt: new Date() },
      });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
