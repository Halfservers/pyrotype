import type { MiddlewareHandler } from 'hono'
import type { Env, HonoVariables } from '../types/env'
import { AuthenticationError, ForbiddenError } from '../utils/errors'
import { verifyPassword } from '../utils/crypto'

type AppEnv = { Bindings: Env; Variables: HonoVariables }

/**
 * Middleware that allows admin access via either:
 * 1. Application API key (Bearer token, keyType=1)
 * 2. Session-based auth where user is rootAdmin
 */
export const requireAdminAccess: MiddlewareHandler<AppEnv> = async (c, next) => {
  // If user is already loaded from session (via loadUser middleware) and is admin, allow
  if (c.var.user?.rootAdmin) {
    await next()
    return
  }

  // Otherwise, fall through to API key auth
  await requireApiKeyHandler(c, next)
}

/**
 * Middleware for Application API key authentication (keyType = 1).
 * Expects: Authorization: Bearer <identifier>.<token>
 */
export const requireApiKey: MiddlewareHandler<AppEnv> = async (c, next) => {
  await requireApiKeyHandler(c, next)
}

async function requireApiKeyHandler(
  c: Parameters<MiddlewareHandler<AppEnv>>[0],
  next: Parameters<MiddlewareHandler<AppEnv>>[1],
): Promise<void> {
  const authHeader = c.req.header('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    if (!c.var.user) {
      throw new AuthenticationError('Authentication required')
    }
    throw new ForbiddenError('Admin access required')
  }

  const bearer = authHeader.slice(7)
  const dotIndex = bearer.indexOf('.')
  if (dotIndex === -1) {
    throw new AuthenticationError('Malformed API key')
  }

  const identifier = bearer.slice(0, dotIndex)
  const token = bearer.slice(dotIndex + 1)

  const prisma = c.var.prisma
  const apiKey = await prisma.apiKey.findUnique({
    where: { identifier },
    include: { user: true },
  })

  if (!apiKey || apiKey.keyType !== 1) {
    throw new AuthenticationError('Invalid API key')
  }

  const valid = await verifyPassword(token, apiKey.token)
  if (!valid) {
    throw new AuthenticationError('Invalid API key')
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    throw new AuthenticationError('API key has expired')
  }

  if (!apiKey.user.rootAdmin) {
    throw new ForbiddenError('This API key does not belong to an admin user')
  }

  // Check allowed IPs if configured
  const allowedIps = apiKey.allowedIps as string[] | null
  if (allowedIps && allowedIps.length > 0) {
    const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown'
    if (!allowedIps.includes(clientIp)) {
      throw new ForbiddenError('IP address not allowed for this API key')
    }
  }

  // Attach user and api key info to context
  c.set('user', { ...apiKey.user, rootAdmin: apiKey.user.rootAdmin })
  c.set('apiKey', apiKey)

  // Update last used timestamp (fire and forget)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {})

  await next()
}
