import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';

/**
 * Middleware that loads the user from the session into req.user.
 * Does not reject unauthenticated requests -- that's handled by requireAuth.
 */
export async function loadUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      next();
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      (req as any).user = { ...user, rootAdmin: user.rootAdmin };
    }
    next();
  } catch (err) {
    next(err);
  }
}
