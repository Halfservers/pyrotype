import type { Context } from 'hono';
import type { Env, HonoVariables } from '../../types/env';
import { AppError } from '../../utils/errors';

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>;

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

async function computeFingerprint(publicKey: string): Promise<string> {
  const parts = publicKey.trim().split(/\s+/);
  const keyData = parts.length >= 2 ? parts[1] : parts[0];
  const rawBytes = Uint8Array.from(atob(keyData), (ch) => ch.charCodeAt(0));
  const hashBuffer = await crypto.subtle.digest('SHA-256', rawBytes);
  const hashArray = new Uint8Array(hashBuffer);
  const hashBase64 = btoa(String.fromCharCode(...hashArray));
  return `SHA256:${hashBase64.replace(/=+$/, '')}`;
}

export async function index(c: AppContext) {
  const user = c.var.user!;
  const prisma = c.var.prisma;

  const keys = await prisma.userSSHKey.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  return c.json({
    object: 'list',
    data: keys.map(transformSSHKey),
  });
}

export async function store(c: AppContext) {
  const user = c.var.user!;
  const prisma = c.var.prisma;
  const { name, public_key } = await c.req.json();

  if (!name || !public_key) {
    throw new AppError('The name and public_key fields are required.', 422, 'ValidationError');
  }

  const fingerprint = await computeFingerprint(public_key);

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

  return c.json(transformSSHKey(key));
}

export async function deleteSSHKey(c: AppContext) {
  const user = c.var.user!;
  const prisma = c.var.prisma;
  const { fingerprint } = await c.req.json();

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

  return c.body(null, 204);
}
