import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { fractalPaginated } from '../../utils/response';
import { paginationSchema, getPaginationOffset } from '../../utils/pagination';
import { SYSTEM_PERMISSIONS } from '../../constants/permissions';

function transformServer(server: any, userId: number) {
  const node = server.node;
  const egg = server.egg;
  const isOwner = server.ownerId === userId;

  return {
    server_owner: isOwner,
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
    const type = req.query.type as string | undefined;
    const filter = req.query['filter[*]'] as string | undefined;
    const pagination = paginationSchema.parse(req.query);
    const { skip, take } = getPaginationOffset(pagination);

    const include = {
      node: true,
      egg: true,
      allocations: true,
    };

    let where: any = {};

    if (type === 'admin' || type === 'admin-all') {
      if (!user.rootAdmin) {
        // Return empty set for non-admins requesting admin view
        res.json(fractalPaginated('server', [], 0, pagination.page, pagination.per_page));
        return;
      }
      if (type === 'admin') {
        // Servers not directly accessible (owned or subuser) by the admin
        const accessibleIds = await getAccessibleServerIds(user.id);
        where = { id: { notIn: accessibleIds } };
      }
      // admin-all: no filter, all servers
    } else if (type === 'owner') {
      where = { ownerId: user.id };
    } else {
      // Default: all servers accessible to user (owner + subuser)
      const accessibleIds = await getAccessibleServerIds(user.id);
      where = { id: { in: accessibleIds } };
    }

    if (filter) {
      where = {
        ...where,
        OR: [
          { name: { contains: filter } },
          { uuid: { contains: filter } },
          { uuidShort: { contains: filter } },
          { description: { contains: filter } },
          { externalId: { contains: filter } },
        ],
      };
    }

    const [servers, total] = await Promise.all([
      prisma.server.findMany({ where, include, skip, take, orderBy: { id: 'asc' } }),
      prisma.server.count({ where }),
    ]);

    const data = servers.map((s) => transformServer(s, user.id));
    res.json(fractalPaginated('server', data, total, pagination.page, pagination.per_page));
  } catch (err) {
    next(err);
  }
}

export async function permissions(_req: Request, res: Response) {
  res.json({
    object: 'system_permissions',
    attributes: {
      permissions: SYSTEM_PERMISSIONS,
    },
  });
}

async function getAccessibleServerIds(userId: number): Promise<number[]> {
  const [owned, subuser] = await Promise.all([
    prisma.server.findMany({ where: { ownerId: userId }, select: { id: true } }),
    prisma.subuser.findMany({ where: { userId }, select: { serverId: true } }),
  ]);

  const ids = new Set<number>();
  for (const s of owned) ids.add(s.id);
  for (const s of subuser) ids.add(s.serverId);
  return Array.from(ids);
}
