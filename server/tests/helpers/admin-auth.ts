/**
 * Helper to create an Application API key for admin route testing.
 * The requireApiKey middleware expects keyType=1, bcrypt-hashed token,
 * and the owning user must be rootAdmin.
 */
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../../src/config/database';

const IDENTIFIER = 'testadminkey';
const PLAINTEXT_TOKEN = 'supersecrettesttoken123';

let hashedToken: string | null = null;

export async function ensureAdminApiKey(): Promise<string> {
  if (!hashedToken) {
    hashedToken = await bcrypt.hash(PLAINTEXT_TOKEN, 10);
  }

  // Find admin user (rootAdmin = true)
  const admin = await prisma.user.findFirst({ where: { rootAdmin: true } });
  if (!admin) {
    throw new Error('No admin user found in test database');
  }

  // Upsert the API key
  const existing = await prisma.apiKey.findUnique({ where: { identifier: IDENTIFIER } });
  if (!existing) {
    await prisma.apiKey.create({
      data: {
        userId: admin.id,
        keyType: 1, // Application key
        identifier: IDENTIFIER,
        token: hashedToken,
        memo: 'Test admin API key',
      },
    });
  }

  return `${IDENTIFIER}.${PLAINTEXT_TOKEN}`;
}

export function getAdminApiKey(): string {
  return `${IDENTIFIER}.${PLAINTEXT_TOKEN}`;
}

/**
 * Creates an API key for a non-admin user to test 403 responses.
 */
export async function ensureNonAdminApiKey(): Promise<string> {
  const identifier = 'testnonadminkey';
  const plainToken = 'nonadminsecrettoken456';
  const hashed = await bcrypt.hash(plainToken, 10);

  // Create a non-admin user if needed
  let user = await prisma.user.findFirst({ where: { rootAdmin: false } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        uuid: crypto.randomUUID(),
        username: 'regularuser',
        email: 'regular@pyrotype.local',
        nameFirst: 'Regular',
        password: await bcrypt.hash('password', 10),
        language: 'en',
        rootAdmin: false,
      },
    });
  }

  const existing = await prisma.apiKey.findUnique({ where: { identifier } });
  if (!existing) {
    await prisma.apiKey.create({
      data: {
        userId: user.id,
        keyType: 1,
        identifier,
        token: hashed,
        memo: 'Test non-admin API key',
      },
    });
  }

  return `${identifier}.${plainToken}`;
}
