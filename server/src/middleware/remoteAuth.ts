import type { MiddlewareHandler } from 'hono'
import type { Env, HonoVariables } from '../types/env'
import { AuthenticationError } from '../utils/errors'

type AppEnv = { Bindings: Env; Variables: HonoVariables }

export const authenticateDaemonToken: MiddlewareHandler<AppEnv> = async (c, next) => {
  const authHeader = c.req.header('authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthenticationError('Missing or invalid authorization header.')
  }

  const bearer = authHeader.slice(7)

  // Wings sends "Bearer <token_id>.<token>" where token_id is the 16-char identifier
  const dotIndex = bearer.indexOf('.')
  if (dotIndex === -1) {
    throw new AuthenticationError('Invalid daemon token format.')
  }

  const tokenId = bearer.substring(0, dotIndex)
  const tokenSecret = bearer.substring(dotIndex + 1)

  if (!tokenId || !tokenSecret) {
    throw new AuthenticationError('Invalid daemon token format.')
  }

  const prisma = c.var.prisma
  const node = await prisma.node.findFirst({
    where: { daemonTokenId: tokenId },
  })

  if (!node || node.daemonToken !== tokenSecret) {
    throw new AuthenticationError('Authorization credentials were not correct.')
  }

  c.set('node', node)
  await next()
}
