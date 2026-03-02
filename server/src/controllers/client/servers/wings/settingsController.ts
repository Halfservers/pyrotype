import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../../../../config/database';
import { NotFoundError, AppError } from '../../../../utils/errors';

const renameSchema = z.object({
  name: z.string().min(1).max(191),
  description: z.string().optional(),
});

const dockerImageSchema = z.object({
  docker_image: z.string().min(1),
});

const changeEggSchema = z.object({
  egg_id: z.number().int().positive(),
  nest_id: z.number().int().positive(),
});

const applyEggChangeSchema = z.object({
  egg_id: z.number().int().positive(),
  nest_id: z.number().int().positive(),
  docker_image: z.string().optional(),
  startup_command: z.string().optional(),
  environment: z.record(z.string(), z.string()).optional().default({}),
  should_backup: z.boolean().optional().default(false),
  should_wipe: z.boolean().optional().default(false),
});

async function resolveServer(serverId: string): Promise<any> {
  const server = await prisma.server.findFirst({
    where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
    include: { egg: true, node: true },
  });
  if (!server) throw new NotFoundError('Server not found');
  return server;
}

export async function rename(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(req.params.server as string);
    const body = renameSchema.parse(req.body);

    await prisma.server.update({
      where: { id: server.id },
      data: {
        name: body.name,
        description: body.description ?? server.description,
      },
    });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function reinstall(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(req.params.server as string);

    await prisma.server.update({
      where: { id: server.id },
      data: { status: 'installing', installedAt: null },
    });

    // TODO: Dispatch reinstall to Wings daemon

    res.status(202).json([]);
  } catch (err) {
    next(err);
  }
}

export async function dockerImage(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(req.params.server as string);
    const body = dockerImageSchema.parse(req.body);

    const allowedImages = Object.values(server.egg?.dockerImages as Record<string, string> ?? {});
    if (!allowedImages.includes(body.docker_image)) {
      throw new AppError('The requested Docker image is not allowed for this server.', 400, 'BadRequest');
    }

    await prisma.server.update({
      where: { id: server.id },
      data: { image: body.docker_image },
    });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function changeEgg(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(req.params.server as string);
    const body = changeEggSchema.parse(req.body);

    if (server.eggId !== body.egg_id || server.nestId !== body.nest_id) {
      const egg = await prisma.egg.findUnique({ where: { id: body.egg_id } });
      if (!egg) throw new NotFoundError('Egg not found');

      await prisma.server.update({
        where: { id: server.id },
        data: {
          eggId: body.egg_id,
          nestId: body.nest_id,
          startup: egg.startup ?? server.startup,
        },
      });
    }

    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function previewEggChange(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(req.params.server as string);
    const body = changeEggSchema.parse(req.body);

    const egg: any = await prisma.egg.findUnique({
      where: { id: body.egg_id },
      include: { variables: true },
    });

    if (!egg) throw new NotFoundError('Egg not found');

    res.json({
      current_egg: {
        id: server.eggId,
        name: server.egg?.name ?? '',
      },
      new_egg: {
        id: egg.id,
        name: egg.name,
        docker_images: egg.dockerImages,
        startup: egg.startup,
        variables: egg.variables.map((v: any) => ({
          name: v.name,
          env_variable: v.envVariable,
          default_value: v.defaultValue,
          user_viewable: v.userViewable,
          user_editable: v.userEditable,
          rules: v.rules,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function applyEggChange(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(req.params.server as string);
    const body = applyEggChangeSchema.parse(req.body);

    const operationId = crypto.randomUUID();

    await prisma.serverOperation.create({
      data: {
        operationId,
        serverId: server.id,
        userId: req.user!.id,
        type: 'egg_change',
        status: 'pending',
        parameters: JSON.parse(JSON.stringify({
          egg_id: body.egg_id,
          nest_id: body.nest_id,
          docker_image: body.docker_image,
          startup_command: body.startup_command,
          environment: body.environment,
          should_backup: body.should_backup,
          should_wipe: body.should_wipe,
        })),
      },
    });

    // TODO: Dispatch async egg change job

    res.status(202).json({
      operation_id: operationId,
      status: 'pending',
      message: 'Egg change has been queued.',
    });
  } catch (err) {
    next(err);
  }
}
