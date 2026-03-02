import crypto from 'crypto';
import { hashPassword } from '../../utils/crypto';

export function generateApiKeyIdentifier(): string {
  return crypto.randomBytes(8).toString('hex');
}

export async function generateApiKeyToken(): Promise<{ plain: string; hashed: string }> {
  const plain = crypto.randomBytes(32).toString('base64url');
  const hashed = await hashPassword(plain);
  return { plain, hashed };
}
