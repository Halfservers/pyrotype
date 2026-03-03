import type { Context } from 'hono';
import type { Env, HonoVariables } from '../../types/env';

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>;

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

export async function index(c: AppContext) {
  const user = c.var.user!;
  const prisma = c.var.prisma;
  const page = Math.max(1, parseInt(c.req.query('page') ?? '', 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(c.req.query('per_page') ?? '', 10) || 25));

  const filterEvent = c.req.query('filter[event]');

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

  return c.json({
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
}
