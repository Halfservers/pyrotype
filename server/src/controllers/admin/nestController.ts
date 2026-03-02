import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { fractalItem, fractalPaginated } from '../../utils/response';
import { paginationSchema, getPaginationOffset } from '../../utils/pagination';
import { NotFoundError } from '../../utils/errors';

function transformNest(nest: any) {
  return {
    id: nest.id,
    uuid: nest.uuid,
    author: nest.author,
    name: nest.name,
    description: nest.description,
    created_at: nest.createdAt.toISOString(),
    updated_at: nest.updatedAt.toISOString(),
  };
}

export async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pagination = paginationSchema.parse(req.query);
    const { skip, take } = getPaginationOffset(pagination);

    const [nests, total] = await Promise.all([
      prisma.nest.findMany({ skip, take, orderBy: { id: 'asc' } }),
      prisma.nest.count(),
    ]);

    res.json(fractalPaginated('nest', nests.map(transformNest), total, pagination.page, pagination.per_page));
  } catch (err) {
    next(err);
  }
}

export async function view(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    const nest = await prisma.nest.findUnique({ where: { id } });
    if (!nest) throw new NotFoundError('Nest not found');

    res.json(fractalItem('nest', transformNest(nest)));
  } catch (err) {
    next(err);
  }
}
