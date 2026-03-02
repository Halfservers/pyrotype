import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';

interface ActivityDatum {
  server: string;
  event: string;
  timestamp: string;
  ip?: string;
  user?: string;
  metadata?: Record<string, unknown>;
}

export async function processActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const node = req.node!;
    const data = req.body.data as ActivityDatum[];

    if (!Array.isArray(data)) {
      res.status(204).send();
      return;
    }

    // Collect unique server UUIDs and user UUIDs
    const serverUuids = [...new Set(data.map(d => d.server).filter(Boolean))];
    const userUuids = [...new Set(data.map(d => d.user).filter(Boolean))] as string[];

    // Batch-load servers belonging to this node
    const servers = await prisma.server.findMany({
      where: { uuid: { in: serverUuids }, nodeId: node.id },
    });
    const serverMap = new Map(servers.map(s => [s.uuid, s]));

    // Batch-load users
    const users = userUuids.length > 0
      ? await prisma.user.findMany({ where: { uuid: { in: userUuids } } })
      : [];
    const userMap = new Map(users.map(u => [u.uuid, u]));

    // Process each activity entry
    for (const datum of data) {
      if (!datum.event?.startsWith('server:')) continue;

      const server = serverMap.get(datum.server);
      if (!server) continue;

      let timestamp: Date;
      try {
        timestamp = new Date(datum.timestamp);
      } catch {
        timestamp = new Date();
      }

      const actorUser = datum.user ? userMap.get(datum.user) : undefined;

      const log = await prisma.activityLog.create({
        data: {
          event: datum.event,
          ip: datum.ip || '127.0.0.1',
          properties: JSON.stringify(datum.metadata ?? {}),
          timestamp,
          actorId: actorUser?.id ?? null,
          actorType: actorUser ? 'user' : null,
        },
      });

      await prisma.activityLogSubject.create({
        data: {
          activityLogId: log.id,
          subjectId: server.id,
          subjectType: 'server',
        },
      });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
