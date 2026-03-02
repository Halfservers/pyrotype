import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../../../../config/database';
import { fractalPaginated, fractalItem } from '../../../../utils/response';
import { NotFoundError, AppError, ServerStateConflictError } from '../../../../utils/errors';
import { paginationSchema, getPaginationOffset } from '../../../../utils/pagination';

const storeBackupSchema = z.object({
  name: z.string().min(1).max(191),
  ignored: z.string().optional().default(''),
  is_locked: z.boolean().optional().default(false),
});

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
  };
}

export async function index(req: Request, res: Response, next: NextFunction) {
  try {
    const serverId = String(req.params.server);
    const pagination = paginationSchema.parse({
      ...req.query,
      per_page: req.query.per_page ?? '20',
    });
    const { skip, take } = getPaginationOffset(pagination);

    const server = await prisma.server.findFirst({
      where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
    });

    if (!server) throw new NotFoundError('Server not found');

    const where = { serverId: server.id, deletedAt: null };

    const [backups, total, successfulCount] = await Promise.all([
      prisma.backup.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.backup.count({ where }),
      prisma.backup.count({ where: { serverId: server.id, isSuccessful: true, deletedAt: null } }),
    ]);

    const result = fractalPaginated('backup', backups.map(transformBackup), total, pagination.page, pagination.per_page);

    res.json({
      ...result,
      meta: {
        ...result.meta,
        backup_count: successfulCount,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function store(req: Request, res: Response, next: NextFunction) {
  try {
    const serverId = String(req.params.server);
    const body = storeBackupSchema.parse(req.body);

    const server = await prisma.server.findFirst({
      where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
    });

    if (!server) throw new NotFoundError('Server not found');

    const existingCount = await prisma.backup.count({
      where: { serverId: server.id, isSuccessful: true, deletedAt: null },
    });

    if (server.backupLimit !== null && existingCount >= server.backupLimit) {
      throw new AppError('Backup limit reached', 400, 'TooManyBackups');
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
    });

    res.json(fractalItem('backup', transformBackup(backup)));
  } catch (err) {
    next(err);
  }
}

export async function view(req: Request, res: Response, next: NextFunction) {
  try {
    const backupUuid = String(req.params.backup);
    const backup = await prisma.backup.findUnique({ where: { uuid: backupUuid } });

    if (!backup) throw new NotFoundError('Backup not found');

    res.json(fractalItem('backup', transformBackup(backup)));
  } catch (err) {
    next(err);
  }
}

export async function toggleLock(req: Request, res: Response, next: NextFunction) {
  try {
    const backupUuid = String(req.params.backup);
    const backup = await prisma.backup.findUnique({ where: { uuid: backupUuid } });

    if (!backup) throw new NotFoundError('Backup not found');

    const updated = await prisma.backup.update({
      where: { uuid: backupUuid },
      data: { isLocked: !backup.isLocked },
    });

    res.json(fractalItem('backup', transformBackup(updated)));
  } catch (err) {
    next(err);
  }
}

export async function download(req: Request, res: Response, next: NextFunction) {
  try {
    const backupUuid = String(req.params.backup);
    const backup = await prisma.backup.findUnique({ where: { uuid: backupUuid } });

    if (!backup) throw new NotFoundError('Backup not found');

    // TODO: Generate signed download URL from Wings/S3
    res.json({
      object: 'signed_url',
      attributes: { url: '' },
    });
  } catch (err) {
    next(err);
  }
}

export async function restore(req: Request, res: Response, next: NextFunction) {
  try {
    const serverId = String(req.params.server);
    const backupUuid = String(req.params.backup);

    const server = await prisma.server.findFirst({
      where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
    });

    if (!server) throw new NotFoundError('Server not found');

    if (server.status !== null) {
      throw new ServerStateConflictError('This server is not currently in a state that allows for a backup to be restored.');
    }

    const backup = await prisma.backup.findUnique({ where: { uuid: backupUuid } });
    if (!backup) throw new NotFoundError('Backup not found');

    if (!backup.isSuccessful && !backup.completedAt) {
      throw new AppError('This backup cannot be restored at this time.', 400, 'BackupNotReady');
    }

    await prisma.server.update({
      where: { id: server.id },
      data: { status: 'restoring_backup' },
    });

    // TODO: Dispatch restore to Wings daemon

    res.status(204).json([]);
  } catch (err) {
    next(err);
  }
}

export async function deleteFn(req: Request, res: Response, next: NextFunction) {
  try {
    const backupUuid = String(req.params.backup);
    const backup = await prisma.backup.findUnique({ where: { uuid: backupUuid } });

    if (!backup) throw new NotFoundError('Backup not found');

    // Soft delete
    await prisma.backup.update({
      where: { uuid: backupUuid },
      data: { deletedAt: new Date() },
    });

    res.status(204).json([]);
  } catch (err) {
    next(err);
  }
}
