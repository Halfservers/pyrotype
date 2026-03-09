import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { fractalItem } from '../../../../utils/response'
import { daemonRequest } from '../../../../services/daemon/proxy'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

const statsCache = new Map<string, { data: unknown; expiresAt: number }>()

interface DaemonStats {
  state?: string
  is_suspended?: boolean
  utilization?: {
    memory_bytes?: number
    cpu_absolute?: number
    disk_bytes?: number
    network?: {
      rx_bytes?: number
      tx_bytes?: number
    }
    uptime?: number
  }
}

export async function getResources(c: AppContext) {
  const server = c.var.server!
  const node = server.node!
  const cacheKey = `resources:${server.uuid}`
  const now = Date.now()

  const cached = statsCache.get(cacheKey)
  if (cached && now < cached.expiresAt) {
    return c.json(fractalItem('stats', cached.data))
  }

  const daemonStats = await daemonRequest<DaemonStats>(
    node, 'GET',
    `/api/servers/${server.uuid}`,
  )

  const stats = {
    current_state: daemonStats?.state ?? 'offline',
    is_suspended: daemonStats?.is_suspended ?? false,
    resources: {
      memory_bytes: daemonStats?.utilization?.memory_bytes ?? 0,
      cpu_absolute: daemonStats?.utilization?.cpu_absolute ?? 0,
      disk_bytes: daemonStats?.utilization?.disk_bytes ?? 0,
      network_rx_bytes: daemonStats?.utilization?.network?.rx_bytes ?? 0,
      network_tx_bytes: daemonStats?.utilization?.network?.tx_bytes ?? 0,
      uptime: daemonStats?.utilization?.uptime ?? 0,
    },
  }

  statsCache.set(cacheKey, { data: stats, expiresAt: now + 20000 })

  return c.json(fractalItem('stats', stats))
}
