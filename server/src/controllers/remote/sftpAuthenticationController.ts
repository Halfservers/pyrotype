import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { ForbiddenError, AppError } from '../../utils/errors'
import { verifyPassword } from '../../utils/crypto'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

const MAX_ATTEMPTS = 5
const WINDOW_SEC = 60

async function checkRateLimit(kv: KVNamespace, key: string): Promise<void> {
  const rlKey = `sftp-rl:${key}`
  const raw = await kv.get(rlKey)
  const count = raw ? parseInt(raw, 10) : 0

  if (count >= MAX_ATTEMPTS) {
    throw new AppError(
      `Too many login attempts, please try again in ${WINDOW_SEC} seconds.`,
      429,
      'TooManyRequests',
    )
  }

  await kv.put(rlKey, String(count + 1), { expirationTtl: WINDOW_SEC })
}

function parseUsername(value: string): { username: string; server: string } {
  // Reverse the string to handle usernames containing periods
  const reversed = value.split('').reverse().join('')
  const parts = reversed.split('.', 2)

  return {
    username: (parts[1] ?? '').split('').reverse().join(''),
    server: parts[0].split('').reverse().join(''),
  }
}

export async function authenticateSftp(c: AppContext) {
  const prisma = c.var.prisma
  const { username, password, type } = await c.req.json()

  if (!username || !password) {
    throw new AppError('Username and password are required.', 400, 'BadRequest')
  }

  const connection = parseUsername(username)

  if (!connection.server) {
    throw new AppError('No valid server identifier was included in the request.', 400, 'BadRequest')
  }

  const rateLimitKey = `${connection.username}|${c.req.header('cf-connecting-ip') ?? 'unknown'}`
  await checkRateLimit(c.env.SESSION_KV, rateLimitKey)

  // Find the user
  const user = await prisma.user.findFirst({
    where: { username: connection.username },
  })

  if (!user) {
    throw new ForbiddenError('Authorization credentials were not correct, please try again.')
  }

  // Verify credentials
  if (type !== 'public_key') {
    const passwordValid = await verifyPassword(password, user.password)
    if (!passwordValid) {
      throw new ForbiddenError('Authorization credentials were not correct, please try again.')
    }
  } else {
    // For public key auth, check SSH keys
    const fingerprint = password // In SSH key auth, the "password" field contains the key
    const keyExists = await prisma.userSSHKey.findFirst({
      where: { userId: user.id, fingerprint },
    })

    if (!keyExists) {
      throw new ForbiddenError('Authorization credentials were not correct, please try again.')
    }
  }

  // Find the server
  const node = c.var.node!
  const server = await prisma.server.findFirst({
    where: {
      nodeId: node.id,
      OR: [{ uuid: connection.server }, { uuidShort: connection.server }],
    },
  })

  if (!server) {
    throw new ForbiddenError('Authorization credentials were not correct, please try again.')
  }

  // Check SFTP access permissions (single query, reused for response)
  let permissions: string[] = ['*']
  if (!user.rootAdmin && server.ownerId !== user.id) {
    const subuser = await prisma.subuser.findFirst({
      where: { serverId: server.id, userId: user.id },
      select: { permissions: true },
    })

    const perms = subuser?.permissions as string[] ?? []
    if (!perms.includes('file.sftp')) {
      throw new ForbiddenError('You do not have permission to access SFTP for this server.')
    }
    permissions = perms
  }

  return c.json({
    user: user.uuid,
    server: server.uuid,
    permissions,
  })
}
