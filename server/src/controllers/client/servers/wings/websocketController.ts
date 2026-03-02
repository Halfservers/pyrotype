import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../config/database';
import { NotFoundError, ForbiddenError } from '../../../../utils/errors';
import { getUserPermissions } from '../../../../services/permissions';
import { createDaemonToken } from '../../../../services/auth/daemonToken';

export async function index(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const serverId = req.params.server as string;

    const server: any = await prisma.server.findFirst({
      where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
      include: { node: true },
    });

    if (!server) throw new NotFoundError('Server not found');

    const permissions = await getUserPermissions(server, user);

    if (!permissions.includes('websocket.connect')) {
      throw new ForbiddenError('You do not have permission to connect to this server\'s websocket.');
    }

    const node = server.node!;
    const token = await createDaemonToken(node, user, {
      server_uuid: server.uuid,
      permissions,
    });

    const scheme = node.scheme === 'https' ? 'wss' : 'ws';
    const socket = `${scheme}://${node.fqdn}:${node.daemonListen}/api/servers/${server.uuid}/ws`;

    res.json({
      data: {
        token,
        socket,
      },
    });
  } catch (err) {
    next(err);
  }
}
