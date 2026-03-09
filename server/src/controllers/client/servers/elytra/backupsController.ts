import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { NotFoundError, AppError } from '../../../../utils/errors'
import { fractalItem, fractalPaginated } from '../../../../utils/response'
import { daemonRequest, getDaemonBaseUrl } from '../../../../services/daemon/proxy'
import { generateDaemonJWT } from '../../../../services/daemon/jwt'
import { logActivity } from '../../../../services/activity'
import { generateUuid } from '../../../../utils/crypto'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function listBackups(c: AppContext) {
  const server = c.var.server!
  const prisma = c.var.prisma
  const perPage = Math.min(50, Math.max(1, parseInt(c.req.query('per_page') ?? '') || 20))
  const page = Math.max(1, parseInt(c.req.query('page') ?? '') || 1)
  const skip = (page - 1) * perPage

  const [backups, total] = await Promise.all([
    prisma.backup.findMany({
      where: { serverId: server.id },
      orderBy: [{ isLocked: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: perPage,
    }),
    prisma.backup.count({ where: { serverId: server.id } }),
  ])

  const successfulBackups = await prisma.backup.findMany({
    where: { serverId: server.id, isSuccessful: true },
    select: { bytes: true, disk: true },
  })

  const elytraAdapters = ['rustic_local', 'rustic_s3']
  const rusticSum = successfulBackups
    .filter(b => elytraAdapters.includes(b.disk))
    .reduce((sum, b) => sum + Number(b.bytes ?? 0), 0)
  const legacySum = successfulBackups
    .filter(b => !elytraAdapters.includes(b.disk))
    .reduce((sum, b) => sum + Number(b.bytes ?? 0), 0)

  const rusticSumMb = Math.round((rusticSum / 1024 / 1024) * 100) / 100
  const legacyUsageMb = Math.round((legacySum / 1024 / 1024) * 100) / 100
  const repositoryUsageMb = 0
  const overheadMb = Math.max(0, repositoryUsageMb - rusticSumMb)
  const totalUsedMb = legacyUsageMb + repositoryUsageMb

  const result = fractalPaginated('backup', backups, total, page, perPage)
  return c.json({
    ...result,
    meta: {
      ...result.meta,
      backup_count: total,
      storage: {
        used_mb: totalUsedMb,
        legacy_usage_mb: legacyUsageMb,
        repository_usage_mb: repositoryUsageMb,
        rustic_backup_sum_mb: rusticSumMb,
        overhead_mb: overheadMb,
        overhead_percent: rusticSumMb > 0 ? Math.round((overheadMb / rusticSumMb) * 1000) / 10 : 0,
        needs_pruning: overheadMb > rusticSumMb * 0.1,
        limit_mb: null,
        has_limit: false,
        usage_percentage: null,
        available_mb: null,
        is_over_limit: false,
      },
      limits: {
        count_limit: null,
        has_count_limit: false,
        storage_limit_mb: null,
        has_storage_limit: false,
      },
    },
  })
}

export async function createBackup(c: AppContext) {
  const server = c.var.server!
  const user = c.var.user!
  const prisma = c.var.prisma
  const { name, ignored, adapter } = await c.req.json()

  const backup = await prisma.backup.create({
    data: {
      serverId: server.id,
      uuid: generateUuid(),
      name: name ?? `Backup at ${new Date().toISOString()}`,
      ignoredFiles: ignored ?? '[]',
      disk: adapter ?? 'rustic_local',
      bytes: 0,
    },
  })

  const jobUuid = generateUuid()
  await prisma.elytraJob.create({
    data: {
      uuid: jobUuid,
      serverId: server.id,
      userId: user.id,
      jobType: 'backup_create',
      jobData: { backup_uuid: backup.uuid, ignored, adapter },
      status: 'pending',
    },
  })

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:backup.create',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { backup_uuid: backup.uuid, name: backup.name },
  })

  return c.json({
    job_id: jobUuid,
    status: 'queued',
    type: 'backup_create',
  })
}

export async function showBackup(c: AppContext) {
  const server = c.var.server!
  const prisma = c.var.prisma
  const backup = await prisma.backup.findFirst({
    where: { uuid: String(c.req.param('backup')), serverId: server.id },
  })

  if (!backup) {
    throw new NotFoundError('Backup not found.')
  }

  return c.json(fractalItem('backup', backup))
}

export async function downloadBackup(c: AppContext) {
  const server = c.var.server!
  const node = server.node!
  const user = c.var.user!
  const prisma = c.var.prisma
  const backup = await prisma.backup.findFirst({
    where: { uuid: String(c.req.param('backup')), serverId: server.id },
  })

  if (!backup) {
    throw new NotFoundError('Backup not found.')
  }

  if (!backup.isSuccessful) {
    throw new AppError('Cannot download an incomplete backup.', 400, 'BadRequest')
  }

  const token = await generateDaemonJWT(
    c.env.APP_KEY,
    { server_uuid: server.uuid, user_id: user.id, backup_uuid: backup.uuid },
    300,
  )

  const url = `${getDaemonBaseUrl(node)}/download/backup?token=${token}`

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:backup.download',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { backup_uuid: backup.uuid },
  })

  return c.json({
    object: 'signed_url',
    attributes: { url },
  })
}

export async function restoreBackup(c: AppContext) {
  const server = c.var.server!
  const node = server.node!
  const user = c.var.user!
  const prisma = c.var.prisma
  const backup = await prisma.backup.findFirst({
    where: { uuid: String(c.req.param('backup')), serverId: server.id },
  })

  if (!backup) {
    throw new NotFoundError('Backup not found.')
  }

  const body = await c.req.json()
  const truncateDirectory = body.truncate_directory ?? false

  await prisma.server.update({
    where: { id: server.id },
    data: { status: 'restoring_backup' },
  })

  await daemonRequest(
    node, 'POST',
    `/api/servers/${server.uuid}/backup/${backup.uuid}/restore`,
    { truncate_directory: truncateDirectory },
  )

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:backup.restore',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { backup_uuid: backup.uuid, truncate_directory: truncateDirectory },
  })

  return c.json({
    job_id: `job_${Date.now()}`,
    status: 'queued',
    type: 'backup_restore',
  })
}

export async function destroyBackup(c: AppContext) {
  const server = c.var.server!
  const node = server.node!
  const user = c.var.user!
  const prisma = c.var.prisma
  const backup = await prisma.backup.findFirst({
    where: { uuid: String(c.req.param('backup')), serverId: server.id },
  })

  if (!backup) {
    throw new NotFoundError('Backup not found.')
  }

  await daemonRequest(
    node, 'DELETE',
    `/api/servers/${server.uuid}/backup/${backup.uuid}`,
  )

  await prisma.backup.delete({ where: { id: backup.id } })

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:backup.delete',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { backup_uuid: backup.uuid },
  })

  return c.body(null, 204)
}

export async function renameBackup(c: AppContext) {
  const server = c.var.server!
  const user = c.var.user!
  const prisma = c.var.prisma
  const { name } = await c.req.json()

  if (!name || typeof name !== 'string' || name.length > 191) {
    throw new AppError('A valid name must be provided (max 191 characters).', 422, 'ValidationError')
  }

  const backup = await prisma.backup.findFirst({
    where: { uuid: String(c.req.param('backup')), serverId: server.id },
  })

  if (!backup) {
    throw new NotFoundError('Backup not found.')
  }

  const updated = await prisma.backup.update({
    where: { id: backup.id },
    data: { name },
  })

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:backup.rename',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { backup_uuid: backup.uuid, name },
  })

  return c.json(fractalItem('backup', updated))
}

export async function toggleLock(c: AppContext) {
  const server = c.var.server!
  const user = c.var.user!
  const prisma = c.var.prisma
  const backup = await prisma.backup.findFirst({
    where: { uuid: String(c.req.param('backup')), serverId: server.id },
  })

  if (!backup) {
    throw new NotFoundError('Backup not found.')
  }

  const updated = await prisma.backup.update({
    where: { id: backup.id },
    data: { isLocked: !backup.isLocked },
  })

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:backup.lock',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { backup_uuid: backup.uuid, locked: !backup.isLocked },
  })

  return c.json(fractalItem('backup', updated))
}

export async function deleteAllBackups(c: AppContext) {
  const server = c.var.server!
  const user = c.var.user!
  const prisma = c.var.prisma

  const backupCount = await prisma.backup.count({ where: { serverId: server.id } })

  if (backupCount === 0) {
    return c.json({ error: 'No backups to delete.' }, 400)
  }

  const jobUuid = generateUuid()
  await prisma.elytraJob.create({
    data: {
      uuid: jobUuid,
      serverId: server.id,
      userId: user.id,
      jobType: 'backup_delete_all',
      jobData: {},
      status: 'pending',
    },
  })

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:backup.delete_all',
    ip,
    userId: user.id,
    serverId: server.id,
  })

  return c.json({
    job_id: jobUuid,
    status: 'queued',
    type: 'backup_delete_all',
  })
}

export async function bulkDeleteBackups(c: AppContext) {
  const server = c.var.server!
  const user = c.var.user!
  const prisma = c.var.prisma
  const body = await c.req.json()
  const backupUuids = body.backup_uuids

  if (!Array.isArray(backupUuids) || backupUuids.length === 0) {
    return c.json({ error: 'No backups specified for deletion.' }, 400)
  }

  if (backupUuids.length > 50) {
    return c.json({ error: 'Cannot delete more than 50 backups at once. Use Delete All for larger operations.' }, 400)
  }

  const backups = await prisma.backup.findMany({
    where: { uuid: { in: backupUuids }, serverId: server.id },
  })

  if (backups.length !== backupUuids.length) {
    return c.json({ error: 'One or more backups not found or do not belong to this server.' }, 404)
  }

  const jobIds: string[] = []
  for (const backup of backups) {
    const jobUuid = generateUuid()
    await prisma.elytraJob.create({
      data: {
        uuid: jobUuid,
        serverId: server.id,
        userId: user.id,
        jobType: 'backup_delete',
        jobData: { backup_uuid: backup.uuid },
        status: 'pending',
      },
    })
    jobIds.push(jobUuid)
  }

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:backup.bulk_delete',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { backup_uuids: backupUuids },
  })

  return c.json({
    message: 'Bulk delete jobs submitted successfully',
    job_count: jobIds.length,
    backup_count: backupUuids.length,
  })
}
