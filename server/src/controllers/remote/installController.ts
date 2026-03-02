import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../utils/errors';

export async function getInstallation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const node = req.node!;
    const uuid = String(req.params.uuid);

    const server: any = await prisma.server.findFirst({
      where: { uuid, nodeId: node.id },
      include: { egg: true },
    });

    if (!server) {
      throw new NotFoundError('Server not found.');
    }

    const egg = server.egg;

    res.json({
      container_image: egg.scriptContainer,
      entrypoint: egg.scriptEntry,
      script: egg.scriptInstall,
    });
  } catch (err) {
    next(err);
  }
}

export async function reportInstallation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const node = req.node!;
    const uuid = String(req.params.uuid);

    const server = await prisma.server.findFirst({
      where: { uuid, nodeId: node.id },
    });

    if (!server) {
      throw new NotFoundError('Server not found.');
    }

    const successful = req.body.successful ?? false;
    const reinstall = req.body.reinstall ?? false;

    let status: string | null = null;

    if (!successful) {
      status = reinstall ? 'reinstall_failed' : 'install_failed';
    }

    // Keep the server suspended if it was already suspended
    if (server.status === 'suspended') {
      status = 'suspended';
    }

    await prisma.server.update({
      where: { id: server.id },
      data: {
        status,
        installedAt: new Date(),
      },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
