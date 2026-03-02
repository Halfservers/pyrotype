import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../config/database';
import { AppError } from '../../../../utils/errors';

export async function rename(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const { name, description } = req.body;

    if (!name || typeof name !== 'string') {
      throw new AppError('A server name must be provided.', 422, 'ValidationError');
    }

    await prisma.server.update({
      where: { id: server.id },
      data: {
        name,
        description: description !== undefined ? String(description) : server.description,
      },
    });

    // TODO: Activity log: server:settings.rename / server:settings.description

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function reinstall(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;

    // In production, trigger server reinstallation through the daemon.
    // TODO: Activity log: server:reinstall

    res.status(202).json({});
  } catch (err) {
    next(err);
  }
}

export async function setDockerImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const { docker_image } = req.body;

    if (!docker_image) {
      throw new AppError('A Docker image must be provided.', 422, 'ValidationError');
    }

    // In production, validate the docker image is in the egg's allowed list.
    const egg = await prisma.egg.findUnique({ where: { id: server.eggId } });
    const allowedImages = Object.values(egg?.dockerImages ?? {});

    if (!allowedImages.includes(docker_image)) {
      throw new AppError('The requested Docker image is not allowed for this server.', 400, 'BadRequest');
    }

    await prisma.server.update({
      where: { id: server.id },
      data: { image: docker_image },
    });

    // TODO: Activity log: server:startup.image

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function revertDockerImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;

    const egg = await prisma.egg.findUnique({ where: { id: server.eggId } });
    const dockerImages = egg?.dockerImages as Record<string, string> | null;

    if (!dockerImages || Object.keys(dockerImages).length === 0) {
      throw new AppError('No default docker image available for this server\'s egg.', 400, 'BadRequest');
    }

    // Get the first (default) docker image
    const defaultImage = Object.values(dockerImages)[0];

    await prisma.server.update({
      where: { id: server.id },
      data: { image: defaultImage },
    });

    // TODO: Activity log: server:startup.image.reverted

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function changeEgg(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const { egg_id, nest_id } = req.body;

    if (server.eggId !== egg_id || server.nestId !== nest_id) {
      const egg = await prisma.egg.findUnique({ where: { id: egg_id } });

      await prisma.server.update({
        where: { id: server.id },
        data: {
          eggId: egg_id,
          nestId: nest_id,
          startup: egg?.startup ?? server.startup,
        },
      });

      // TODO: Activity log: server:settings.egg
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function previewEggChange(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const { egg_id, nest_id } = req.body;

    const egg = await prisma.egg.findUnique({
      where: { id: egg_id },
      include: { variables: true },
    });

    if (!egg) {
      throw new AppError('The specified egg does not exist.', 404, 'NotFound');
    }

    // TODO: Activity log: server:settings.egg-preview

    res.json({
      egg_id: egg.id,
      nest_id,
      name: egg.name,
      docker_images: egg.dockerImages,
      startup: egg.startup,
      variables: egg.variables,
    });
  } catch (err) {
    next(err);
  }
}

export async function applyEggChange(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const {
      egg_id,
      nest_id,
      docker_image,
      startup_command,
      environment,
      should_backup,
      should_wipe,
    } = req.body;

    // In production, this dispatches an async operation through ServerOperationService.
    const operationId = `op_${Date.now()}`;

    // TODO: Activity log: server:software.change-queued

    res.status(202).json({
      operation_id: operationId,
      status: 'queued',
    });
  } catch (err) {
    next(err);
  }
}

export async function getServerOperations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;

    // In production, fetch from ServerOperationService
    res.json({ operations: [] });
  } catch (err) {
    next(err);
  }
}

export async function getOperationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const { operationId } = req.params;

    // In production, fetch from ServerOperationService
    res.json({
      operation_id: operationId,
      status: 'unknown',
      server_id: server.id,
    });
  } catch (err) {
    next(err);
  }
}
