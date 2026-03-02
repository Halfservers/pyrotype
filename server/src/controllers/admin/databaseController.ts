import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { fractalItem, fractalPaginated } from '../../utils/response';
import { NotFoundError, ValidationError } from '../../utils/errors';

function transformDatabase(db: any) {
  return {
    id: db.id,
    server: db.serverId,
    host: db.databaseHostId,
    database: db.database,
    username: db.username,
    remote: db.remote,
    max_connections: db.maxConnections,
    created_at: db.createdAt.toISOString(),
    updated_at: db.updatedAt.toISOString(),
  };
}

export async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const serverId = parseInt(req.params.id as string, 10);
    const server = await prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundError('Server not found');

    const databases = await prisma.database.findMany({
      where: { serverId },
      orderBy: { id: 'asc' },
    });

    res.json(fractalPaginated(
      'server_database',
      databases.map(transformDatabase),
      databases.length,
      1,
      databases.length || 50,
    ));
  } catch (err) {
    next(err);
  }
}

export async function view(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const serverId = parseInt(req.params.id as string, 10);
    const dbId = parseInt(req.params.dbId as string, 10);

    const database = await prisma.database.findFirst({
      where: { id: dbId, serverId },
    });
    if (!database) throw new NotFoundError('Database not found');

    res.json(fractalItem('server_database', transformDatabase(database)));
  } catch (err) {
    next(err);
  }
}

export async function store(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const serverId = parseInt(req.params.id as string, 10);
    const server = await prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundError('Server not found');

    // Check database limit
    if (server.databaseLimit !== null) {
      const currentCount = await prisma.database.count({ where: { serverId } });
      if (currentCount >= server.databaseLimit) {
        throw new ValidationError('Server has reached its database limit');
      }
    }

    const { database, remote, host } = req.body;

    if (!host) {
      throw new ValidationError('A database host must be specified');
    }

    const dbHost = await prisma.databaseHost.findUnique({ where: { id: host } });
    if (!dbHost) throw new NotFoundError('Database host not found');

    const dbName = `s${serverId}_${database}`;
    const username = `u${serverId}_${crypto.randomBytes(4).toString('hex')}`;
    const password = crypto.randomBytes(16).toString('hex');

    const created = await prisma.database.create({
      data: {
        serverId,
        databaseHostId: host,
        database: dbName,
        username,
        remote: remote ?? '%',
        password,
        maxConnections: 0,
      },
    });

    // TODO: create the actual database on the host

    res.status(201).json({
      ...fractalItem('server_database', transformDatabase(created)),
      meta: {
        resource: `/api/application/servers/${serverId}/databases/${created.id}`,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const serverId = parseInt(req.params.id as string, 10);
    const dbId = parseInt(req.params.dbId as string, 10);

    const database = await prisma.database.findFirst({
      where: { id: dbId, serverId },
    });
    if (!database) throw new NotFoundError('Database not found');

    const newPassword = crypto.randomBytes(16).toString('hex');

    await prisma.database.update({
      where: { id: dbId },
      data: { password: newPassword },
    });

    // TODO: update password on the actual database host

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function deleteDatabase(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const serverId = parseInt(req.params.id as string, 10);
    const dbId = parseInt(req.params.dbId as string, 10);

    const database = await prisma.database.findFirst({
      where: { id: dbId, serverId },
    });
    if (!database) throw new NotFoundError('Database not found');

    // TODO: drop the actual database on the host

    await prisma.database.delete({ where: { id: dbId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
