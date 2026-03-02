import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthenticationError, ForbiddenError } from '../utils/errors';
import { verifyPassword } from '../utils/crypto';

/**
 * Middleware that allows admin access via either:
 * 1. Application API key (Bearer token, keyType=1)
 * 2. Session-based auth where user is rootAdmin
 */
export async function requireAdminAccess(req: Request, _res: Response, next: NextFunction): Promise<void> {
  // If user is already loaded from session (via loadUser middleware) and is admin, allow
  if (req.user?.rootAdmin) {
    return next();
  }

  // Otherwise, fall through to API key auth
  return requireApiKey(req, _res, next);
}

/**
 * Middleware for Application API key authentication (keyType = 1).
 * Expects: Authorization: Bearer <identifier>.<token>
 */
export async function requireApiKey(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      // No Bearer token and no admin session — reject
      if (!req.user) {
        return next(new AuthenticationError('Authentication required'));
      }
      return next(new ForbiddenError('Admin access required'));
    }

    const bearer = authHeader.slice(7);
    const dotIndex = bearer.indexOf('.');
    if (dotIndex === -1) {
      return next(new AuthenticationError('Malformed API key'));
    }

    const identifier = bearer.slice(0, dotIndex);
    const token = bearer.slice(dotIndex + 1);

    const apiKey = await prisma.apiKey.findUnique({
      where: { identifier },
      include: { user: true },
    });

    if (!apiKey || apiKey.keyType !== 1) {
      return next(new AuthenticationError('Invalid API key'));
    }

    const valid = await verifyPassword(token, apiKey.token);
    if (!valid) {
      return next(new AuthenticationError('Invalid API key'));
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return next(new AuthenticationError('API key has expired'));
    }

    if (!apiKey.user.rootAdmin) {
      return next(new ForbiddenError('This API key does not belong to an admin user'));
    }

    // Check allowed IPs if configured
    const allowedIps = apiKey.allowedIps as string[] | null;
    if (allowedIps && allowedIps.length > 0) {
      const clientIp = req.ip || req.socket.remoteAddress || '';
      if (!allowedIps.includes(clientIp)) {
        return next(new ForbiddenError('IP address not allowed for this API key'));
      }
    }

    // Attach user and api key info to request
    req.user = { ...apiKey.user, rootAdmin: apiKey.user.rootAdmin };
    (req as any).apiKey = apiKey;

    // Update last used timestamp (fire and forget)
    prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});

    next();
  } catch (err) {
    next(err);
  }
}
