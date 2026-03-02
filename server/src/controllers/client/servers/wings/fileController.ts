import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../config/database';
import { fractalList, fractalItem } from '../../../../utils/response';
import { NotFoundError } from '../../../../utils/errors';
import { getWingsClient } from '../../../../services/wings/client';
import { createDaemonToken } from '../../../../services/auth/daemonToken';

async function resolveServer(serverId: string): Promise<any> {
  const server = await prisma.server.findFirst({
    where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
    include: { node: true },
  });
  if (!server) throw new NotFoundError('Server not found');
  return server;
}

export async function directory(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(String(req.params.server));
    const dir = (req.query.directory as string) ?? '/';
    const wings = getWingsClient(server.node!);
    const files = await wings.listDirectory(server.uuid, dir);

    res.json(fractalList('file_object', files));
  } catch (err) {
    next(err);
  }
}

export async function contents(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(String(req.params.server));
    const file = req.query.file as string;
    const wings = getWingsClient(server.node!);
    const content = await wings.getFileContents(server.uuid, file);

    res.set('Content-Type', 'text/plain').send(content);
  } catch (err) {
    next(err);
  }
}

export async function download(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const server = await resolveServer(String(req.params.server));
    const file = req.query.file as string;

    const token = await createDaemonToken(server.node!, user, {
      file_path: decodeURIComponent(file),
      server_uuid: server.uuid,
    });

    const node = server.node!;
    const url = `${node.scheme}://${node.fqdn}:${node.daemonListen}/download/file?token=${token}`;

    res.json({
      object: 'signed_url',
      attributes: { url },
    });
  } catch (err) {
    next(err);
  }
}

export async function write(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(String(req.params.server));
    const file = req.query.file as string;
    const wings = getWingsClient(server.node!);
    await wings.writeFile(server.uuid, file, req.body);

    res.status(204).json([]);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(String(req.params.server));
    const { name, root } = req.body;
    const wings = getWingsClient(server.node!);
    await wings.createDirectory(server.uuid, root ?? '/', name);

    res.status(204).json([]);
  } catch (err) {
    next(err);
  }
}

export async function rename(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(String(req.params.server));
    const { root, files } = req.body;
    const wings = getWingsClient(server.node!);
    await wings.renameFiles(server.uuid, root, files);

    res.status(204).json([]);
  } catch (err) {
    next(err);
  }
}

export async function copy(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(String(req.params.server));
    const { location } = req.body;
    const wings = getWingsClient(server.node!);
    await wings.copyFile(server.uuid, location);

    res.status(204).json([]);
  } catch (err) {
    next(err);
  }
}

export async function compress(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(String(req.params.server));
    const { root, files } = req.body;
    const wings = getWingsClient(server.node!);
    const file = await wings.compressFiles(server.uuid, root, files);

    res.json(fractalItem('file_object', file));
  } catch (err) {
    next(err);
  }
}

export async function decompress(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(String(req.params.server));
    const { root, file } = req.body;
    const wings = getWingsClient(server.node!);
    await wings.decompressFile(server.uuid, root, file);

    res.status(204).json([]);
  } catch (err) {
    next(err);
  }
}

export async function deleteFn(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(String(req.params.server));
    const { root, files } = req.body;
    const wings = getWingsClient(server.node!);
    await wings.deleteFiles(server.uuid, root, files);

    res.status(204).json([]);
  } catch (err) {
    next(err);
  }
}

export async function chmod(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(String(req.params.server));
    const { root, files } = req.body;
    const wings = getWingsClient(server.node!);
    await wings.chmodFiles(server.uuid, root, files);

    res.status(204).json([]);
  } catch (err) {
    next(err);
  }
}

export async function pull(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(String(req.params.server));
    const { url, directory: dir } = req.body;
    const wings = getWingsClient(server.node!);
    await wings.pullFile(server.uuid, url, dir);

    res.status(204).json([]);
  } catch (err) {
    next(err);
  }
}

export async function upload(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const server = await resolveServer(String(req.params.server));
    const node = server.node!;

    const token = await createDaemonToken(node, user, {
      server_uuid: server.uuid,
    });

    const url = `${node.scheme}://${node.fqdn}:${node.daemonListen}/upload/file?token=${token}`;

    res.json({
      object: 'signed_url',
      attributes: { url },
    });
  } catch (err) {
    next(err);
  }
}
