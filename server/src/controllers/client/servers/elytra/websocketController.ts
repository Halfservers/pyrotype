import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ForbiddenError } from '../../../../utils/errors';
import { config } from '../../../../config';

export async function getWebsocket(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const user = req.user!;
    const permissions = req.serverPermissions ?? [];

    if (!user.rootAdmin && !permissions.includes('websocket.connect')) {
      throw new ForbiddenError('You do not have permission to connect to this server\'s websocket.');
    }

    // Generate a signed JWT-like token for daemon websocket auth
    const payload = {
      user_id: user.id,
      server_uuid: server.uuid,
      permissions,
      exp: Math.floor(Date.now() / 1000) + 600, // 10 minutes
    };

    const token = crypto
      .createHmac('sha256', config.JWT_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');

    // Build websocket URL from node connection address
    // Placeholder: actual node lookup would happen via prisma
    const socket = `wss://daemon.example.com/api/servers/${server.uuid}/ws`;

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
