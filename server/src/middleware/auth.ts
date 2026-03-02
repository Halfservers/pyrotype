import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthenticationError, ForbiddenError } from '../utils/errors';

export const requireAuth = isAuthenticated;

export async function isAuthenticated(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    // Check session first
    if (req.session?.userId) {
      const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
      if (user) {
        req.user = { ...user, rootAdmin: user.rootAdmin };
        return next();
      }
    }

    // Check Bearer token (API key)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      // API keys are formatted as identifier.token
      const parts = token.split('.');
      if (parts.length === 2) {
        const [identifier, keyToken] = parts;
        const apiKey = await prisma.apiKey.findFirst({
          where: { identifier, keyType: 2 }, // TYPE_ACCOUNT = 2
          include: { user: true },
        });
        if (apiKey && apiKey.token === keyToken) {
          await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
          req.user = { ...apiKey.user, rootAdmin: apiKey.user.rootAdmin };
          return next();
        }
      }
    }

    throw new AuthenticationError();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return next(error);
    }
    next(new AuthenticationError());
  }
}

export function isAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user?.rootAdmin) {
    return next(new ForbiddenError('Must be an administrator.'));
  }
  next();
}

export function requireTwoFactor(req: Request, _res: Response, next: NextFunction): void {
  if (req.user?.useTotp && !req.session?.twoFactorVerified) {
    return next(new ForbiddenError('Two-factor authentication required.'));
  }
  next();
}
