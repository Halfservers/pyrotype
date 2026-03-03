import { hashPassword } from '../../utils/crypto'

export function generateApiKeyIdentifier(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

export async function generateApiKeyToken(): Promise<{ plain: string; hashed: string }> {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const plain = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  const hashed = await hashPassword(plain)
  return { plain, hashed }
}
