import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { AppError } from '../../../../utils/errors'
import { daemonRequest, DaemonConnectionError } from '../../../../services/daemon/proxy'
import { logActivity } from '../../../../services/activity'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function sendCommand(c: AppContext) {
  const server = c.var.server!
  const node = server.node!
  const user = c.var.user!
  const body = await c.req.json()
  const command = body.command as string

  if (!command || typeof command !== 'string') {
    throw new AppError('A command must be provided.', 422, 'ValidationError')
  }

  try {
    await daemonRequest(
      node, 'POST',
      `/api/servers/${server.uuid}/commands`,
      { command },
    )
  } catch (err) {
    if (err instanceof DaemonConnectionError) {
      throw new AppError('Server must be online to send commands.', 409, 'ConflictError')
    }
    throw err
  }

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(c.var.prisma, {
    event: 'server:console.command',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { command },
  })

  return c.body(null, 204)
}
