import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { fractalItem } from '../../../../utils/response'
import { NotFoundError } from '../../../../utils/errors'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function index(c: AppContext) {
  const serverId = c.req.param('server')
  const prisma = c.var.prisma

  const server = await prisma.server.findFirst({
    where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
  })

  if (!server) throw new NotFoundError('Server not found')

  // TODO: Proxy to Wings daemon for live resource stats.
  // For now return a placeholder response matching the expected Fractal format.
  return c.json(fractalItem('stats', {
    current_state: 'offline',
    is_suspended: server.status === 'suspended',
    resources: {
      memory_bytes: 0,
      cpu_absolute: 0,
      disk_bytes: 0,
      network_rx_bytes: 0,
      network_tx_bytes: 0,
      uptime: 0,
    },
  }))
}
