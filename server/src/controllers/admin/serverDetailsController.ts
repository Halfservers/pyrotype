import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { fractalItem } from '../../utils/response'
import { NotFoundError } from '../../utils/errors'
import { daemonRequest, DaemonConnectionError } from '../../services/daemon/proxy'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

function transformServer(server: any) {
  return {
    id: server.id,
    external_id: server.externalId,
    uuid: server.uuid,
    identifier: server.uuidShort,
    name: server.name,
    description: server.description,
    status: server.status,
    suspended: server.status === 'suspended',
    limits: {
      memory: server.memory,
      swap: server.swap,
      disk: server.disk,
      io: server.io,
      cpu: server.cpu,
      threads: server.threads,
      oom_disabled: server.oomDisabled,
    },
    feature_limits: {
      databases: server.databaseLimit ?? 0,
      allocations: server.allocationLimit ?? 0,
      backups: server.backupLimit ?? 0,
      backup_storage: server.backupStorageLimit ?? 0,
    },
    user: server.ownerId,
    node: server.nodeId,
    allocation: server.allocationId,
    nest: server.nestId,
    egg: server.eggId,
    container: {
      startup_command: server.startup,
      image: server.image,
      installed_at: server.installedAt?.toISOString() ?? null,
    },
    created_at: server.createdAt.toISOString(),
    updated_at: server.updatedAt.toISOString(),
  }
}

export async function details(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const existing = await prisma.server.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('Server not found')

  const body = await c.req.json()
  const data: any = {}

  if (body.external_id !== undefined) data.externalId = body.external_id || null
  if (body.name !== undefined) data.name = body.name
  if (body.description !== undefined) data.description = body.description
  if (body.owner_id !== undefined) data.ownerId = body.owner_id

  const server = await prisma.server.update({ where: { id }, data })
  return c.json(fractalItem('server', transformServer(server)))
}

export async function build(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const existing = await prisma.server.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('Server not found')

  const body = await c.req.json()

  const addAllocations: number[] = Array.isArray(body.add_allocations) ? body.add_allocations : []
  const removeAllocations: number[] = Array.isArray(body.remove_allocations) ? body.remove_allocations : []

  // Process allocation changes and build updates inside a transaction —
  // mirrors BuildModificationService::processAllocations() + forceFill()
  const server = await prisma.$transaction(async (tx) => {
    // Add allocations: assign unoccupied allocations on the same node to this server
    if (addAllocations.length > 0) {
      await tx.allocation.updateMany({
        where: {
          id: { in: addAllocations },
          nodeId: existing.nodeId,
          serverId: null,
        },
        data: { serverId: existing.id, notes: null },
      })
    }

    // Remove allocations: unassign them from this server, but NEVER remove the
    // primary allocation unless a replacement is being added in the same request
    if (removeAllocations.length > 0) {
      // Determine the effective primary allocation after any potential swap
      let effectivePrimaryId: number = body.allocation_id ?? existing.allocationId

      for (const allocId of removeAllocations) {
        if (allocId === effectivePrimaryId) {
          // Attempting to remove the current default — only allowed when
          // add_allocations provides a replacement (use the first newly added one)
          const replacement = await tx.allocation.findFirst({
            where: {
              id: { in: addAllocations },
              nodeId: existing.nodeId,
            },
          })
          if (!replacement) {
            throw new Error(
              'You are attempting to delete the default allocation for this server but there is no fallback allocation to use.',
            )
          }
          effectivePrimaryId = replacement.id
          // Carry the new primary forward so the server update uses it
          body.allocation_id = effectivePrimaryId
        }
      }

      // Unassign: only remove allocations that aren't also being added
      const toRemove = removeAllocations.filter((a) => !addAllocations.includes(a))
      if (toRemove.length > 0) {
        await tx.allocation.updateMany({
          where: {
            id: { in: toRemove },
            nodeId: existing.nodeId,
            serverId: existing.id,
          },
          data: { serverId: null, notes: null },
        })
      }
    }

    // Apply build field updates
    const data: any = {}
    if (body.allocation_id !== undefined) data.allocationId = body.allocation_id
    if (body.memory !== undefined) data.memory = body.memory
    if (body.swap !== undefined) data.swap = body.swap
    if (body.disk !== undefined) data.disk = body.disk
    if (body.io !== undefined) data.io = body.io
    if (body.cpu !== undefined) data.cpu = body.cpu
    if (body.threads !== undefined) data.threads = body.threads
    if (body.oom_disabled !== undefined) data.oomDisabled = body.oom_disabled
    // Treat empty string as null for limit fields, matching BuildModificationService
    if (body.database_limit !== undefined) data.databaseLimit = body.database_limit === '' ? null : body.database_limit
    if (body.allocation_limit !== undefined) data.allocationLimit = body.allocation_limit === '' ? null : body.allocation_limit
    if (body.backup_limit !== undefined) data.backupLimit = body.backup_limit === '' ? null : body.backup_limit
    if (body.backup_storage_limit !== undefined) data.backupStorageLimit = body.backup_storage_limit === '' ? null : body.backup_storage_limit

    return tx.server.update({ where: { id }, data })
  })

  const withNode = await prisma.server.findUnique({
    where: { id },
    include: { node: true },
  })

  if (withNode?.node) {
    try {
      await daemonRequest(withNode.node, 'POST', `/api/servers/${withNode.uuid}/sync`)
    } catch (err) {
      if (!(err instanceof DaemonConnectionError)) throw err
    }
  }

  return c.json(fractalItem('server', transformServer(server)))
}
