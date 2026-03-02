import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../utils/errors';

export async function suspend(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    const server = await prisma.server.findUnique({ where: { id } });
    if (!server) throw new NotFoundError('Server not found');

    await prisma.server.update({
      where: { id },
      data: { status: 'suspended' },
    });

    // TODO: notify daemon to suspend the server

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function unsuspend(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    const server = await prisma.server.findUnique({ where: { id } });
    if (!server) throw new NotFoundError('Server not found');

    await prisma.server.update({
      where: { id },
      data: { status: null },
    });

    // TODO: notify daemon to unsuspend the server

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function reinstall(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    const server = await prisma.server.findUnique({
      where: { id },
      include: { node: true },
    });
    if (!server) throw new NotFoundError('Server not found');

    await prisma.server.update({
      where: { id },
      data: { status: 'installing', installedAt: null },
    });

    // TODO: call daemon reinstall endpoint

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
