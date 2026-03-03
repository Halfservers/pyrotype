import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { ForbiddenError, AppError } from '../../utils/errors'
import { verifyPassword } from '../../utils/crypto'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

// Simple in-memory rate limiter for SFTP auth
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 60000

function checkRateLimit(key: string): void {
  const now = Date.now()
  const entry = loginAttempts.get(key)

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return
  }

  if (entry.count >= MAX_ATTEMPTS) {
    const seconds = Math.ceil((entry.resetAt - now) / 1000)
    throw new AppError(
      `Too many login attempts, please try again in ${seconds} seconds.`,
      429,
      'TooManyRequests',
    )
  }

  entry.count++
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
  checkRateLimit(rateLimitKey)

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

  // Check SFTP access permissions
  if (!user.rootAdmin && server.ownerId !== user.id) {
    const subuser = await prisma.subuser.findFirst({
      where: { serverId: server.id, userId: user.id },
      select: { permissions: true },
    })

    const perms = subuser?.permissions as string[] ?? []
    if (!perms.includes('file.sftp')) {
      throw new ForbiddenError('You do not have permission to access SFTP for this server.')
    }
  }

  // Build permissions list
  let permissions: string[] = ['*']
  if (!user.rootAdmin && server.ownerId !== user.id) {
    const subuser = await prisma.subuser.findFirst({
      where: { serverId: server.id, userId: user.id },
      select: { permissions: true },
    })
    permissions = subuser?.permissions as string[] ?? []
  }

  return c.json({
    user: user.uuid,
    server: server.uuid,
    permissions,
  })
}
