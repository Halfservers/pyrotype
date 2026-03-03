import type { MiddlewareHandler } from 'hono'
import type { Env, HonoVariables } from '../types/env'
import { NotFoundError, ForbiddenError, ServerStateConflictError } from '../utils/errors'

type AppEnv = { Bindings: Env; Variables: HonoVariables }

export const authenticateServerAccess: MiddlewareHandler<AppEnv> = async (c, next) => {
  const serverId = c.req.param('server')
  if (!serverId) throw new NotFoundError('Server not specified.')

  const prisma = c.var.prisma
  const server = await prisma.server.findFirst({
    where: { OR: [{ uuid: serverId }, { uuidShort: serverId }, { id: isNaN(Number(serverId)) ? undefined : Number(serverId) }] },
    include: { node: true, allocation: true, egg: true },
  })

  if (!server) throw new NotFoundError('Server not found.')

  c.set('server', server as HonoVariables['server'])

  const user = c.var.user!
  if (server.ownerId === user.id || user.rootAdmin) {
    c.set('serverPermissions', ['*'])
    await next()
    return
  }

  const subuser = await prisma.subuser.findFirst({
    where: { serverId: server.id, userId: user.id },
  })

  if (!subuser) throw new NotFoundError('Server not found.')

  c.set('serverPermissions', (subuser.permissions as string[]) || [])
  await next()
}

export function requirePermission(...permissions: string[]): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const userPerms = c.var.serverPermissions || []

    if (userPerms.includes('*')) {
      await next()
      return
    }

    const hasPermission = permissions.some((perm) => {
      if (perm.endsWith('.*')) {
        const prefix = perm.slice(0, -1)
        return userPerms.some((p) => p.startsWith(prefix) || p === '*')
      }
      return userPerms.includes(perm)
    })

    if (!hasPermission) {
      throw new ForbiddenError('You do not have permission to perform this action.')
    }
    await next()
  }
}

export const validateServerState: MiddlewareHandler<AppEnv> = async (c, next) => {
  const server = c.var.server
  if (!server) throw new NotFoundError('Server not found.')

  if (
    server.status === 'suspended' ||
    server.node?.maintenanceMode ||
    server.status === 'restoring_backup'
  ) {
    throw new ServerStateConflictError()
  }
  await next()
}
