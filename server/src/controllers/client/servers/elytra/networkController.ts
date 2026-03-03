import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { NotFoundError, AppError } from '../../../../utils/errors'
import { fractalItem, fractalList } from '../../../../utils/response'

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

  // In production, check if server allows allocations and limit
  // then use FindAssignableAllocationService to find a free allocation.
  // TODO: Activity log: server:allocation.create

  return c.json(fractalItem('allocation', {}))
}

export async function updateAllocation(c: AppContext) {
  const server = c.var.server!
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

  // TODO: Activity log: server:allocation.notes

  return c.json(fractalItem('allocation', updated))
}

export async function setPrimaryAllocation(c: AppContext) {
  const server = c.var.server!
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

  // TODO: Activity log: server:allocation.primary

  return c.json(fractalItem('allocation', allocation))
}

export async function deleteAllocation(c: AppContext) {
  const server = c.var.server!
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

  // TODO: Activity log: server:allocation.delete

  return c.body(null, 204)
}
