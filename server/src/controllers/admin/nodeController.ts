import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { fractalItem, fractalPaginated } from '../../utils/response';
import { paginationSchema, getPaginationOffset } from '../../utils/pagination';
import { NotFoundError, ConflictError } from '../../utils/errors';
import { generateUuid } from '../../utils/crypto';

function transformNode(node: any) {
  return {
    id: node.id,
    uuid: node.uuid,
    public: node.public,
    name: node.name,
    description: node.description,
    location_id: node.locationId,
    fqdn: node.fqdn,
    internal_fqdn: node.internalFqdn,
    use_separate_fqdns: node.useSeparateFqdns,
    scheme: node.scheme,
    behind_proxy: node.behindProxy,
    maintenance_mode: node.maintenanceMode,
    memory: node.memory,
    memory_overallocate: node.memoryOverallocate,
    disk: node.disk,
    disk_overallocate: node.diskOverallocate,
    upload_size: node.uploadSize,
    daemon_listen: node.daemonListen,
    daemon_sftp: node.daemonSFTP,
    daemon_base: node.daemonBase,
    daemon_type: node.daemonType,
    backup_disk: node.backupDisk,
    created_at: node.createdAt.toISOString(),
    updated_at: node.updatedAt.toISOString(),
  };
}

export async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pagination = paginationSchema.parse(req.query);
    const { skip, take } = getPaginationOffset(pagination);

    const filterName = req.query['filter[name]'] as string | undefined;
    const filterFqdn = req.query['filter[fqdn]'] as string | undefined;
    const filterUuid = req.query['filter[uuid]'] as string | undefined;

    const where: any = {};
    if (filterName) where.name = { contains: filterName };
    if (filterFqdn) where.fqdn = { contains: filterFqdn };
    if (filterUuid) where.uuid = { contains: filterUuid };

    const sort = req.query.sort as string | undefined;
    const orderBy: any = {};
    if (sort === 'memory' || sort === '-memory') {
      orderBy.memory = sort.startsWith('-') ? 'desc' : 'asc';
    } else if (sort === 'disk' || sort === '-disk') {
      orderBy.disk = sort.startsWith('-') ? 'desc' : 'asc';
    } else {
      orderBy.id = 'asc';
    }

    const [nodes, total] = await Promise.all([
      prisma.node.findMany({ where, skip, take, orderBy }),
      prisma.node.count({ where }),
    ]);

    res.json(fractalPaginated('node', nodes.map(transformNode), total, pagination.page, pagination.per_page));
  } catch (err) {
    next(err);
  }
}

export async function view(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    const node = await prisma.node.findUnique({ where: { id } });
    if (!node) throw new NotFoundError('Node not found');

    res.json(fractalItem('node', transformNode(node)));
  } catch (err) {
    next(err);
  }
}

export async function store(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body;

    const node = await prisma.node.create({
      data: {
        uuid: generateUuid(),
        name: body.name,
        description: body.description || null,
        locationId: body.location_id,
        fqdn: body.fqdn,
        internalFqdn: body.internal_fqdn || null,
        useSeparateFqdns: body.use_separate_fqdns ?? false,
        scheme: body.scheme ?? 'https',
        behindProxy: body.behind_proxy ?? false,
        public: body.public ?? true,
        trustAlias: body.trust_alias ?? false,
        memory: body.memory,
        memoryOverallocate: body.memory_overallocate ?? 0,
        disk: body.disk,
        diskOverallocate: body.disk_overallocate ?? 0,
        daemonBase: body.daemon_base ?? '/var/lib/pterodactyl/volumes',
        daemonSFTP: body.daemon_sftp ?? 2022,
        daemonListen: body.daemon_listen ?? 8080,
        uploadSize: body.upload_size ?? 100,
        maintenanceMode: body.maintenance_mode ?? false,
        daemonType: body.daemon_type ?? 'elytra',
        backupDisk: body.backup_disk ?? 'local',
        daemonTokenId: crypto.randomBytes(8).toString('hex'),
        daemonToken: crypto.randomBytes(32).toString('hex'),
      },
    });

    res.status(201).json({
      ...fractalItem('node', transformNode(node)),
      meta: {
        resource: `/api/application/nodes/${node.id}`,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    const existing = await prisma.node.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Node not found');

    const body = req.body;
    const data: any = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.location_id !== undefined) data.locationId = body.location_id;
    if (body.fqdn !== undefined) data.fqdn = body.fqdn;
    if (body.internal_fqdn !== undefined) data.internalFqdn = body.internal_fqdn;
    if (body.use_separate_fqdns !== undefined) data.useSeparateFqdns = body.use_separate_fqdns;
    if (body.scheme !== undefined) data.scheme = body.scheme;
    if (body.behind_proxy !== undefined) data.behindProxy = body.behind_proxy;
    if (body.public !== undefined) data.public = body.public;
    if (body.trust_alias !== undefined) data.trustAlias = body.trust_alias;
    if (body.memory !== undefined) data.memory = body.memory;
    if (body.memory_overallocate !== undefined) data.memoryOverallocate = body.memory_overallocate;
    if (body.disk !== undefined) data.disk = body.disk;
    if (body.disk_overallocate !== undefined) data.diskOverallocate = body.disk_overallocate;
    if (body.daemon_base !== undefined) data.daemonBase = body.daemon_base;
    if (body.daemon_sftp !== undefined) data.daemonSFTP = body.daemon_sftp;
    if (body.daemon_listen !== undefined) data.daemonListen = body.daemon_listen;
    if (body.upload_size !== undefined) data.uploadSize = body.upload_size;
    if (body.maintenance_mode !== undefined) data.maintenanceMode = body.maintenance_mode;
    if (body.daemon_type !== undefined) data.daemonType = body.daemon_type;
    if (body.backup_disk !== undefined) data.backupDisk = body.backup_disk;

    if (body.reset_secret === true) {
      data.daemonTokenId = crypto.randomBytes(8).toString('hex');
      data.daemonToken = crypto.randomBytes(32).toString('hex');
    }

    const node = await prisma.node.update({ where: { id }, data });
    res.json(fractalItem('node', transformNode(node)));
  } catch (err) {
    next(err);
  }
}

export async function deleteNode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    const node = await prisma.node.findUnique({
      where: { id },
      include: { servers: { select: { id: true } } },
    });
    if (!node) throw new NotFoundError('Node not found');

    if (node.servers.length > 0) {
      throw new ConflictError('Cannot delete a node that has active servers attached.');
    }

    await prisma.node.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
