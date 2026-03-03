import type { MiddlewareHandler } from 'hono'
import type { Env, HonoVariables } from '../types/env'
import { AuthenticationError } from '../utils/errors'

type AppEnv = { Bindings: Env; Variables: HonoVariables }

export const authenticateDaemonToken: MiddlewareHandler<AppEnv> = async (c, next) => {
  const authHeader = c.req.header('authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthenticationError('Missing or invalid authorization header.')
  }

  const token = authHeader.slice(7)

  if (token.length < 16) {
    throw new AuthenticationError('Invalid daemon token format.')
  }

  // The first 16 characters of the token serve as the token identifier
  const tokenId = token.substring(0, 16)

  const prisma = c.var.prisma
  const node = await prisma.node.findFirst({
    where: { daemonTokenId: tokenId },
  })

  if (!node || node.daemonToken !== token) {
    throw new AuthenticationError('Authorization credentials were not correct.')
  }

  c.set('node', node)
  await next()
}
