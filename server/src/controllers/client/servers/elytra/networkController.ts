import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../config/database';
import { NotFoundError, AppError } from '../../../../utils/errors';
import { fractalItem, fractalList } from '../../../../utils/response';

export async function listAllocations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;

    const allocations = await prisma.allocation.findMany({
      where: { serverId: server.id },
    });

    res.json(fractalList('allocation', allocations));
  } catch (err) {
    next(err);
  }
}

export async function createAllocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;

    // In production, check if server allows allocations and limit
    // then use FindAssignableAllocationService to find a free allocation.
    // TODO: Activity log: server:allocation.create

    res.json(fractalItem('allocation', {}));
  } catch (err) {
    next(err);
  }
}

export async function updateAllocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const { allocation: allocationId } = req.params;
    const { notes } = req.body;

    const allocation = await prisma.allocation.findFirst({
      where: { id: parseInt(String(allocationId)), serverId: server.id },
    });

    if (!allocation) {
      throw new NotFoundError('Allocation not found.');
    }

    const updated = await prisma.allocation.update({
      where: { id: allocation.id },
      data: { notes: notes ?? null },
    });

    // TODO: Activity log: server:allocation.notes

    res.json(fractalItem('allocation', updated));
  } catch (err) {
    next(err);
  }
}

export async function setPrimaryAllocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const { allocation: allocationId } = req.params;

    const allocation = await prisma.allocation.findFirst({
      where: { id: parseInt(String(allocationId)), serverId: server.id },
    });

    if (!allocation) {
      throw new NotFoundError('Allocation not found.');
    }

    await prisma.server.update({
      where: { id: server.id },
      data: { allocationId: allocation.id },
    });

    // TODO: Activity log: server:allocation.primary

    res.json(fractalItem('allocation', allocation));
  } catch (err) {
    next(err);
  }
}

export async function deleteAllocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const { allocation: allocationId } = req.params;

    const allocation = await prisma.allocation.findFirst({
      where: { id: parseInt(String(allocationId)), serverId: server.id },
    });

    if (!allocation) {
      throw new NotFoundError('Allocation not found.');
    }

    if (allocation.id === server.allocationId) {
      throw new AppError('You cannot delete the primary allocation for this server.', 400, 'BadRequest');
    }

    await prisma.allocation.update({
      where: { id: allocation.id },
      data: { notes: null, serverId: null },
    });

    // TODO: Activity log: server:allocation.delete

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
