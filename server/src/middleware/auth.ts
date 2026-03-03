import type { MiddlewareHandler } from 'hono'
import type { Env, HonoVariables } from '../types/env'
import { AuthenticationError, ForbiddenError } from '../utils/errors'

type AppEnv = { Bindings: Env; Variables: HonoVariables }

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  // Check if user was loaded by loadUser middleware
  if (c.var.user) {
    await next()
    return
  }

  // Check Bearer token (API key)
  const authHeader = c.req.header('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const parts = token.split('.')
    if (parts.length === 2) {
      const [identifier, keyToken] = parts
      const prisma = c.var.prisma
      const apiKey = await prisma.apiKey.findFirst({
        where: { identifier, keyType: 2 }, // TYPE_ACCOUNT = 2
        include: { user: true },
      })
      if (apiKey && apiKey.token === keyToken) {
        await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
        c.set('user', { ...apiKey.user, rootAdmin: apiKey.user.rootAdmin })
        await next()
        return
      }
    }
  }

  throw new AuthenticationError()
}

export { requireAuth as isAuthenticated }

export const isAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!c.var.user?.rootAdmin) {
    throw new ForbiddenError('Must be an administrator.')
  }
  await next()
}

export const requireTwoFactor: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (c.var.user?.useTotp && !c.var.session?.twoFactorVerified) {
    throw new ForbiddenError('Two-factor authentication required.')
  }
  await next()
}
