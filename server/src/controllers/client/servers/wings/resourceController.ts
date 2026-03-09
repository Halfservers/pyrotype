import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { fractalItem } from '../../../../utils/response'
import { NotFoundError } from '../../../../utils/errors'
import { getWingsClient } from '../../../../services/wings/client'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

// Simple in-memory cache for resource stats (20-second TTL)
const statsCache = new Map<number, { data: any; expires: number }>()

export async function index(c: AppContext) {
  const serverId = c.req.param('server')
  const prisma = c.var.prisma

  const server: any = await prisma.server.findFirst({
    where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
    include: { node: true },
  })

  if (!server) throw new NotFoundError('Server not found')

  // Check cache
  const now = Date.now()
  const cached = statsCache.get(server.id)
  if (cached && cached.expires > now) {
    return c.json(fractalItem('stats', cached.data))
  }

  const wings = getWingsClient(server.node!)
  const usage = await wings.getResourceUsage(server.uuid)

  const stats = {
    current_state: usage.state,
    is_suspended: server.status === 'suspended',
    resources: {
      memory_bytes: usage.memory_bytes,
      cpu_absolute: usage.cpu_absolute,
      disk_bytes: usage.disk_bytes,
      network_rx_bytes: usage.network.rx_bytes,
      network_tx_bytes: usage.network.tx_bytes,
      uptime: usage.uptime,
    },
  }

  // Cache for 20 seconds
  statsCache.set(server.id, { data: stats, expires: now + 20_000 })

  return c.json(fractalItem('stats', stats))
}
