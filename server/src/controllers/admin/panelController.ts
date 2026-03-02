import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';

export async function status(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [serverCount, userCount, nodeCount, nestCount] = await Promise.all([
      prisma.server.count(),
      prisma.user.count(),
      prisma.node.count(),
      prisma.nest.count(),
    ]);

    res.json({
      object: 'panel_status',
      attributes: {
        version: '1.0.0',
        servers: serverCount,
        users: userCount,
        nodes: nodeCount,
        nests: nestCount,
      },
    });
  } catch (err) {
    next(err);
  }
}
