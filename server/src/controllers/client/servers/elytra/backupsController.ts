import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { NotFoundError, AppError } from '../../../../utils/errors'
import { fractalItem, fractalPaginated } from '../../../../utils/response'

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

  // Elytra-specific adapters for storage calculation
  const elytraAdapters = ['rustic_local', 'rustic_s3']
  const rusticSum = successfulBackups
    .filter(b => elytraAdapters.includes(b.disk))
    .reduce((sum, b) => sum + Number(b.bytes ?? 0), 0)
  const legacySum = successfulBackups
    .filter(b => !elytraAdapters.includes(b.disk))
    .reduce((sum, b) => sum + Number(b.bytes ?? 0), 0)

  const rusticSumMb = Math.round((rusticSum / 1024 / 1024) * 100) / 100
  const legacyUsageMb = Math.round((legacySum / 1024 / 1024) * 100) / 100
  // Repository usage would come from server.repository_backup_bytes
  const repositoryUsageMb = 0 // placeholder
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
  const { name, ignored, adapter } = await c.req.json()

  // In production, this submits a job to the ElytraJobService which
  // communicates with the Elytra daemon to create the backup.
  // TODO: Submit elytra job: backup_create
  // TODO: Activity log: backup:create

  return c.json({
    job_id: `job_${Date.now()}`,
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

  // In production, generate a signed download URL
  // TODO: Activity log: backup:download
  return c.json({
    object: 'signed_url',
    attributes: { url: '' },
  })
}

export async function restoreBackup(c: AppContext) {
  const server = c.var.server!
  const prisma = c.var.prisma
  const backup = await prisma.backup.findFirst({
    where: { uuid: String(c.req.param('backup')), serverId: server.id },
  })

  if (!backup) {
    throw new NotFoundError('Backup not found.')
  }

  const body = await c.req.json()
  const truncateDirectory = body.truncate_directory ?? false

  // In production, submit elytra job: backup_restore
  // TODO: Activity log: backup:restore

  return c.json({
    job_id: `job_${Date.now()}`,
    status: 'queued',
    type: 'backup_restore',
  })
}

export async function destroyBackup(c: AppContext) {
  const server = c.var.server!
  const prisma = c.var.prisma
  const backup = await prisma.backup.findFirst({
    where: { uuid: String(c.req.param('backup')), serverId: server.id },
  })

  if (!backup) {
    throw new NotFoundError('Backup not found.')
  }

  // In production, submit elytra job: backup_delete
  // TODO: Activity log: backup:delete

  return c.json({
    job_id: `job_${Date.now()}`,
    status: 'queued',
    type: 'backup_delete',
  })
}

export async function renameBackup(c: AppContext) {
  const server = c.var.server!
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

  // TODO: Activity log: backup:rename

  return c.json(fractalItem('backup', updated))
}

export async function toggleLock(c: AppContext) {
  const server = c.var.server!
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

  // TODO: Activity log: backup:lock

  return c.json(fractalItem('backup', updated))
}

export async function deleteAllBackups(c: AppContext) {
  const server = c.var.server!
  const prisma = c.var.prisma

  const backupCount = await prisma.backup.count({ where: { serverId: server.id } })

  if (backupCount === 0) {
    return c.json({ error: 'No backups to delete.' }, 400)
  }

  // In production, submit elytra job: backup_delete_all
  // TODO: Activity log: backup:delete_all

  return c.json({
    job_id: `job_${Date.now()}`,
    status: 'queued',
    type: 'backup_delete_all',
  })
}

export async function bulkDeleteBackups(c: AppContext) {
  const server = c.var.server!
  const prisma = c.var.prisma
  const body = await c.req.json()
  const backupUuids = body.backup_uuids

  if (!Array.isArray(backupUuids) || backupUuids.length === 0) {
    return c.json({ error: 'No backups specified for deletion.' }, 400)
  }

  if (backupUuids.length > 50) {
    return c.json({ error: 'Cannot delete more than 50 backups at once. Use Delete All for larger operations.' }, 400)
  }

  // Verify all backups belong to this server
  const backups = await prisma.backup.findMany({
    where: { uuid: { in: backupUuids }, serverId: server.id },
  })

  if (backups.length !== backupUuids.length) {
    return c.json({ error: 'One or more backups not found or do not belong to this server.' }, 404)
  }

  // In production, submit individual delete jobs for each backup
  const jobIds: string[] = backups.map(() => `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)

  // TODO: Activity log: backup:bulk_delete

  return c.json({
    message: 'Bulk delete jobs submitted successfully',
    job_count: jobIds.length,
    backup_count: backupUuids.length,
  })
}
