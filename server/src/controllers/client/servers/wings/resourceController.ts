import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../config/database';
import { fractalItem } from '../../../../utils/response';
import { NotFoundError } from '../../../../utils/errors';

export async function index(req: Request, res: Response, next: NextFunction) {
  try {
    const serverId = req.params.server as string;

    const server = await prisma.server.findFirst({
      where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
    });

    if (!server) throw new NotFoundError('Server not found');

    // TODO: Proxy to Wings daemon for live resource stats.
    // For now return a placeholder response matching the expected Fractal format.
    res.json(fractalItem('stats', {
      current_state: 'offline',
      is_suspended: server.status === 'suspended',
      resources: {
        memory_bytes: 0,
        cpu_absolute: 0,
        disk_bytes: 0,
        network_rx_bytes: 0,
        network_tx_bytes: 0,
        uptime: 0,
      },
    }));
  } catch (err) {
    next(err);
  }
}
