import type { Context } from 'hono';
import type { Env, HonoVariables } from '../../types/env';
import { fractalList, fractalItem } from '../../utils/response';
import { NotFoundError } from '../../utils/errors';

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>;

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

export async function index(c: AppContext) {
  const prisma = c.var.prisma;

  const nests = await prisma.nest.findMany({
    include: { eggs: true },
    orderBy: { name: 'asc' },
  });

  const data = nests.map(transformNest);
  return c.json(fractalList('nest', data));
}

export async function view(c: AppContext) {
  const prisma = c.var.prisma;
  const nestId = parseInt(c.req.param('nest'), 10);

  const nest = await prisma.nest.findUnique({
    where: { id: nestId },
    include: { eggs: true },
  });

  if (!nest) {
    throw new NotFoundError('Nest not found');
  }

  return c.json(fractalItem('nest', transformNest(nest)));
}
