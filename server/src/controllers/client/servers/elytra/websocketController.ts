import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { ForbiddenError } from '../../../../utils/errors'
import { generateDaemonJWT } from '../../../../services/daemon/jwt'
import { getDaemonWsUrl } from '../../../../services/daemon/proxy'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function getWebsocket(c: AppContext) {
  const server = c.var.server!
  const node = server.node!
  const user = c.var.user!
  const permissions = c.var.serverPermissions ?? []

  if (!user.rootAdmin && !permissions.includes('websocket.connect')) {
    throw new ForbiddenError('You do not have permission to connect to this server\'s websocket.')
  }

  const token = await generateDaemonJWT(
    c.env.APP_KEY,
    { user_id: user.id, server_uuid: server.uuid, permissions },
    600,
  )

  const socket = getDaemonWsUrl(node, server.uuid)

  return c.json({
    data: {
      token,
      socket,
    },
  })
}
