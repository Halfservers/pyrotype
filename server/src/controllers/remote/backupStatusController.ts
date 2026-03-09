import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { NotFoundError, ForbiddenError, AppError } from '../../utils/errors'
import { logActivity } from '../../services/activity'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function reportBackupComplete(c: AppContext) {
  const prisma = c.var.prisma
  const node = c.var.node!
  const backupUuid = c.req.param('backup')

  const backupModel: any = await prisma.backup.findFirst({
    where: { uuid: backupUuid },
    include: { server: true },
  })

  if (!backupModel) {
    throw new NotFoundError('Backup not found.')
  }

  // Verify the backup's server belongs to the requesting node
  if (backupModel.server.nodeId !== node.id) {
    throw new ForbiddenError('You do not have permission to access that backup.')
  }

  if (backupModel.isSuccessful) {
    throw new AppError('Cannot update the status of a backup that is already marked as completed.', 400, 'BadRequest')
  }

  const body = await c.req.json()
  const successful = body.successful ?? false

  await prisma.backup.update({
    where: { id: backupModel.id },
    data: {
      isSuccessful: successful,
      isLocked: successful ? backupModel.isLocked : false,
      checksum: successful
        ? `${body.checksum_type ?? 'sha256'}:${body.checksum ?? ''}`
        : null,
      bytes: successful ? (body.size ?? 0) : 0,
      completedAt: new Date(),
    },
  })

  await logActivity(prisma, {
    event: successful ? 'server:backup.complete' : 'server:backup.fail',
    ip: c.req.header('cf-connecting-ip') ?? '127.0.0.1',
    serverId: backupModel.server.id,
    properties: { backup_uuid: backupModel.uuid, name: backupModel.name },
  })

  return c.body(null, 204)
}

export async function reportBackupRestore(c: AppContext) {
  const prisma = c.var.prisma
  const backupUuid = c.req.param('backup')

  const backupModel: any = await prisma.backup.findFirst({
    where: { uuid: backupUuid },
    include: { server: true },
  })

  if (!backupModel) {
    throw new NotFoundError('Backup not found.')
  }

  // Reset server status regardless of success/failure
  await prisma.server.update({
    where: { id: backupModel.server.id },
    data: { status: null },
  })

  await logActivity(prisma, {
    event: 'server:backup.restore',
    ip: c.req.header('cf-connecting-ip') ?? '127.0.0.1',
    serverId: backupModel.server.id,
    properties: { backup_uuid: backupModel.uuid },
  })

  return c.body(null, 204)
}

export async function getBackupUploadUrl(c: AppContext) {
  const prisma = c.var.prisma
  const node = c.var.node!
  const backupUuid = c.req.param('backup')
  const size = parseInt(c.req.query('size') ?? '')

  if (!size) {
    throw new AppError('A non-empty "size" query parameter must be provided.', 400, 'BadRequest')
  }

  const backupModel: any = await prisma.backup.findFirst({
    where: { uuid: backupUuid },
    include: { server: true },
  })

  if (!backupModel) {
    throw new NotFoundError('Backup not found.')
  }

  if (backupModel.server.nodeId !== node.id) {
    throw new ForbiddenError('You do not have permission to access that backup.')
  }

  if (backupModel.completedAt) {
    throw new AppError('This backup is already in a completed state.', 409, 'Conflict')
  }

  // In production, generate presigned S3 URLs for multipart upload.
  return c.json({
    parts: [],
    part_size: 5 * 1024 * 1024 * 1024,
  })
}

export async function deleteBackupRemote(c: AppContext) {
  const prisma = c.var.prisma
  const node = c.var.node!
  const backupUuid = c.req.param('backup')

  const backupModel: any = await prisma.backup.findFirst({
    where: { uuid: backupUuid },
    include: { server: true },
  })

  if (!backupModel) {
    throw new NotFoundError('Backup not found.')
  }

  if (backupModel.server.nodeId !== node.id) {
    throw new ForbiddenError('You do not have permission to access that backup.')
  }

  if (backupModel.isLocked) {
    throw new AppError('Cannot delete a backup that is marked as locked.', 400, 'BadRequest')
  }

  await prisma.backup.delete({ where: { id: backupModel.id } })

  await logActivity(prisma, {
    event: 'server:backup.delete',
    ip: c.req.header('cf-connecting-ip') ?? '127.0.0.1',
    serverId: backupModel.server.id,
    properties: { backup_uuid: backupModel.uuid },
  })

  return c.body(null, 204)
}

export async function updateBackupSizes(c: AppContext) {
  const prisma = c.var.prisma
  const node = c.var.node!
  const uuid = c.req.param('uuid')

  const server = await prisma.server.findFirst({
    where: { uuid },
  })

  if (!server) {
    throw new NotFoundError('Server not found.')
  }

  if (server.nodeId !== node.id) {
    throw new ForbiddenError('You do not have permission to access that server.')
  }

  const body = await c.req.json()
  const backups = body.backups as Array<{ backup_uuid: string; new_size: number }>

  if (!Array.isArray(backups) || backups.length === 0) {
    throw new AppError('Backups array is required.', 400, 'BadRequest')
  }

  let updatedCount = 0
  const errors: Array<{ backup_uuid: string; error: string }> = []

  for (const entry of backups) {
    const backup = await prisma.backup.findFirst({
      where: { uuid: entry.backup_uuid, serverId: server.id },
    })

    if (!backup) {
      errors.push({ backup_uuid: entry.backup_uuid, error: 'Backup not found' })
      continue
    }

    if (!backup.isSuccessful) {
      errors.push({ backup_uuid: entry.backup_uuid, error: 'Cannot update size of unsuccessful backup' })
      continue
    }

    await prisma.backup.update({
      where: { id: backup.id },
      data: { bytes: entry.new_size },
    })

    updatedCount++
  }

  const statusCode = updatedCount > 0 ? 200 : 400
  return c.json({
    updated_count: updatedCount,
    total_requested: backups.length,
    ...(errors.length > 0 ? { errors } : {}),
  }, statusCode)
}
