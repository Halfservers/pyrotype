import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { fractalItem } from '../../../../utils/response'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

// Simple in-memory cache for resource stats
const statsCache = new Map<string, { data: unknown; expiresAt: number }>()

export async function getResources(c: AppContext) {
  const server = c.var.server!
  const cacheKey = `resources:${server.uuid}`
  const now = Date.now()

  const cached = statsCache.get(cacheKey)
  if (cached && now < cached.expiresAt) {
    return c.json(fractalItem('stats', cached.data))
  }

  // In production, this would call the daemon API to get real-time stats.
  // For now, return a placeholder structure matching the expected response.
  const stats = {
    current_state: 'running',
    is_suspended: false,
    resources: {
      memory_bytes: 0,
      cpu_absolute: 0,
      disk_bytes: 0,
      network_rx_bytes: 0,
      network_tx_bytes: 0,
      uptime: 0,
    },
  }

  statsCache.set(cacheKey, { data: stats, expiresAt: now + 20000 })

  return c.json(fractalItem('stats', stats))
}
