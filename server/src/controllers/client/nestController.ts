import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { fractalList, fractalItem } from '../../utils/response';
import { NotFoundError } from '../../utils/errors';

function transformNest(nest: any) {
  return {
    id: nest.id,
    uuid: nest.uuid,
    author: nest.author,
    name: nest.name,
    description: nest.description,
    relationships: {
      eggs: {
        object: 'list',
        data: (nest.eggs ?? []).map((egg: any) => ({
          object: 'egg',
          attributes: {
            id: egg.id,
            uuid: egg.uuid,
            name: egg.name,
            author: egg.author,
            description: egg.description,
            docker_images: egg.dockerImages,
            startup: egg.startup,
            features: egg.features,
          },
        })),
      },
    },
  };
}

export async function index(_req: Request, res: Response, next: NextFunction) {
  try {
    const nests = await prisma.nest.findMany({
      include: { eggs: true },
      orderBy: { name: 'asc' },
    });

    const data = nests.map(transformNest);
    res.json(fractalList('nest', data));
  } catch (err) {
    next(err);
  }
}

export async function view(req: Request, res: Response, next: NextFunction) {
  try {
    const nestId = parseInt(req.params.nest as string, 10);

    const nest = await prisma.nest.findUnique({
      where: { id: nestId },
      include: { eggs: true },
    });

    if (!nest) {
      throw new NotFoundError('Nest not found');
    }

    res.json(fractalItem('nest', transformNest(nest)));
  } catch (err) {
    next(err);
  }
}
