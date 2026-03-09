interface JWTClaims {
  [key: string]: unknown
}

function base64UrlEncode(data: string): string {
  return btoa(data)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function generateDaemonJWT(
  appKey: string,
  claims: JWTClaims,
  expiresInSec = 600,
): Promise<string> {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))

  const payload: JWTClaims = {
    iss: 'pyrotype',
    jti: crypto.randomUUID(),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresInSec,
    ...claims,
  }

  const body = base64UrlEncode(JSON.stringify(payload))

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(appKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${header}.${body}`),
  )

  const signature = base64UrlEncode(
    String.fromCharCode(...new Uint8Array(sig)),
  )

  return `${header}.${body}.${signature}`
}
