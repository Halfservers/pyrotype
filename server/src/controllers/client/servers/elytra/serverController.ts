import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../config/database';
import { fractalItem } from '../../../../utils/response';

export async function getServer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const user = req.user!;

    const isOwner = user.id === server.ownerId;

    res.json(fractalItem('server', {
      ...server,
      meta: {
        is_server_owner: isOwner,
        user_permissions: req.serverPermissions ?? [],
      },
    }));
  } catch (err) {
    next(err);
  }
}
