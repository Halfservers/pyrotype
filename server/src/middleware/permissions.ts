import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { NotFoundError, ForbiddenError, ServerStateConflictError } from '../utils/errors';

export async function authenticateServerAccess(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const serverId = req.params.server as string;
    if (!serverId) return next(new NotFoundError('Server not specified.'));

    const server = await prisma.server.findFirst({
      where: { OR: [{ uuid: serverId }, { uuidShort: serverId }, { id: isNaN(Number(serverId)) ? undefined : Number(serverId) }] },
      include: { node: true, allocation: true, egg: true },
    });

    if (!server) return next(new NotFoundError('Server not found.'));

    req.server = server as any;

    // Check if user is owner or subuser
    const user = req.user!;
    if (server.ownerId === user.id) {
      req.serverPermissions = ['*'];
      return next();
    }

    if (user.rootAdmin) {
      req.serverPermissions = ['*'];
      return next();
    }

    const subuser = await prisma.subuser.findFirst({
      where: { serverId: server.id, userId: user.id },
    });

    if (!subuser) return next(new NotFoundError('Server not found.'));

    req.serverPermissions = (subuser.permissions as string[]) || [];
    next();
  } catch (error) {
    next(error);
  }
}

export function requirePermission(...permissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const userPerms = req.serverPermissions || [];

    if (userPerms.includes('*')) return next();

    const hasPermission = permissions.some((perm) => {
      if (perm.endsWith('.*')) {
        const prefix = perm.slice(0, -1);
        return userPerms.some((p) => p.startsWith(prefix) || p === '*');
      }
      return userPerms.includes(perm);
    });

    if (!hasPermission) {
      return next(new ForbiddenError('You do not have permission to perform this action.'));
    }
    next();
  };
}

export function validateServerState(req: Request, _res: Response, next: NextFunction): void {
  const server = req.server as any;
  if (!server) return next(new NotFoundError('Server not found.'));

  if (
    server.status === 'suspended' ||
    server.node?.maintenanceMode ||
    server.status === 'restoring_backup'
  ) {
    return next(new ServerStateConflictError());
  }
  next();
}
