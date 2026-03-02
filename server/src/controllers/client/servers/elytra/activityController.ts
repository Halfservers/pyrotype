import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../config/database';
import { ForbiddenError } from '../../../../utils/errors';
import { fractalPaginated } from '../../../../utils/response';

export async function getActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const user = req.user!;
    const permissions = req.serverPermissions ?? [];

    if (!user.rootAdmin && !permissions.includes('activity.read')) {
      throw new ForbiddenError('Missing permission: activity.read');
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page as string) || 25));
    const skip = (page - 1) * perPage;

    const eventFilter = req.query['filter[event]'] as string | undefined;

    const where: Record<string, unknown> = {
      subjects: { some: { subjectId: server.id, subjectType: 'server' } },
    };

    if (eventFilter) {
      where.event = { contains: eventFilter };
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: perPage,
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json(fractalPaginated('activity_log', logs, total, page, perPage));
  } catch (err) {
    next(err);
  }
}
