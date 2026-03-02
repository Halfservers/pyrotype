import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { fractalItem, fractalPaginated } from '../../utils/response';
import { paginationSchema, getPaginationOffset } from '../../utils/pagination';
import { NotFoundError } from '../../utils/errors';
import { generateUuid } from '../../utils/crypto';

function transformServer(server: any) {
  const attrs: any = {
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

  return attrs;
}

export async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pagination = paginationSchema.parse(req.query);
    const { skip, take } = getPaginationOffset(pagination);

    const filterName = req.query['filter[name]'] as string | undefined;
    const filterUuid = req.query['filter[uuid]'] as string | undefined;
    const filterExternalId = req.query['filter[external_id]'] as string | undefined;
    const filterImage = req.query['filter[image]'] as string | undefined;

    const where: any = {};
    if (filterName) where.name = { contains: filterName };
    if (filterUuid) where.uuid = { contains: filterUuid };
    if (filterExternalId) where.externalId = filterExternalId;
    if (filterImage) where.image = { contains: filterImage };

    const sort = req.query.sort as string | undefined;
    const orderBy: any = {};
    if (sort === 'id' || sort === '-id') {
      orderBy.id = sort.startsWith('-') ? 'desc' : 'asc';
    } else if (sort === 'uuid' || sort === '-uuid') {
      orderBy.uuid = sort.startsWith('-') ? 'desc' : 'asc';
    } else {
      orderBy.id = 'asc';
    }

    const [servers, total] = await Promise.all([
      prisma.server.findMany({ where, skip, take, orderBy }),
      prisma.server.count({ where }),
    ]);

    res.json(fractalPaginated('server', servers.map(transformServer), total, pagination.page, pagination.per_page));
  } catch (err) {
    next(err);
  }
}

export async function view(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    const server = await prisma.server.findUnique({ where: { id } });
    if (!server) throw new NotFoundError('Server not found');

    res.json(fractalItem('server', transformServer(server)));
  } catch (err) {
    next(err);
  }
}

export async function store(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body;

    const uuid = generateUuid();
    const uuidShort = uuid.slice(0, 8);

    const server = await prisma.server.create({
      data: {
        uuid,
        uuidShort,
        externalId: body.external_id || null,
        name: body.name,
        description: body.description || '',
        ownerId: body.owner_id,
        nodeId: body.node_id,
        allocationId: body.allocation_id,
        nestId: body.nest_id,
        eggId: body.egg_id,
        startup: body.startup,
        image: body.image,
        memory: body.memory ?? 0,
        swap: body.swap ?? 0,
        disk: body.disk ?? 0,
        io: body.io ?? 500,
        cpu: body.cpu ?? 0,
        threads: body.threads || null,
        oomDisabled: body.oom_disabled ?? true,
        databaseLimit: body.database_limit ?? null,
        allocationLimit: body.allocation_limit ?? null,
        backupLimit: body.backup_limit ?? null,
        backupStorageLimit: body.backup_storage_limit ?? null,
        skipScripts: body.skip_scripts ?? false,
      },
    });

    res.status(201).json(fractalItem('server', transformServer(server)));
  } catch (err) {
    next(err);
  }
}

export async function deleteServer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    const force = (req.params.force as string) === 'force';

    const server = await prisma.server.findUnique({ where: { id } });
    if (!server) throw new NotFoundError('Server not found');

    // TODO: call daemon to delete the server files if not force
    // For now just delete from database
    if (force) {
      await prisma.server.delete({ where: { id } });
    } else {
      await prisma.server.delete({ where: { id } });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
