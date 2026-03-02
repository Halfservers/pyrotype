import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { NotFoundError, AppError } from '../../utils/errors';
import { config } from '../../config';

export async function getRusticConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const uuid = String(req.params.uuid);
    const type = (req.query.type as string) ?? 'local';

    if (!['local', 's3'].includes(type)) {
      throw new AppError('Invalid backup type', 400, 'BadRequest');
    }

    const server = await prisma.server.findFirst({
      where: { uuid },
    });

    if (!server) {
      throw new NotFoundError('Server not found.');
    }

    // Generate a deterministic repository password from server UUID + app key
    const repositoryPassword = crypto
      .createHash('sha256')
      .update(server.uuid + config.SESSION_SECRET)
      .digest('hex');

    const result: Record<string, unknown> = {
      backup_type: type,
      repository_password: repositoryPassword,
      repository_path: type === 'local'
        ? `/var/lib/pterodactyl/rustic-repos/${server.uuid}`
        : `rustic-repos/${server.uuid}`,
    };

    // S3 credentials would come from environment/config in production
    if (type === 's3') {
      result.s3_credentials = {
        access_key_id: '',
        secret_access_key: '',
        session_token: '',
        region: 'us-east-1',
        bucket: '',
        endpoint: '',
        force_path_style: false,
        disable_ssl: false,
        ca_cert_path: '',
      };
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
}
