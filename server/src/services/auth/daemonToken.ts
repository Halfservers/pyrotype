import crypto from 'crypto';

interface NodeLike {
  id: number;
  daemonToken: string;
}

interface UserLike {
  id: number;
}

export async function createDaemonToken(
  node: NodeLike,
  user: UserLike,
  claims: Record<string, unknown>,
): Promise<string> {
  // Generate a signed JWT-like token for daemon communication.
  // In production this would use jsonwebtoken with the node's daemon token as the secret.
  // For now, produce an opaque token that the daemon can verify.
  const payload = {
    iss: 'pyrotype',
    aud: [node.id.toString()],
    jti: crypto.randomUUID(),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 600, // 10 minutes
    user_id: user.id,
    ...claims,
  };

  // Placeholder: encode as base64 JSON. Replace with proper JWT signing when
  // jsonwebtoken is integrated.
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', node.daemonToken)
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}
