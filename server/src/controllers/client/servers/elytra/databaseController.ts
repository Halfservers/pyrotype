import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../config/database';
import { NotFoundError, AppError } from '../../../../utils/errors';
import { fractalItem, fractalList } from '../../../../utils/response';

export async function listDatabases(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;

    const databases = await prisma.database.findMany({
      where: { serverId: server.id },
    });

    res.json(fractalList('database', databases));
  } catch (err) {
    next(err);
  }
}

export async function createDatabase(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const { database: dbName, remote } = req.body;

    if (!dbName) {
      throw new AppError('A database name must be provided.', 422, 'ValidationError');
    }

    // In production, this would deploy the database through the DatabaseManagementService.
    // Placeholder: the actual creation logic requires database host selection.
    const database = await prisma.database.create({
      data: {
        serverId: server.id,
        databaseHostId: 1, // placeholder
        database: `s${server.id}_${dbName}`,
        username: `u${server.id}_${dbName.substring(0, 8)}`,
        remote: remote ?? '%',
        password: '', // would be generated and encrypted
      },
    });

    // TODO: Activity log: server:database.create

    res.json(fractalItem('database', database));
  } catch (err) {
    next(err);
  }
}

export async function rotatePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const { database: databaseId } = req.params;

    const database = await prisma.database.findFirst({
      where: { id: parseInt(String(databaseId)), serverId: server.id },
    });

    if (!database) {
      throw new NotFoundError('Database not found.');
    }

    // In production, this rotates the password through DatabasePasswordService.
    // TODO: Activity log: server:database.rotate-password

    res.json(fractalItem('database', database));
  } catch (err) {
    next(err);
  }
}

export async function deleteDatabase(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const { database: databaseId } = req.params;

    const database = await prisma.database.findFirst({
      where: { id: parseInt(String(databaseId)), serverId: server.id },
    });

    if (!database) {
      throw new NotFoundError('Database not found.');
    }

    // In production, this deletes through DatabaseManagementService.
    await prisma.database.delete({ where: { id: database.id } });

    // TODO: Activity log: server:database.delete

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
