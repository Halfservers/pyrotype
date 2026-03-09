import { hashPassword } from '../../utils/crypto'

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function generateTotpSecret(length = 20): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let result = ''
  for (let i = 0; i < bytes.length; i++) {
    result += BASE32_CHARS[bytes[i] % 32]
  }
  return result
}

export function generateTotpUrl(secret: string, email: string, issuer = 'Pyrotype'): string {
  const encodedIssuer = encodeURIComponent(issuer)
  const encodedEmail = encodeURIComponent(email)
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`
}

async function hmacSha1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, data)
  return new Uint8Array(sig)
}

function base32Decode(encoded: string): Uint8Array {
  const stripped = encoded.replace(/=+$/, '').toUpperCase()
  let bits = ''
  for (const char of stripped) {
    const val = BASE32_CHARS.indexOf(char)
    if (val === -1) throw new Error('Invalid base32 character')
    bits += val.toString(2).padStart(5, '0')
  }
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2))
  }
  return new Uint8Array(bytes)
}

async function generateTotpCode(secret: string, timeStep: number): Promise<string> {
  const key = base32Decode(secret)
  const timeBuffer = new ArrayBuffer(8)
  const view = new DataView(timeBuffer)
  view.setBigUint64(0, BigInt(timeStep))
  const hmac = await hmacSha1(key, new Uint8Array(timeBuffer))
  const offset = hmac[hmac.length - 1] & 0x0f
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  return (code % 1_000_000).toString().padStart(6, '0')
}

export async function verifyTotpCode(secret: string, code: string, window = 1): Promise<boolean> {
  const timeStep = Math.floor(Date.now() / 30000)
  for (let i = -window; i <= window; i++) {
    if ((await generateTotpCode(secret, timeStep + i)) === code) {
      return true
    }
  }
  return false
}

export async function generateRecoveryTokens(count = 10): Promise<{ raw: string[]; hashed: string[] }> {
  const raw: string[] = []
  const hashed: string[] = []
  for (let i = 0; i < count; i++) {
    const bytes = new Uint8Array(10)
    crypto.getRandomValues(bytes)
    const token = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
    raw.push(token)
    hashed.push(await hashPassword(token))
  }
  return { raw, hashed }
}
