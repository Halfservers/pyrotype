import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';

export const requireDaemonType = checkDaemonType;

export function checkDaemonType(expectedType: 'wings' | 'elytra') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const server = req.server as any;
    if (!server?.node) return next();

    const nodeType = (server.node.daemonType || 'wings').toLowerCase();
    if (nodeType !== expectedType) {
      return next(new ForbiddenError(`This endpoint is only available for ${expectedType} daemon type.`));
    }
    next();
  };
}
