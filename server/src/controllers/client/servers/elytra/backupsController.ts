import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../config/database';
import { NotFoundError, ForbiddenError, AppError } from '../../../../utils/errors';
import { fractalItem, fractalPaginated } from '../../../../utils/response';
import { verifyPassword } from '../../../../utils/crypto';

export async function listBackups(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const perPage = Math.min(50, Math.max(1, parseInt(req.query.per_page as string) || 20));
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const skip = (page - 1) * perPage;

    const [backups, total] = await Promise.all([
      prisma.backup.findMany({
        where: { serverId: server.id },
        orderBy: [{ isLocked: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: perPage,
      }),
      prisma.backup.count({ where: { serverId: server.id } }),
    ]);

    const successfulBackups = await prisma.backup.findMany({
      where: { serverId: server.id, isSuccessful: true },
      select: { bytes: true, disk: true },
    });

    // Elytra-specific adapters for storage calculation
    const elytraAdapters = ['rustic_local', 'rustic_s3'];
    const rusticSum = successfulBackups
      .filter(b => elytraAdapters.includes(b.disk))
      .reduce((sum, b) => sum + Number(b.bytes ?? 0), 0);
    const legacySum = successfulBackups
      .filter(b => !elytraAdapters.includes(b.disk))
      .reduce((sum, b) => sum + Number(b.bytes ?? 0), 0);

    const rusticSumMb = Math.round((rusticSum / 1024 / 1024) * 100) / 100;
    const legacyUsageMb = Math.round((legacySum / 1024 / 1024) * 100) / 100;
    // Repository usage would come from server.repository_backup_bytes
    const repositoryUsageMb = 0; // placeholder
    const overheadMb = Math.max(0, repositoryUsageMb - rusticSumMb);
    const totalUsedMb = legacyUsageMb + repositoryUsageMb;

    const result = fractalPaginated('backup', backups, total, page, perPage);
    res.json({
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
    });
  } catch (err) {
    next(err);
  }
}

export async function createBackup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const { name, ignored, adapter } = req.body;

    // In production, this submits a job to the ElytraJobService which
    // communicates with the Elytra daemon to create the backup.
    // TODO: Submit elytra job: backup_create
    // TODO: Activity log: backup:create

    res.json({
      job_id: `job_${Date.now()}`,
      status: 'queued',
      type: 'backup_create',
    });
  } catch (err) {
    next(err);
  }
}

export async function showBackup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const backup = await prisma.backup.findFirst({
      where: { uuid: String(req.params.backup), serverId: server.id },
    });

    if (!backup) {
      throw new NotFoundError('Backup not found.');
    }

    res.json(fractalItem('backup', backup));
  } catch (err) {
    next(err);
  }
}

export async function downloadBackup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const backup = await prisma.backup.findFirst({
      where: { uuid: String(req.params.backup), serverId: server.id },
    });

    if (!backup) {
      throw new NotFoundError('Backup not found.');
    }

    if (!backup.isSuccessful) {
      throw new AppError('Cannot download an incomplete backup.', 400, 'BadRequest');
    }

    // In production, generate a signed download URL
    // TODO: Activity log: backup:download
    res.json({
      object: 'signed_url',
      attributes: { url: '' },
    });
  } catch (err) {
    next(err);
  }
}

export async function restoreBackup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const backup = await prisma.backup.findFirst({
      where: { uuid: String(req.params.backup), serverId: server.id },
    });

    if (!backup) {
      throw new NotFoundError('Backup not found.');
    }

    const truncateDirectory = req.body.truncate_directory ?? false;

    // In production, submit elytra job: backup_restore
    // TODO: Activity log: backup:restore

    res.json({
      job_id: `job_${Date.now()}`,
      status: 'queued',
      type: 'backup_restore',
    });
  } catch (err) {
    next(err);
  }
}

export async function destroyBackup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const backup = await prisma.backup.findFirst({
      where: { uuid: String(req.params.backup), serverId: server.id },
    });

    if (!backup) {
      throw new NotFoundError('Backup not found.');
    }

    // In production, submit elytra job: backup_delete
    // TODO: Activity log: backup:delete

    res.json({
      job_id: `job_${Date.now()}`,
      status: 'queued',
      type: 'backup_delete',
    });
  } catch (err) {
    next(err);
  }
}

export async function renameBackup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.length > 191) {
      throw new AppError('A valid name must be provided (max 191 characters).', 422, 'ValidationError');
    }

    const backup = await prisma.backup.findFirst({
      where: { uuid: String(req.params.backup), serverId: server.id },
    });

    if (!backup) {
      throw new NotFoundError('Backup not found.');
    }

    const updated = await prisma.backup.update({
      where: { id: backup.id },
      data: { name },
    });

    // TODO: Activity log: backup:rename

    res.json(fractalItem('backup', updated));
  } catch (err) {
    next(err);
  }
}

export async function toggleLock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const backup = await prisma.backup.findFirst({
      where: { uuid: String(req.params.backup), serverId: server.id },
    });

    if (!backup) {
      throw new NotFoundError('Backup not found.');
    }

    const updated = await prisma.backup.update({
      where: { id: backup.id },
      data: { isLocked: !backup.isLocked },
    });

    // TODO: Activity log: backup:lock

    res.json(fractalItem('backup', updated));
  } catch (err) {
    next(err);
  }
}

export async function deleteAllBackups(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;

    const backupCount = await prisma.backup.count({ where: { serverId: server.id } });

    if (backupCount === 0) {
      res.status(400).json({ error: 'No backups to delete.' });
      return;
    }

    // In production, submit elytra job: backup_delete_all
    // TODO: Activity log: backup:delete_all

    res.json({
      job_id: `job_${Date.now()}`,
      status: 'queued',
      type: 'backup_delete_all',
    });
  } catch (err) {
    next(err);
  }
}

export async function bulkDeleteBackups(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const backupUuids = req.body.backup_uuids;

    if (!Array.isArray(backupUuids) || backupUuids.length === 0) {
      res.status(400).json({ error: 'No backups specified for deletion.' });
      return;
    }

    if (backupUuids.length > 50) {
      res.status(400).json({ error: 'Cannot delete more than 50 backups at once. Use Delete All for larger operations.' });
      return;
    }

    // Verify all backups belong to this server
    const backups = await prisma.backup.findMany({
      where: { uuid: { in: backupUuids }, serverId: server.id },
    });

    if (backups.length !== backupUuids.length) {
      res.status(404).json({ error: 'One or more backups not found or do not belong to this server.' });
      return;
    }

    // In production, submit individual delete jobs for each backup
    const jobIds: string[] = backups.map(() => `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

    // TODO: Activity log: backup:bulk_delete

    res.json({
      message: 'Bulk delete jobs submitted successfully',
      job_count: jobIds.length,
      backup_count: backupUuids.length,
    });
  } catch (err) {
    next(err);
  }
}
