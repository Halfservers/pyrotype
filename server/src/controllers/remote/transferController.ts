import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { NotFoundError, AppError } from '../../utils/errors';

export async function transferFailure(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const uuid = String(req.params.uuid);

    const server = await prisma.server.findFirst({
      where: { uuid },
      include: { transfers: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    if (!server) {
      throw new NotFoundError('Server not found.');
    }

    const transfer = server.transfers[0];
    if (!transfer) {
      throw new AppError('Server is not being transferred.', 409, 'Conflict');
    }

    // Mark the transfer as failed and release reserved allocations
    await prisma.$transaction(async (tx) => {
      await tx.serverTransfer.update({
        where: { id: transfer.id },
        data: { successful: false },
      });

      // Release new allocations that were reserved for the transfer
      const allocationsToRelease = [
        transfer.newAllocation,
        ...(transfer.newAdditionalAllocations as number[] ?? []),
      ];

      if (allocationsToRelease.length > 0) {
        await tx.allocation.updateMany({
          where: { id: { in: allocationsToRelease } },
          data: { serverId: null },
        });
      }
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function transferSuccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const uuid = String(req.params.uuid);

    const server = await prisma.server.findFirst({
      where: { uuid },
      include: { transfers: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    if (!server) {
      throw new NotFoundError('Server not found.');
    }

    const transfer = server.transfers[0];
    if (!transfer) {
      throw new AppError('Server is not being transferred.', 409, 'Conflict');
    }

    await prisma.$transaction(async (tx) => {
      // Release old allocations
      const oldAllocations = [
        transfer.oldAllocation,
        ...(transfer.oldAdditionalAllocations as number[] ?? []),
      ];

      if (oldAllocations.length > 0) {
        await tx.allocation.updateMany({
          where: { id: { in: oldAllocations } },
          data: { serverId: null },
        });
      }

      // Update server to use new allocation and node
      await tx.server.update({
        where: { id: server.id },
        data: {
          allocationId: transfer.newAllocation,
          nodeId: transfer.newNode,
        },
      });

      // Mark transfer as successful
      await tx.serverTransfer.update({
        where: { id: transfer.id },
        data: { successful: true },
      });
    });

    // In production, also delete the server from the old node's daemon.

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
