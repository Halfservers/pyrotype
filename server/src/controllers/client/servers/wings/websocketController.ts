import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { NotFoundError, ForbiddenError } from '../../../../utils/errors'
import { getUserPermissions } from '../../../../services/permissions'
import { createDaemonToken } from '../../../../services/auth/daemonToken'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function index(c: AppContext) {
  const user = c.var.user!
  const serverId = c.req.param('server')
  const prisma = c.var.prisma

  const server: any = await prisma.server.findFirst({
    where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
    include: { node: true },
  })

  if (!server) throw new NotFoundError('Server not found')

  const permissions = await getUserPermissions(prisma, server, user)

  if (!permissions.includes('websocket.connect')) {
    throw new ForbiddenError('You do not have permission to connect to this server\'s websocket.')
  }

  const node = server.node!
  const token = await createDaemonToken(node, user, {
    server_uuid: server.uuid,
    permissions,
  })

  const scheme = node.scheme === 'https' ? 'wss' : 'ws'
  const socket = `${scheme}://${node.fqdn}:${node.daemonListen}/api/servers/${server.uuid}/ws`

  return c.json({
    data: {
      token,
      socket,
    },
  })
}
