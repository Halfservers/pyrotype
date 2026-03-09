import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { fractalList, fractalItem } from '../../../../utils/response'
import { NotFoundError, AppError } from '../../../../utils/errors'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

function transformAllocation(alloc: any, primaryId: number) {
  return {
    id: alloc.id,
    ip: alloc.ip,
    ip_alias: alloc.ipAlias,
    port: alloc.port,
    notes: alloc.notes,
    is_default: alloc.id === primaryId,
  }
}

async function resolveServer(c: AppContext): Promise<any> {
  const serverId = c.req.param('server')
  const prisma = c.var.prisma
  const server = await prisma.server.findFirst({
    where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
    include: { allocations: true },
  })
  if (!server) throw new NotFoundError('Server not found')
  return server
}

export async function index(c: AppContext) {
  const server = await resolveServer(c)
  const data = server.allocations.map((a: any) => transformAllocation(a, server.allocationId))
  return c.json(fractalList('allocation', data))
}

export async function update(c: AppContext) {
  const server = await resolveServer(c)
  const prisma = c.var.prisma
  const allocationId = parseInt(c.req.param('allocation'), 10)

  const alloc = server.allocations.find((a: any) => a.id === allocationId)
  if (!alloc) throw new NotFoundError('Allocation not found')

  const body = await c.req.json()
  const notes = body.notes ?? null
  const updated = await prisma.allocation.update({
    where: { id: allocationId },
    data: { notes },
  })

  return c.json(fractalItem('allocation', transformAllocation(updated, server.allocationId)))
}

export async function setPrimary(c: AppContext) {
  const server = await resolveServer(c)
  const prisma = c.var.prisma
  const allocationId = parseInt(c.req.param('allocation'), 10)

  const alloc = server.allocations.find((a: any) => a.id === allocationId)
  if (!alloc) throw new NotFoundError('Allocation not found')

  await prisma.server.update({
    where: { id: server.id },
    data: { allocationId },
  })

  return c.json(fractalItem('allocation', transformAllocation(alloc, allocationId)))
}

export async function store(c: AppContext) {
  const server = await resolveServer(c)
  const prisma = c.var.prisma

  if (server.allocationLimit !== null && server.allocations.length >= server.allocationLimit) {
    throw new AppError('Cannot assign additional allocations to this server: limit has been reached.', 400, 'AllocationLimitReached')
  }

  // Find an unassigned allocation on the same node
  const available = await prisma.allocation.findFirst({
    where: { nodeId: server.nodeId, serverId: null },
  })

  if (!available) {
    throw new AppError('No allocations available on this node.', 400, 'NoAllocationsAvailable')
  }

  const assigned = await prisma.allocation.update({
    where: { id: available.id },
    data: { serverId: server.id },
  })

  return c.json(fractalItem('allocation', transformAllocation(assigned, server.allocationId)))
}

export async function deleteFn(c: AppContext) {
  const server = await resolveServer(c)
  const prisma = c.var.prisma
  const allocationId = parseInt(c.req.param('allocation'), 10)

  if (server.allocationLimit === 0 || server.allocationLimit === null) {
    throw new AppError('You cannot delete allocations for this server: no allocation limit is set.', 400, 'AllocationDeletionBlocked')
  }

  if (allocationId === server.allocationId) {
    throw new AppError('You cannot delete the primary allocation for this server.', 400, 'PrimaryAllocationDeletion')
  }

  await prisma.allocation.update({
    where: { id: allocationId },
    data: { notes: null, serverId: null },
  })

  return c.body(null, 204)
}
