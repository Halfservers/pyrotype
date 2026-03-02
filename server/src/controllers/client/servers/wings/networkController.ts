import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../config/database';
import { fractalList, fractalItem } from '../../../../utils/response';
import { NotFoundError, AppError } from '../../../../utils/errors';

function transformAllocation(alloc: any, primaryId: number) {
  return {
    id: alloc.id,
    ip: alloc.ip,
    ip_alias: alloc.ipAlias,
    port: alloc.port,
    notes: alloc.notes,
    is_default: alloc.id === primaryId,
  };
}

async function resolveServer(serverId: string): Promise<any> {
  const server = await prisma.server.findFirst({
    where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
    include: { allocations: true },
  });
  if (!server) throw new NotFoundError('Server not found');
  return server;
}

export async function index(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(req.params.server as string);
    const data = server.allocations.map((a: any) => transformAllocation(a, server.allocationId));
    res.json(fractalList('allocation', data));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(req.params.server as string);
    const allocationId = parseInt(req.params.allocation as string, 10);

    const alloc = server.allocations.find((a: any) => a.id === allocationId);
    if (!alloc) throw new NotFoundError('Allocation not found');

    const notes = req.body.notes ?? null;
    const updated = await prisma.allocation.update({
      where: { id: allocationId },
      data: { notes },
    });

    res.json(fractalItem('allocation', transformAllocation(updated, server.allocationId)));
  } catch (err) {
    next(err);
  }
}

export async function setPrimary(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(req.params.server as string);
    const allocationId = parseInt(req.params.allocation as string, 10);

    const alloc = server.allocations.find((a: any) => a.id === allocationId);
    if (!alloc) throw new NotFoundError('Allocation not found');

    await prisma.server.update({
      where: { id: server.id },
      data: { allocationId },
    });

    res.json(fractalItem('allocation', transformAllocation(alloc, allocationId)));
  } catch (err) {
    next(err);
  }
}

export async function store(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(req.params.server as string);

    if (server.allocationLimit !== null && server.allocations.length >= server.allocationLimit) {
      throw new AppError('Cannot assign additional allocations to this server: limit has been reached.', 400, 'AllocationLimitReached');
    }

    // Find an unassigned allocation on the same node
    const available = await prisma.allocation.findFirst({
      where: { nodeId: server.nodeId, serverId: null },
    });

    if (!available) {
      throw new AppError('No allocations available on this node.', 400, 'NoAllocationsAvailable');
    }

    const assigned = await prisma.allocation.update({
      where: { id: available.id },
      data: { serverId: server.id },
    });

    res.json(fractalItem('allocation', transformAllocation(assigned, server.allocationId)));
  } catch (err) {
    next(err);
  }
}

export async function deleteFn(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(req.params.server as string);
    const allocationId = parseInt(req.params.allocation as string, 10);

    if (server.allocationLimit === 0 || server.allocationLimit === null) {
      throw new AppError('You cannot delete allocations for this server: no allocation limit is set.', 400, 'AllocationDeletionBlocked');
    }

    if (allocationId === server.allocationId) {
      throw new AppError('You cannot delete the primary allocation for this server.', 400, 'PrimaryAllocationDeletion');
    }

    await prisma.allocation.update({
      where: { id: allocationId },
      data: { notes: null, serverId: null },
    });

    res.status(204).json([]);
  } catch (err) {
    next(err);
  }
}
