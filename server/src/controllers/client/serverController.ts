import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { fractalItem } from '../../utils/response';
import { NotFoundError } from '../../utils/errors';
import { getUserPermissions } from '../../services/permissions';

function transformServer(server: any, userId: number) {
  const node = server.node;
  const egg = server.egg;

  return {
    server_owner: server.ownerId === userId,
    identifier: server.uuidShort,
    internal_id: server.id,
    uuid: server.uuid,
    name: server.name,
    node: node?.name ?? '',
    is_node_under_maintenance: node?.maintenanceMode ?? false,
    sftp_details: {
      ip: node?.fqdn ?? '',
      port: node?.daemonSFTP ?? 2022,
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
    egg_features: egg?.features ?? [],
    egg: egg?.uuid ?? null,
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
    daemon_type: node?.daemonType ?? 'elytra',
    backup_disk: node?.backupDisk ?? 'wings',
    relationships: {
      allocations: {
        object: 'list',
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
}

export async function index(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const serverId = req.params.server as string;

    const server = await prisma.server.findFirst({
      where: {
        OR: [{ uuidShort: serverId }, { uuid: serverId }],
      },
      include: {
        node: true,
        egg: true,
        allocations: true,
      },
    });

    if (!server) {
      throw new NotFoundError('Server not found');
    }

    const daemonType = server.node?.daemonType ?? 'elytra';
    const userPermissions = await getUserPermissions(server, user);

    const attributes = transformServer(server, user.id);
    const item = fractalItem('server', attributes);

    res.json({
      ...item,
      meta: {
        daemonType,
        is_server_owner: user.id === server.ownerId,
        user_permissions: userPermissions,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function resources(req: Request, res: Response, next: NextFunction) {
  try {
    const serverId = req.params.server as string;

    const server = await prisma.server.findFirst({
      where: {
        OR: [{ uuidShort: serverId }, { uuid: serverId }],
      },
      include: { node: true },
    });

    if (!server) {
      throw new NotFoundError('Server not found');
    }

    const daemonType = server.node?.daemonType ?? 'elytra';

    // Proxy to appropriate daemon for resource stats
    // This will be filled in when the WingsClient/ElytraClient are implemented
    res.json(fractalItem('stats', {
      current_state: 'offline',
      is_suspended: server.status === 'suspended',
      resources: {
        memory_bytes: 0,
        cpu_absolute: 0,
        disk_bytes: 0,
        network_rx_bytes: 0,
        network_tx_bytes: 0,
        uptime: 0,
      },
      daemon_type: daemonType,
    }));
  } catch (err) {
    next(err);
  }
}
