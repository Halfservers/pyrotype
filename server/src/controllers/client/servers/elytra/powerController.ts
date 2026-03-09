import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { AppError } from '../../../../utils/errors'
import { daemonRequest } from '../../../../services/daemon/proxy'
import { logActivity } from '../../../../services/activity'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

const VALID_SIGNALS = ['start', 'stop', 'restart', 'kill'] as const

export async function sendPower(c: AppContext) {
  const server = c.var.server!
  const node = server.node!
  const user = c.var.user!
  const body = await c.req.json()
  const signal = body.signal as string

  if (!signal || !VALID_SIGNALS.includes(signal as typeof VALID_SIGNALS[number])) {
    throw new AppError('An invalid power signal was provided.', 422, 'ValidationError')
  }

  await daemonRequest(
    node, 'POST',
    `/api/servers/${server.uuid}/power`,
    { action: signal },
  )

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(c.var.prisma, {
    event: `server:power.${signal}`,
    ip,
    userId: user.id,
    serverId: server.id,
  })

  return c.body(null, 204)
}
