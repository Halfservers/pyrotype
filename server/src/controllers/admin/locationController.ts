import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { fractalItem, fractalPaginated } from '../../utils/response';
import { paginationSchema, getPaginationOffset } from '../../utils/pagination';
import { NotFoundError, ConflictError } from '../../utils/errors';

function transformLocation(loc: any) {
  return {
    id: loc.id,
    short: loc.short,
    long: loc.long,
    created_at: loc.createdAt.toISOString(),
    updated_at: loc.updatedAt.toISOString(),
  };
}

export async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pagination = paginationSchema.parse(req.query);
    const { skip, take } = getPaginationOffset(pagination);

    const filterShort = req.query['filter[short]'] as string | undefined;
    const filterLong = req.query['filter[long]'] as string | undefined;

    const where: any = {};
    if (filterShort) where.short = { contains: filterShort };
    if (filterLong) where.long = { contains: filterLong };

    const [locations, total] = await Promise.all([
      prisma.location.findMany({ where, skip, take, orderBy: { id: 'asc' } }),
      prisma.location.count({ where }),
    ]);

    res.json(fractalPaginated('location', locations.map(transformLocation), total, pagination.page, pagination.per_page));
  } catch (err) {
    next(err);
  }
}

export async function view(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    const location = await prisma.location.findUnique({ where: { id } });
    if (!location) throw new NotFoundError('Location not found');

    res.json(fractalItem('location', transformLocation(location)));
  } catch (err) {
    next(err);
  }
}

export async function store(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { short, long } = req.body;

    const location = await prisma.location.create({
      data: { short, long: long || null },
    });

    res.status(201).json({
      ...fractalItem('location', transformLocation(location)),
      meta: {
        resource: `/api/application/locations/${location.id}`,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Location not found');

    const { short, long } = req.body;
    const data: any = {};
    if (short !== undefined) data.short = short;
    if (long !== undefined) data.long = long;

    const location = await prisma.location.update({ where: { id }, data });
    res.json(fractalItem('location', transformLocation(location)));
  } catch (err) {
    next(err);
  }
}

export async function deleteLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    const location = await prisma.location.findUnique({
      where: { id },
      include: { nodes: { select: { id: true } } },
    });
    if (!location) throw new NotFoundError('Location not found');

    if (location.nodes.length > 0) {
      throw new ConflictError('Cannot delete a location that has active nodes attached.');
    }

    await prisma.location.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
