import { describe, it, expect, vi } from 'vitest';
import express, { type Request, type Response, type NextFunction } from 'express';
import supertest from 'supertest';
import { errorHandler } from '../../src/middleware/errorHandler';
import {
  AppError,
  NotFoundError,
  AuthenticationError,
  ForbiddenError,
  ValidationError,
  ConflictError,
  ServerStateConflictError,
  TooManyRequestsError,
} from '../../src/utils/errors';

function createApp(errorToThrow: Error) {
  const app = express();

  app.get('/test', (_req: Request, _res: Response, next: NextFunction) => {
    next(errorToThrow);
  });

  app.use(errorHandler);
  return app;
}

describe('error handler middleware', () => {
  describe('AppError handling', () => {
    it('should return correct statusCode and error shape for AppError', async () => {
      const app = createApp(new AppError('Custom error', 418, 'TeapotError'));
      const res = await supertest(app).get('/test');

      expect(res.status).toBe(418);
      expect(res.body).toEqual({
        errors: [{ code: 'TeapotError', status: '418', detail: 'Custom error' }],
      });
    });

    it('should return default 500 for AppError without statusCode', async () => {
      const app = createApp(new AppError('Internal issue'));
      const res = await supertest(app).get('/test');

      expect(res.status).toBe(500);
      expect(res.body.errors[0].code).toBe('InternalServerError');
    });
  });

  describe('unknown Error handling', () => {
    it('should return 500 with generic message for non-AppError', async () => {
      const app = createApp(new Error('Something broke'));
      const res = await supertest(app).get('/test');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        errors: [
          { code: 'InternalServerError', status: '500', detail: 'An unexpected error occurred.' },
        ],
      });
    });

    it('should not leak internal error message for non-AppError', async () => {
      const app = createApp(new Error('Database connection string: secret@host'));
      const res = await supertest(app).get('/test');

      expect(res.status).toBe(500);
      expect(res.body.errors[0].detail).toBe('An unexpected error occurred.');
      expect(JSON.stringify(res.body)).not.toContain('secret@host');
    });
  });

  describe('error subtypes', () => {
    it('NotFoundError should return 404', async () => {
      const app = createApp(new NotFoundError('User not found'));
      const res = await supertest(app).get('/test');

      expect(res.status).toBe(404);
      expect(res.body.errors[0]).toEqual({
        code: 'NotFoundError',
        status: '404',
        detail: 'User not found',
      });
    });

    it('NotFoundError should use default message', async () => {
      const app = createApp(new NotFoundError());
      const res = await supertest(app).get('/test');

      expect(res.status).toBe(404);
      expect(res.body.errors[0].detail).toBe('Resource not found');
    });

    it('AuthenticationError should return 401', async () => {
      const app = createApp(new AuthenticationError('Invalid token'));
      const res = await supertest(app).get('/test');

      expect(res.status).toBe(401);
      expect(res.body.errors[0]).toEqual({
        code: 'AuthenticationError',
        status: '401',
        detail: 'Invalid token',
      });
    });

    it('AuthenticationError should use default message', async () => {
      const app = createApp(new AuthenticationError());
      const res = await supertest(app).get('/test');

      expect(res.status).toBe(401);
      expect(res.body.errors[0].detail).toBe('Authentication required');
    });

    it('ForbiddenError should return 403', async () => {
      const app = createApp(new ForbiddenError('No access'));
      const res = await supertest(app).get('/test');

      expect(res.status).toBe(403);
      expect(res.body.errors[0]).toEqual({
        code: 'ForbiddenError',
        status: '403',
        detail: 'No access',
      });
    });

    it('ForbiddenError should use default message', async () => {
      const app = createApp(new ForbiddenError());
      const res = await supertest(app).get('/test');

      expect(res.status).toBe(403);
      expect(res.body.errors[0].detail).toBe('Access denied');
    });

    it('ValidationError should return 422', async () => {
      const app = createApp(new ValidationError('Invalid input', [{ field: 'email' }]));
      const res = await supertest(app).get('/test');

      expect(res.status).toBe(422);
      expect(res.body.errors[0]).toEqual({
        code: 'ValidationError',
        status: '422',
        detail: 'Invalid input',
      });
    });

    it('ConflictError should return 409', async () => {
      const app = createApp(new ConflictError('Username taken'));
      const res = await supertest(app).get('/test');

      expect(res.status).toBe(409);
      expect(res.body.errors[0]).toEqual({
        code: 'ConflictError',
        status: '409',
        detail: 'Username taken',
      });
    });

    it('ServerStateConflictError should return 409', async () => {
      const app = createApp(new ServerStateConflictError());
      const res = await supertest(app).get('/test');

      expect(res.status).toBe(409);
      expect(res.body.errors[0]).toEqual({
        code: 'ServerStateConflictError',
        status: '409',
        detail: 'Server is in a conflicting state',
      });
    });

    it('TooManyRequestsError should return 429', async () => {
      const app = createApp(new TooManyRequestsError());
      const res = await supertest(app).get('/test');

      expect(res.status).toBe(429);
      expect(res.body.errors[0]).toEqual({
        code: 'TooManyRequestsError',
        status: '429',
        detail: 'Too many requests',
      });
    });
  });
});
