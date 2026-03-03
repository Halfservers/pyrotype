import type { MiddlewareHandler } from 'hono'
import type { Env, HonoVariables } from '../types/env'
import { ForbiddenError } from '../utils/errors'

type AppEnv = { Bindings: Env; Variables: HonoVariables }

export function requireDaemonType(expectedType: 'wings' | 'elytra'): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const server = c.var.server
    if (!server?.node) {
      await next()
      return
    }

    const nodeType = (server.node.daemonType || 'wings').toLowerCase()
    if (nodeType !== expectedType) {
      throw new ForbiddenError(`This endpoint is only available for ${expectedType} daemon type.`)
    }
    await next()
  }
}

export { requireDaemonType as checkDaemonType }
