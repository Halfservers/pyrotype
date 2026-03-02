import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../../utils/errors';

// All file operations proxy to the Elytra daemon through the node's connection address.
// In production, each handler would make an HTTP request to the daemon.

export async function listDirectory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const directory = (req.query.directory as string) ?? '/';

    // TODO: Proxy to daemon: GET /api/servers/{uuid}/files/list?directory={directory}
    res.json({ object: 'list', data: [] });
  } catch (err) {
    next(err);
  }
}

export async function getContents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const file = req.query.file as string;

    if (!file) {
      throw new AppError('A file path must be provided.', 422, 'ValidationError');
    }

    // TODO: Proxy to daemon: GET /api/servers/{uuid}/files/contents?file={file}
    // TODO: Activity log: server:file.read
    res.type('text/plain').send('');
  } catch (err) {
    next(err);
  }
}

export async function downloadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const file = req.query.file as string;

    if (!file) {
      throw new AppError('A file path must be provided.', 422, 'ValidationError');
    }

    // Generate a signed download token for the daemon
    // TODO: Activity log: server:file.download
    res.json({
      object: 'signed_url',
      attributes: {
        url: '', // placeholder: would be a signed URL to the daemon
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function writeFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const file = req.query.file as string;

    // TODO: Proxy to daemon: POST /api/servers/{uuid}/files/write?file={file}
    // TODO: Activity log: server:file.write
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function createFolder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const { name, root } = req.body;

    // TODO: Proxy to daemon: POST /api/servers/{uuid}/files/create-directory
    // TODO: Activity log: server:file.create-directory
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function renameFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;

    // TODO: Proxy to daemon: PUT /api/servers/{uuid}/files/rename
    // TODO: Activity log: server:file.rename
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function copyFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;

    // TODO: Proxy to daemon: POST /api/servers/{uuid}/files/copy
    // TODO: Activity log: server:file.copy
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function compressFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;

    // TODO: Proxy to daemon: POST /api/servers/{uuid}/files/compress
    // TODO: Activity log: server:file.compress
    res.json({ object: 'file_object', attributes: {} });
  } catch (err) {
    next(err);
  }
}

export async function decompressFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;

    // TODO: Proxy to daemon: POST /api/servers/{uuid}/files/decompress
    // TODO: Activity log: server:file.decompress
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function deleteFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;

    // TODO: Proxy to daemon: POST /api/servers/{uuid}/files/delete
    // TODO: Activity log: server:file.delete
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function chmodFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;

    // TODO: Proxy to daemon: POST /api/servers/{uuid}/files/chmod
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function pullFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;

    // TODO: Proxy to daemon: POST /api/servers/{uuid}/files/pull
    // TODO: Activity log: server:file.pull
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
