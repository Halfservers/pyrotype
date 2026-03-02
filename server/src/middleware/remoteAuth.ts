import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthenticationError } from '../utils/errors';

export async function authenticateDaemonToken(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid authorization header.');
    }

    const token = authHeader.slice(7);

    if (token.length < 16) {
      throw new AuthenticationError('Invalid daemon token format.');
    }

    // The first 16 characters of the token serve as the token identifier
    const tokenId = token.substring(0, 16);

    const node = await prisma.node.findFirst({
      where: { daemonTokenId: tokenId },
    });

    if (!node || node.daemonToken !== token) {
      throw new AuthenticationError('Authorization credentials were not correct.');
    }

    req.node = node;
    next();
  } catch (err) {
    next(err);
  }
}
