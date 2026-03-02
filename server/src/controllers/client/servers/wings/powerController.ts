import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../../../config/database';
import { NotFoundError, AppError } from '../../../../utils/errors';
import { getWingsClient } from '../../../../services/wings/client';

const sendPowerSchema = z.object({
  signal: z.enum(['start', 'stop', 'restart', 'kill']),
});

export async function index(req: Request, res: Response, next: NextFunction) {
  try {
    const serverId = req.params.server as string;
    const { signal } = sendPowerSchema.parse(req.body);

    const server: any = await prisma.server.findFirst({
      where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
      include: { node: true },
    });

    if (!server) throw new NotFoundError('Server not found');

    const wings = getWingsClient(server.node!);
    await wings.sendPowerAction(server.uuid, signal);

    res.status(204).end();
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new AppError('Invalid power signal', 422, 'ValidationError'));
      return;
    }
    next(err);
  }
}
