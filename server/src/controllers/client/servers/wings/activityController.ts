import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../config/database';
import { fractalPaginated } from '../../../../utils/response';
import { paginationSchema, getPaginationOffset } from '../../../../utils/pagination';
import { NotFoundError } from '../../../../utils/errors';

export async function index(req: Request, res: Response, next: NextFunction) {
  try {
    const serverId = req.params.server as string;
    const pagination = paginationSchema.parse({
      ...req.query,
      per_page: req.query.per_page ?? '25',
    });
    const { skip, take } = getPaginationOffset(pagination);

    const server = await prisma.server.findFirst({
      where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
    });

    if (!server) throw new NotFoundError('Server not found');

    // Query activity logs that reference this server via the subjects pivot
    const where = {
      subjects: {
        some: {
          subjectType: 'Server',
          subjectId: server.id,
        },
      },
    };

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take,
      }),
      prisma.activityLog.count({ where }),
    ]);

    const data = logs.map((log) => ({
      batch: log.batch,
      event: log.event,
      is_api: log.apiKeyId !== null,
      ip: log.ip,
      description: log.description,
      properties: log.properties ?? {},
      has_additional_metadata: false,
      timestamp: log.timestamp.toISOString(),
    }));

    res.json(fractalPaginated('activity_log', data, total, pagination.page, pagination.per_page));
  } catch (err) {
    next(err);
  }
}
