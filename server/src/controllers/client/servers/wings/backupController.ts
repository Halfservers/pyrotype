import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { z } from 'zod'
import { fractalPaginated, fractalItem } from '../../../../utils/response'
import { NotFoundError, AppError, ServerStateConflictError } from '../../../../utils/errors'
import { paginationSchema, getPaginationOffset } from '../../../../utils/pagination'
import { getWingsClient } from '../../../../services/wings/client'
import { createDaemonToken } from '../../../../services/auth/daemonToken'
import { logActivity } from '../../../../services/activity'
import { deleteBackupFromDaemon, rotateOldestBackup } from '../../../../services/backups'
import { daemonRequest } from '../../../../services/daemon/proxy'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

const storeBackupSchema = z.object({
  name: z.string().min(1).max(191),
  ignored: z.string().optional().default(''),
  is_locked: z.boolean().optional().default(false),
})

function transformBackup(backup: any) {
  return {
    uuid: backup.uuid,
    is_successful: backup.isSuccessful,
    is_locked: backup.isLocked,
    is_automatic: backup.isAutomatic,
    name: backup.name,
    ignored_files: backup.ignoredFiles,
    checksum: backup.checksum,
    bytes: Number(backup.bytes),
    disk: backup.disk,
    snapshot_id: backup.snapshotId,
    created_at: backup.createdAt.toISOString(),
    completed_at: backup.completedAt?.toISOString() ?? null,
  }
}

export async function index(c: AppContext) {
  const serverId = c.req.param('server')
  const prisma = c.var.prisma
  const query = c.req.query()
  const pagination = paginationSchema.parse({
    ...query,
    per_page: query.per_page ?? '20',
  })
  const { skip, take } = getPaginationOffset(pagination)

  const server = await prisma.server.findFirst({
    where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
  })

  if (!server) throw new NotFoundError('Server not found')

  const where = { serverId: server.id, deletedAt: null }

  const [backups, total, successfulCount] = await Promise.all([
    prisma.backup.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.backup.count({ where }),
    prisma.backup.count({ where: { serverId: server.id, isSuccessful: true, deletedAt: null } }),
  ])

  const result = fractalPaginated('backup', backups.map(transformBackup), total, pagination.page, pagination.per_page)

  return c.json({
    ...result,
    meta: {
      ...result.meta,
      backup_count: successfulCount,
    },
  })
}

export async function store(c: AppContext) {
  const serverId = c.req.param('server')
  const prisma = c.var.prisma
  const user = c.var.user!
  const body = storeBackupSchema.parse(await c.req.json())

  const server = await prisma.server.findFirst({
    where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
  })

  if (!server) throw new NotFoundError('Server not found')

  const existingCount = await prisma.backup.count({
    where: { serverId: server.id, isSuccessful: true, deletedAt: null },
  })

  if (server.backupLimit !== null && existingCount >= server.backupLimit) {
    // Rotate oldest unlocked backup to make room
    const node = await prisma.node.findUnique({ where: { id: server.nodeId } })
    if (node) {
      await rotateOldestBackup(prisma, server.id, node, server.uuid)
    } else {
      throw new AppError('Backup limit reached', 400, 'TooManyBackups')
    }
  }

  const backup = await prisma.backup.create({
    data: {
      serverId: server.id,
      uuid: crypto.randomUUID(),
      name: body.name,
      ignoredFiles: body.ignored.split('\n').filter(Boolean),
      isLocked: body.is_locked,
      disk: 'wings',
      bytes: BigInt(0),
    },
  })

  // Instruct daemon to start the backup
  const node = await prisma.node.findUnique({ where: { id: server.nodeId } })
  if (node) {
    try {
      await daemonRequest(node, 'POST', `/api/servers/${server.uuid}/backup`, {
        adapter: 'wings',
        uuid: backup.uuid,
        ignored_files: backup.ignoredFiles ?? [],
      })
    } catch {
      // Daemon unreachable — backup record exists, daemon will pick it up later
    }
  }

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:backup.create',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { name: body.name },
  })

  return c.json(fractalItem('backup', transformBackup(backup)))
}

export async function view(c: AppContext) {
  const backupUuid = c.req.param('backup')
  const prisma = c.var.prisma
  const backup = await prisma.backup.findUnique({ where: { uuid: backupUuid } })

  if (!backup) throw new NotFoundError('Backup not found')

  return c.json(fractalItem('backup', transformBackup(backup)))
}

export async function toggleLock(c: AppContext) {
  const backupUuid = c.req.param('backup')
  const prisma = c.var.prisma
  const user = c.var.user!

  const backup = await prisma.backup.findUnique({ where: { uuid: backupUuid } })

  if (!backup) throw new NotFoundError('Backup not found')

  const updated = await prisma.backup.update({
    where: { uuid: backupUuid },
    data: { isLocked: !backup.isLocked },
  })

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:backup.lock',
    ip,
    userId: user.id,
    serverId: backup.serverId,
    properties: { locked: !backup.isLocked },
  })

  return c.json(fractalItem('backup', transformBackup(updated)))
}

export async function download(c: AppContext) {
  const backupUuid = c.req.param('backup')
  const serverId = c.req.param('server')
  const prisma = c.var.prisma
  const user = c.var.user!

  const server: any = await prisma.server.findFirst({
    where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
    include: { node: true },
  })

  if (!server) throw new NotFoundError('Server not found')

  const backup = await prisma.backup.findUnique({ where: { uuid: backupUuid } })

  if (!backup) throw new NotFoundError('Backup not found')

  const node = server.node!
  const token = await createDaemonToken(node, user, {
    server_uuid: server.uuid,
    backup_uuid: backup.uuid,
  })

  const url = `${node.scheme}://${node.fqdn}:${node.daemonListen}/download/backup?token=${token}`

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:backup.download',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { backup: backup.uuid },
  })

  return c.json({
    object: 'signed_url',
    attributes: { url },
  })
}

export async function restore(c: AppContext) {
  const serverId = c.req.param('server')
  const backupUuid = c.req.param('backup')
  const prisma = c.var.prisma
  const user = c.var.user!

  const body = await c.req.json().catch(() => ({}))
  const truncateDirectory = body?.truncate ?? false

  const server: any = await prisma.server.findFirst({
    where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
    include: { node: true },
  })

  if (!server) throw new NotFoundError('Server not found')

  if (server.status !== null) {
    throw new ServerStateConflictError('This server is not currently in a state that allows for a backup to be restored.')
  }

  const backup = await prisma.backup.findUnique({ where: { uuid: backupUuid } })
  if (!backup) throw new NotFoundError('Backup not found')

  if (!backup.isSuccessful && !backup.completedAt) {
    throw new AppError('This backup cannot be restored at this time.', 400, 'BackupNotReady')
  }

  await prisma.server.update({
    where: { id: server.id },
    data: { status: 'restoring_backup' },
  })

  const wings = getWingsClient(server.node!)
  await wings.restoreBackup(server.uuid, backup.uuid, backup.disk, truncateDirectory)

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:backup.restore',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { backup: backup.uuid },
  })

  return c.body(null, 204)
}

export async function deleteFn(c: AppContext) {
  const backupUuid = c.req.param('backup')
  const prisma = c.var.prisma
  const user = c.var.user!

  const backup = await prisma.backup.findUnique({
    where: { uuid: backupUuid },
    include: { server: { include: { node: true } } },
  })

  if (!backup) throw new NotFoundError('Backup not found')

  // Delete from daemon first
  const server = (backup as any).server
  if (server?.node) {
    await deleteBackupFromDaemon(server.node, server.uuid, backup.uuid)
  }

  // Soft delete
  await prisma.backup.update({
    where: { uuid: backupUuid },
    data: { deletedAt: new Date() },
  })

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:backup.delete',
    ip,
    userId: user.id,
    serverId: backup.serverId,
    properties: { backup: backup.uuid },
  })

  return c.body(null, 204)
}
