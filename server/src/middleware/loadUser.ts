import type { MiddlewareHandler } from 'hono'
import { getCookie } from 'hono/cookie'
import type { Env, HonoVariables } from '../types/env'
import { loadSession } from '../services/auth/session'

/**
 * Middleware that loads the user from the KV session into c.var.user.
 * Does not reject unauthenticated requests -- that's handled by requireAuth.
 */
export const loadUser: MiddlewareHandler<{ Bindings: Env; Variables: HonoVariables }> = async (c, next) => {
  const cookie = getCookie(c, 'pyrotype_session')
  if (!cookie) {
    await next()
    return
  }

  const result = await loadSession(c.env.SESSION_KV, c.env.APP_KEY, cookie)
  if (!result) {
    await next()
    return
  }

  const prisma = c.var.prisma
  const user = await prisma.user.findUnique({ where: { id: result.data.userId } })
  if (user) {
    c.set('user', { ...user, rootAdmin: user.rootAdmin })
    c.set('session', result.data)
    c.set('sessionId', result.sessionId)
  }

  await next()
}
