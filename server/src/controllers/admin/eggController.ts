import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { fractalItem, fractalList } from '../../utils/response';
import { NotFoundError } from '../../utils/errors';

function transformEgg(egg: any) {
  return {
    id: egg.id,
    uuid: egg.uuid,
    name: egg.name,
    nest: egg.nestId,
    author: egg.author,
    description: egg.description,
    docker_image: egg.dockerImages,
    docker_images: egg.dockerImages,
    config: {
      files: egg.configFiles,
      startup: egg.configStartup,
      stop: egg.configStop,
      logs: egg.configLogs,
      extends: egg.configFrom,
    },
    startup: egg.startup,
    script: {
      privileged: egg.scriptIsPrivileged,
      install: egg.scriptInstall,
      entry: egg.scriptEntry,
      container: egg.scriptContainer,
      extends: egg.copyScriptFrom,
    },
    created_at: egg.createdAt.toISOString(),
    updated_at: egg.updatedAt.toISOString(),
  };
}

export async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const nestId = parseInt(req.params.id as string, 10);
    const nest = await prisma.nest.findUnique({ where: { id: nestId } });
    if (!nest) throw new NotFoundError('Nest not found');

    const eggs = await prisma.egg.findMany({
      where: { nestId },
      orderBy: { id: 'asc' },
    });

    res.json(fractalList('egg', eggs.map(transformEgg)));
  } catch (err) {
    next(err);
  }
}

export async function view(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const nestId = parseInt(req.params.id as string, 10);
    const eggId = parseInt(req.params.eggId as string, 10);

    const egg = await prisma.egg.findFirst({
      where: { id: eggId, nestId },
    });
    if (!egg) throw new NotFoundError('Egg not found');

    res.json(fractalItem('egg', transformEgg(egg)));
  } catch (err) {
    next(err);
  }
}
