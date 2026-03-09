import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { NotFoundError, AppError } from '../../../../utils/errors'
import { fractalItem, fractalList } from '../../../../utils/response'
import { logActivity } from '../../../../services/activity'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function listAllocations(c: AppContext) {
  const server = c.var.server!
  const prisma = c.var.prisma

  const allocations = await prisma.allocation.findMany({
    where: { serverId: server.id },
  })

  return c.json(fractalList('allocation', allocations))
}

export async function createAllocation(c: AppContext) {
  const server = c.var.server!
  const user = c.var.user!
  const prisma = c.var.prisma

  // Check allocation limit
  if (server.allocationLimit !== null) {
    const currentCount = await prisma.allocation.count({ where: { serverId: server.id } })
    if (currentCount >= (server.allocationLimit ?? 0)) {
      throw new AppError('This server has reached its allocation limit.', 400, 'BadRequest')
    }
  }

  // Find an unassigned allocation on the server's node
  const freeAllocation = await prisma.allocation.findFirst({
    where: { nodeId: server.nodeId, serverId: null },
  })

  if (!freeAllocation) {
    throw new AppError('No allocations are available on this node.', 500, 'InternalError')
  }

  const updated = await prisma.allocation.update({
    where: { id: freeAllocation.id },
    data: { serverId: server.id },
  })

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:allocation.create',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { allocation_id: updated.id, ip: updated.ip, port: updated.port },
  })

  return c.json(fractalItem('allocation', updated))
}

export async function updateAllocation(c: AppContext) {
  const server = c.var.server!
  const user = c.var.user!
  const prisma = c.var.prisma
  const allocationId = c.req.param('allocation')
  const { notes } = await c.req.json()

  const allocation = await prisma.allocation.findFirst({
    where: { id: parseInt(String(allocationId)), serverId: server.id },
  })

  if (!allocation) {
    throw new NotFoundError('Allocation not found.')
  }

  const updated = await prisma.allocation.update({
    where: { id: allocation.id },
    data: { notes: notes ?? null },
  })

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:allocation.notes',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { allocation_id: allocation.id },
  })

  return c.json(fractalItem('allocation', updated))
}

export async function setPrimaryAllocation(c: AppContext) {
  const server = c.var.server!
  const user = c.var.user!
  const prisma = c.var.prisma
  const allocationId = c.req.param('allocation')

  const allocation = await prisma.allocation.findFirst({
    where: { id: parseInt(String(allocationId)), serverId: server.id },
  })

  if (!allocation) {
    throw new NotFoundError('Allocation not found.')
  }

  await prisma.server.update({
    where: { id: server.id },
    data: { allocationId: allocation.id },
  })

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:allocation.primary',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { allocation_id: allocation.id },
  })

  return c.json(fractalItem('allocation', allocation))
}

export async function deleteAllocation(c: AppContext) {
  const server = c.var.server!
  const user = c.var.user!
  const prisma = c.var.prisma
  const allocationId = c.req.param('allocation')

  const allocation = await prisma.allocation.findFirst({
    where: { id: parseInt(String(allocationId)), serverId: server.id },
  })

  if (!allocation) {
    throw new NotFoundError('Allocation not found.')
  }

  if (allocation.id === server.allocationId) {
    throw new AppError('You cannot delete the primary allocation for this server.', 400, 'BadRequest')
  }

  await prisma.allocation.update({
    where: { id: allocation.id },
    data: { notes: null, serverId: null },
  })

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:allocation.delete',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { allocation_id: allocation.id },
  })

  return c.body(null, 204)
}
