import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../config/database';
import { fractalItem } from '../../../../utils/response';
import { NotFoundError } from '../../../../utils/errors';
import { getUserPermissions } from '../../../../services/permissions';

export async function index(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const serverId = req.params.server as string;

    const server: any = await prisma.server.findFirst({
      where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
      include: { node: true, egg: true, allocations: true },
    });

    if (!server) throw new NotFoundError('Server not found');

    const userPermissions = await getUserPermissions(server, user);

    const attributes = {
      server_owner: user.id === server.ownerId,
      identifier: server.uuidShort,
      internal_id: server.id,
      uuid: server.uuid,
      name: server.name,
      node: server.node?.name ?? '',
      is_node_under_maintenance: server.node?.maintenanceMode ?? false,
      sftp_details: {
        ip: server.node?.fqdn ?? '',
        port: server.node?.daemonSFTP ?? 2022,
      },
      description: server.description ?? '',
      limits: {
        memory: server.memory,
        overhead_memory: server.overheadMemory,
        swap: server.swap,
        disk: server.disk,
        io: server.io,
        cpu: server.cpu,
        threads: server.threads,
        oom_disabled: server.oomDisabled,
      },
      invocation: server.startup,
      docker_image: server.image,
      egg_features: server.egg?.features ?? [],
      egg: server.egg?.uuid ?? null,
      feature_limits: {
        databases: server.databaseLimit ?? 0,
        allocations: server.allocationLimit ?? 0,
        backups: server.backupLimit ?? 0,
        backupStorageMb: server.backupStorageLimit ?? 0,
      },
      status: server.status,
      is_suspended: server.status === 'suspended',
      is_installing: server.installedAt === null,
      is_transferring: false,
      daemon_type: server.node?.daemonType ?? 'wings',
      relationships: {
        allocations: {
          object: 'list' as const,
          data: (server.allocations ?? []).map((a: any) => ({
            object: 'allocation',
            attributes: {
              id: a.id,
              ip: a.ip,
              ip_alias: a.ipAlias,
              port: a.port,
              notes: a.notes,
              is_default: a.id === server.allocationId,
            },
          })),
        },
      },
    };

    res.json({
      ...fractalItem('server', attributes),
      meta: {
        is_server_owner: user.id === server.ownerId,
        user_permissions: userPermissions,
      },
    });
  } catch (err) {
    next(err);
  }
}
