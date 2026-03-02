import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../utils/errors';

export async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    const node = await prisma.node.findUnique({ where: { id } });
    if (!node) throw new NotFoundError('Node not found');

    const configuration = {
      debug: false,
      uuid: node.uuid,
      token_id: node.daemonTokenId,
      token: node.daemonToken,
      api: {
        host: '0.0.0.0',
        port: node.daemonListen,
        ssl: {
          enabled: node.scheme === 'https',
          cert: '/etc/letsencrypt/live/' + node.fqdn + '/fullchain.pem',
          key: '/etc/letsencrypt/live/' + node.fqdn + '/privkey.pem',
        },
        upload_limit: node.uploadSize,
      },
      system: {
        data: node.daemonBase,
        sftp: {
          bind_port: node.daemonSFTP,
        },
      },
      allowed_mounts: [],
      remote: process.env.APP_URL || 'http://localhost:3000',
    };

    res.json(configuration);
  } catch (err) {
    next(err);
  }
}
