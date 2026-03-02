import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../../../../config';

export async function getUploadUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const user = req.user!;

    // Generate a signed upload token for the daemon.
    // In production, this creates a JWT with server_uuid claim
    // that the daemon validates before accepting the upload.
    const payload = {
      user_id: user.id,
      server_uuid: server.uuid,
      exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes
    };

    const token = crypto
      .createHmac('sha256', config.JWT_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');

    // In production, the URL would come from the node's connection address.
    const url = `/upload/file?token=${token}`;

    res.json({
      object: 'signed_url',
      attributes: { url },
    });
  } catch (err) {
    next(err);
  }
}
