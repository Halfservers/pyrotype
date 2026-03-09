import type { MiddlewareHandler } from 'hono'
import type { Env, HonoVariables } from '../types/env'
import { TooManyRequestsError } from '../utils/errors'

type AppEnv = { Bindings: Env; Variables: HonoVariables }

const requestCounts = new Map<string, { count: number; resetAt: number }>()

/** Rate limiter using in-memory Map. Alias that accepts windowMs. */
export function rateLimiter(maxRequests: number, windowMs: number): MiddlewareHandler<AppEnv> {
  return rateLimit(maxRequests, windowMs / 60000)
}

export function rateLimit(maxRequests: number, windowMinutes: number): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown'
    const key = `${clientIp}:${c.req.path}`
    const now = Date.now()
    const windowMs = windowMinutes * 60 * 1000

    const entry = requestCounts.get(key)
    if (!entry || now > entry.resetAt) {
      requestCounts.set(key, { count: 1, resetAt: now + windowMs })
      await next()
      return
    }

    entry.count++
    if (entry.count > maxRequests) {
      throw new TooManyRequestsError()
    }
    await next()
  }
}
