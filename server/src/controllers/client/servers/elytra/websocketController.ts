import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { hmacSign } from '../../../../utils/crypto'
import { ForbiddenError } from '../../../../utils/errors'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function getWebsocket(c: AppContext) {
  const server = c.var.server!
  const user = c.var.user!
  const permissions = c.var.serverPermissions ?? []

  if (!user.rootAdmin && !permissions.includes('websocket.connect')) {
    throw new ForbiddenError('You do not have permission to connect to this server\'s websocket.')
  }

  // Generate a signed JWT-like token for daemon websocket auth
  const payload = {
    user_id: user.id,
    server_uuid: server.uuid,
    permissions,
    exp: Math.floor(Date.now() / 1000) + 600, // 10 minutes
  }

  const token = await hmacSign(c.env.APP_KEY, JSON.stringify(payload))

  // Build websocket URL from node connection address
  // Placeholder: actual node lookup would happen via prisma
  const socket = `wss://daemon.example.com/api/servers/${server.uuid}/ws`

  return c.json({
    data: {
      token,
      socket,
    },
  })
}
