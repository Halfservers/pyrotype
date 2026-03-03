interface NodeLike {
  id: number
  daemonToken: string
}

interface UserLike {
  id: number
}

export async function createDaemonToken(
  node: NodeLike,
  user: UserLike,
  claims: Record<string, unknown>,
): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const payload = {
    iss: 'pyrotype',
    aud: [node.id.toString()],
    jti: crypto.randomUUID(),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 600,
    user_id: user.id,
    ...claims,
  }

  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(node.daemonToken),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${header}.${body}`),
  )

  const signature = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return `${header}.${body}.${signature}`
}
