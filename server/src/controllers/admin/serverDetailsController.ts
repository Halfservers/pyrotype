import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { fractalItem } from '../../utils/response';
import { NotFoundError } from '../../utils/errors';

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
  };
}

export async function details(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    const existing = await prisma.server.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Server not found');

    const body = req.body;
    const data: any = {};

    if (body.external_id !== undefined) data.externalId = body.external_id || null;
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.owner_id !== undefined) data.ownerId = body.owner_id;

    const server = await prisma.server.update({ where: { id }, data });
    res.json(fractalItem('server', transformServer(server)));
  } catch (err) {
    next(err);
  }
}

export async function build(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    const existing = await prisma.server.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Server not found');

    const body = req.body;
    const data: any = {};

    if (body.allocation_id !== undefined) data.allocationId = body.allocation_id;
    if (body.memory !== undefined) data.memory = body.memory;
    if (body.swap !== undefined) data.swap = body.swap;
    if (body.disk !== undefined) data.disk = body.disk;
    if (body.io !== undefined) data.io = body.io;
    if (body.cpu !== undefined) data.cpu = body.cpu;
    if (body.threads !== undefined) data.threads = body.threads;
    if (body.oom_disabled !== undefined) data.oomDisabled = body.oom_disabled;
    if (body.database_limit !== undefined) data.databaseLimit = body.database_limit;
    if (body.allocation_limit !== undefined) data.allocationLimit = body.allocation_limit;
    if (body.backup_limit !== undefined) data.backupLimit = body.backup_limit;
    if (body.backup_storage_limit !== undefined) data.backupStorageLimit = body.backup_storage_limit;

    const server = await prisma.server.update({ where: { id }, data });

    // TODO: notify daemon of build changes
    res.json(fractalItem('server', transformServer(server)));
  } catch (err) {
    next(err);
  }
}
