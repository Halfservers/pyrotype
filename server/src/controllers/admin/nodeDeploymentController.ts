import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { fractalPaginated } from '../../utils/response'
import { paginationSchema, getPaginationOffset } from '../../utils/pagination'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

function transformNode(node: any) {
  return {
    id: node.id,
    uuid: node.uuid,
    public: node.public,
    name: node.name,
    description: node.description,
    location_id: node.locationId,
    fqdn: node.fqdn,
    scheme: node.scheme,
    behind_proxy: node.behindProxy,
    maintenance_mode: node.maintenanceMode,
    memory: node.memory,
    memory_overallocate: node.memoryOverallocate,
    disk: node.disk,
    disk_overallocate: node.diskOverallocate,
    daemon_listen: node.daemonListen,
    daemon_sftp: node.daemonSFTP,
    daemon_base: node.daemonBase,
    daemon_type: node.daemonType,
    created_at: node.createdAt.toISOString(),
    updated_at: node.updatedAt.toISOString(),
  }
}

export async function index(c: AppContext) {
  const prisma = c.var.prisma
  const pagination = paginationSchema.parse({
    page: c.req.query('page'),
    per_page: c.req.query('per_page'),
  })
  const { skip, take } = getPaginationOffset(pagination)

  const memoryReq = parseInt(c.req.query('memory') || '0', 10) || 0
  const diskReq = parseInt(c.req.query('disk') || '0', 10) || 0
  const locationIdsStr = c.req.query('location_ids')
  const locationIds = locationIdsStr
    ? locationIdsStr.split(',').map(Number).filter(Boolean)
    : []

  const where: any = {
    public: true,
    maintenanceMode: false,
  }

  if (locationIds.length > 0) {
    where.locationId = { in: locationIds }
  }

  const nodes = await prisma.node.findMany({
    where,
    include: {
      servers: {
        select: {
          memory: true,
          disk: true,
        },
      },
    },
    skip,
    take,
    orderBy: { id: 'asc' },
  })

  const viable = nodes.filter((node) => {
    const usedMemory = node.servers.reduce((sum, s) => sum + s.memory, 0)
    const usedDisk = node.servers.reduce((sum, s) => sum + s.disk, 0)

    const maxMemory = node.memoryOverallocate > 0
      ? node.memory * (1 + node.memoryOverallocate / 100)
      : node.memoryOverallocate === -1 ? Infinity : node.memory

    const maxDisk = node.diskOverallocate > 0
      ? node.disk * (1 + node.diskOverallocate / 100)
      : node.diskOverallocate === -1 ? Infinity : node.disk

    return (maxMemory - usedMemory) >= memoryReq && (maxDisk - usedDisk) >= diskReq
  })

  const total = viable.length
  return c.json(fractalPaginated('node', viable.map(transformNode), total, pagination.page, pagination.per_page))
}
