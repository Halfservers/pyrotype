import crypto from 'crypto';
import { hashPassword } from '../../utils/crypto';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateTotpSecret(length = 20): string {
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    result += BASE32_CHARS[bytes[i] % 32];
  }
  return result;
}

export function generateTotpUrl(secret: string, email: string, issuer = 'Pyrotype'): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

function hmacSha1(key: Buffer, data: Buffer): Buffer {
  return crypto.createHmac('sha1', key).update(data).digest();
}

function base32Decode(encoded: string): Buffer {
  const stripped = encoded.replace(/=+$/, '').toUpperCase();
  let bits = '';
  for (const char of stripped) {
    const val = BASE32_CHARS.indexOf(char);
    if (val === -1) throw new Error('Invalid base32 character');
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function generateTotpCode(secret: string, timeStep: number): string {
  const key = base32Decode(secret);
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigUInt64BE(BigInt(timeStep));
  const hmac = hmacSha1(key, timeBuffer);
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, '0');
}

export function verifyTotpCode(secret: string, code: string, window = 1): boolean {
  const timeStep = Math.floor(Date.now() / 30000);
  for (let i = -window; i <= window; i++) {
    if (generateTotpCode(secret, timeStep + i) === code) {
      return true;
    }
  }
  return false;
}

export async function generateRecoveryTokens(count = 10): Promise<{ raw: string[]; hashed: string[] }> {
  const raw: string[] = [];
  const hashed: string[] = [];
  for (let i = 0; i < count; i++) {
    const token = crypto.randomBytes(10).toString('hex');
    raw.push(token);
    hashed.push(await hashPassword(token));
  }
  return { raw, hashed };
}
