import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { NotFoundError, ForbiddenError, AppError } from '../../utils/errors';

export async function reportBackupComplete(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const node = req.node!;
    const backupUuid = String(req.params.backup);

    const backupModel: any = await prisma.backup.findFirst({
      where: { uuid: backupUuid },
      include: { server: true },
    });

    if (!backupModel) {
      throw new NotFoundError('Backup not found.');
    }

    // Verify the backup's server belongs to the requesting node
    if (backupModel.server.nodeId !== node.id) {
      throw new ForbiddenError('You do not have permission to access that backup.');
    }

    if (backupModel.isSuccessful) {
      throw new AppError('Cannot update the status of a backup that is already marked as completed.', 400, 'BadRequest');
    }

    const successful = req.body.successful ?? false;

    await prisma.backup.update({
      where: { id: backupModel.id },
      data: {
        isSuccessful: successful,
        isLocked: successful ? backupModel.isLocked : false,
        checksum: successful
          ? `${req.body.checksum_type ?? 'sha256'}:${req.body.checksum ?? ''}`
          : null,
        bytes: successful ? (req.body.size ?? 0) : 0,
        completedAt: new Date(),
      },
    });

    // TODO: Activity log: server:backup.complete or server:backup.fail

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function reportBackupRestore(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const backupUuid = String(req.params.backup);

    const backupModel: any = await prisma.backup.findFirst({
      where: { uuid: backupUuid },
      include: { server: true },
    });

    if (!backupModel) {
      throw new NotFoundError('Backup not found.');
    }

    // Reset server status regardless of success/failure
    await prisma.server.update({
      where: { id: backupModel.server.id },
      data: { status: null },
    });

    // TODO: Activity log: server:backup.restore-complete or server:backup.restore-failed

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getBackupUploadUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const node = req.node!;
    const backupUuid = String(req.params.backup);
    const size = parseInt(req.query.size as string);

    if (!size) {
      throw new AppError('A non-empty "size" query parameter must be provided.', 400, 'BadRequest');
    }

    const backupModel: any = await prisma.backup.findFirst({
      where: { uuid: backupUuid },
      include: { server: true },
    });

    if (!backupModel) {
      throw new NotFoundError('Backup not found.');
    }

    if (backupModel.server.nodeId !== node.id) {
      throw new ForbiddenError('You do not have permission to access that backup.');
    }

    if (backupModel.completedAt) {
      throw new AppError('This backup is already in a completed state.', 409, 'Conflict');
    }

    // In production, generate presigned S3 URLs for multipart upload.
    // This requires the S3 backup adapter to be configured.
    res.json({
      parts: [],
      part_size: 5 * 1024 * 1024 * 1024,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteBackupRemote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const node = req.node!;
    const backupUuid = String(req.params.backup);

    const backupModel: any = await prisma.backup.findFirst({
      where: { uuid: backupUuid },
      include: { server: true },
    });

    if (!backupModel) {
      throw new NotFoundError('Backup not found.');
    }

    if (backupModel.server.nodeId !== node.id) {
      throw new ForbiddenError('You do not have permission to access that backup.');
    }

    if (backupModel.isLocked) {
      throw new AppError('Cannot delete a backup that is marked as locked.', 400, 'BadRequest');
    }

    await prisma.backup.delete({ where: { id: backupModel.id } });

    // TODO: Activity log: server:backup.delete

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function updateBackupSizes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const node = req.node!;
    const uuid = String(req.params.uuid);

    const server = await prisma.server.findFirst({
      where: { uuid },
    });

    if (!server) {
      throw new NotFoundError('Server not found.');
    }

    if (server.nodeId !== node.id) {
      throw new ForbiddenError('You do not have permission to access that server.');
    }

    const backups = req.body.backups as Array<{ backup_uuid: string; new_size: number }>;

    if (!Array.isArray(backups) || backups.length === 0) {
      throw new AppError('Backups array is required.', 400, 'BadRequest');
    }

    let updatedCount = 0;
    const errors: Array<{ backup_uuid: string; error: string }> = [];

    for (const entry of backups) {
      const backup = await prisma.backup.findFirst({
        where: { uuid: entry.backup_uuid, serverId: server.id },
      });

      if (!backup) {
        errors.push({ backup_uuid: entry.backup_uuid, error: 'Backup not found' });
        continue;
      }

      if (!backup.isSuccessful) {
        errors.push({ backup_uuid: entry.backup_uuid, error: 'Cannot update size of unsuccessful backup' });
        continue;
      }

      await prisma.backup.update({
        where: { id: backup.id },
        data: { bytes: entry.new_size },
      });

      updatedCount++;
    }

    const statusCode = updatedCount > 0 ? 200 : 400;
    res.status(statusCode).json({
      updated_count: updatedCount,
      total_requested: backups.length,
      ...(errors.length > 0 ? { errors } : {}),
    });
  } catch (err) {
    next(err);
  }
}
