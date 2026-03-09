import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { fractalPaginated } from '../../utils/response'
import { paginationSchema, getPaginationOffset } from '../../utils/pagination'
import { NotFoundError, ConflictError, ValidationError } from '../../utils/errors'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

function transformAllocation(alloc: any) {
  return {
    id: alloc.id,
    ip: alloc.ip,
    alias: alloc.ipAlias,
    port: alloc.port,
    notes: alloc.notes,
    assigned: alloc.serverId !== null,
    created_at: alloc.createdAt.toISOString(),
    updated_at: alloc.updatedAt.toISOString(),
  }
}

export async function index(c: AppContext) {
  const prisma = c.var.prisma
  const nodeId = parseInt(c.req.param('id'), 10)
  const node = await prisma.node.findUnique({ where: { id: nodeId } })
  if (!node) throw new NotFoundError('Node not found')

  const pagination = paginationSchema.parse({
    page: c.req.query('page'),
    per_page: c.req.query('per_page'),
  })
  const { skip, take } = getPaginationOffset(pagination)

  const filterIp = c.req.query('filter[ip]')
  const filterPort = c.req.query('filter[port]')
  const filterServerId = c.req.query('filter[server_id]')
  const filterIpAlias = c.req.query('filter[ip_alias]')

  const where: any = { nodeId }
  if (filterIp) where.ip = filterIp
  if (filterPort) where.port = parseInt(filterPort, 10)
  if (filterIpAlias) where.ipAlias = filterIpAlias
  if (filterServerId !== undefined) {
    if (!filterServerId || filterServerId === '0') {
      where.serverId = null
    } else {
      where.serverId = parseInt(filterServerId, 10)
    }
  }

  const [allocations, total] = await Promise.all([
    prisma.allocation.findMany({ where, skip, take, orderBy: { id: 'asc' } }),
    prisma.allocation.count({ where }),
  ])

  return c.json(fractalPaginated('allocation', allocations.map(transformAllocation), total, pagination.page, pagination.per_page))
}

export async function store(c: AppContext) {
  const prisma = c.var.prisma
  const nodeId = parseInt(c.req.param('id'), 10)
  const node = await prisma.node.findUnique({ where: { id: nodeId } })
  if (!node) throw new NotFoundError('Node not found')

  const { ip, ports, alias } = await c.req.json()

  if (!ip || !ports || !Array.isArray(ports)) {
    throw new ValidationError('IP and ports are required')
  }

  const ips = ip.includes('/') ? expandCIDR(ip) : [ip]

  const allocationsToCreate: { nodeId: number; ip: string; port: number; ipAlias: string | null }[] = []

  for (const resolvedIp of ips) {
    for (const portEntry of ports) {
      const parsed = parsePortRange(portEntry)
      for (const port of parsed) {
        allocationsToCreate.push({
          nodeId,
          ip: resolvedIp,
          port,
          ipAlias: alias || null,
        })
      }
    }
  }

  if (allocationsToCreate.length > 0) {
    for (const alloc of allocationsToCreate) {
      const existing = await prisma.allocation.findFirst({
        where: { nodeId: alloc.nodeId, ip: alloc.ip, port: alloc.port },
      })
      if (!existing) {
        await prisma.allocation.create({ data: alloc })
      }
    }
  }

  return c.body(null, 204)
}

export async function deleteAllocation(c: AppContext) {
  const prisma = c.var.prisma
  const nodeId = parseInt(c.req.param('id'), 10)
  const allocationId = parseInt(c.req.param('allocationId'), 10)

  const allocation = await prisma.allocation.findFirst({
    where: { id: allocationId, nodeId },
  })
  if (!allocation) throw new NotFoundError('Allocation not found')

  if (allocation.serverId !== null) {
    throw new ConflictError('Cannot delete an allocation that is assigned to a server.')
  }

  await prisma.allocation.delete({ where: { id: allocationId } })
  return c.body(null, 204)
}

export async function removeBlock(c: AppContext) {
  const prisma = c.var.prisma
  const nodeId = parseInt(c.req.param('id'), 10)
  const { ip } = await c.req.json()

  if (!ip) throw new ValidationError('IP address is required')

  const result = await prisma.allocation.deleteMany({
    where: {
      nodeId,
      ip,
      serverId: null,
    },
  })

  return c.json({ deleted: result.count })
}

export async function removeMultiple(c: AppContext) {
  const prisma = c.var.prisma
  const nodeId = parseInt(c.req.param('id'), 10)
  const { ids } = await c.req.json()

  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ValidationError('A non-empty array of allocation IDs is required')
  }

  const result = await prisma.allocation.deleteMany({
    where: {
      id: { in: ids },
      nodeId,
      serverId: null,
    },
  })

  return c.json({ deleted: result.count })
}

export async function setAlias(c: AppContext) {
  const prisma = c.var.prisma
  const nodeId = parseInt(c.req.param('id'), 10)
  const { allocation_id, alias } = await c.req.json()

  if (!allocation_id) throw new ValidationError('allocation_id is required')

  const allocation = await prisma.allocation.findFirst({
    where: { id: allocation_id, nodeId },
  })
  if (!allocation) throw new NotFoundError('Allocation not found on this node.')

  await prisma.allocation.update({
    where: { id: allocation_id },
    data: { ipAlias: alias || null },
  })

  return c.body(null, 204)
}

function expandCIDR(cidr: string): string[] {
  const [ip, prefixStr] = cidr.split('/')
  const prefix = parseInt(prefixStr, 10)

  if (isNaN(prefix) || prefix < 25 || prefix > 32) {
    throw new ValidationError('CIDR prefix must be between /25 and /32.')
  }

  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    throw new ValidationError('Invalid IP address in CIDR notation.')
  }

  const ipNum = (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]
  const mask = ~((1 << (32 - prefix)) - 1)
  const network = ipNum & mask
  const broadcast = network | (~mask >>> 0)

  const start = prefix >= 31 ? network : network + 1
  const end = prefix >= 31 ? broadcast : broadcast - 1

  const ips: string[] = []
  for (let i = start; i <= end; i++) {
    ips.push(`${(i >>> 24) & 255}.${(i >>> 16) & 255}.${(i >>> 8) & 255}.${i & 255}`)
  }
  return ips
}

function parsePortRange(entry: string): number[] {
  if (entry.includes('-')) {
    const [startStr, endStr] = entry.split('-')
    const start = parseInt(startStr, 10)
    const end = parseInt(endStr, 10)
    if (isNaN(start) || isNaN(end) || start > end || start < 1 || end > 65535) {
      throw new ValidationError(`Invalid port range: ${entry}`)
    }
    if (end - start > 1000) {
      throw new ValidationError('Port range cannot exceed 1000 ports')
    }
    const ports: number[] = []
    for (let p = start; p <= end; p++) {
      ports.push(p)
    }
    return ports
  }
  const port = parseInt(entry, 10)
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new ValidationError(`Invalid port: ${entry}`)
  }
  return [port]
}
