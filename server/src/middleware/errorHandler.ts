import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../config/logger';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  logger.error(err.message, { stack: err.stack });

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      errors: [{ code: err.code, status: String(err.statusCode), detail: err.message }],
    });
    return;
  }

  res.status(500).json({
    errors: [{ code: 'InternalServerError', status: '500', detail: 'An unexpected error occurred.' }],
  });
}
