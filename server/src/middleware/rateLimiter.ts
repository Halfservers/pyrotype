import type { Request, Response, NextFunction } from 'express';
import { TooManyRequestsError } from '../utils/errors';

const requestCounts = new Map<string, { count: number; resetAt: number }>();

// Alias for routes that call rateLimiter(max, windowMs)
export function rateLimiter(maxRequests: number, windowMs: number) {
  return rateLimit(maxRequests, windowMs / 60000);
}

export function rateLimit(maxRequests: number, windowMinutes: number) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    const entry = requestCounts.get(key);
    if (!entry || now > entry.resetAt) {
      requestCounts.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count++;
    if (entry.count > maxRequests) {
      return next(new TooManyRequestsError());
    }
    next();
  };
}
