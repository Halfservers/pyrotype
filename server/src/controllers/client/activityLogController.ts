import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';

function transformActivityLog(log: {
  id: bigint;
  batch: string | null;
  event: string;
  ip: string;
  description: string | null;
  properties: unknown;
  apiKeyId: number | null;
  timestamp: Date;
  actorType: string | null;
  actorId: bigint | null;
}) {
  return {
    object: 'activity_log',
    attributes: {
      id: log.id.toString(),
      batch: log.batch,
      event: log.event,
      is_api: log.apiKeyId !== null,
      ip: log.ip,
      description: log.description,
      properties: log.properties ?? {},
      has_additional_metadata: log.properties !== null && Object.keys(log.properties as object).length > 0,
      timestamp: log.timestamp.toISOString(),
    },
  };
}

export async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page as string, 10) || 25));

    const filterEvent = req.query['filter[event]'] as string | undefined;

    const where = {
      actorType: 'Pterodactyl\\Models\\User',
      actorId: BigInt(user.id),
      ...(filterEvent ? { event: { contains: filterEvent } } : {}),
    };

    const [total, logs] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: perPage,
        skip: (page - 1) * perPage,
      }),
    ]);

    const totalPages = Math.ceil(total / perPage);

    res.json({
      object: 'list',
      data: logs.map(transformActivityLog),
      meta: {
        pagination: {
          total,
          count: logs.length,
          per_page: perPage,
          current_page: page,
          total_pages: totalPages,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
