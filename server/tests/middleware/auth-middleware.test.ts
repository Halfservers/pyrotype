import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { type Request, type Response, type NextFunction } from 'express';
import session from 'express-session';
import supertest from 'supertest';
import { isAuthenticated, isAdmin, requireTwoFactor } from '../../src/middleware/auth';
import { errorHandler } from '../../src/middleware/errorHandler';

// Mock prisma
const mockFindUnique = vi.fn();
const mockFindFirst = vi.fn();
const mockUpdate = vi.fn();

vi.mock('../../src/config/database', () => ({
  prisma: {
    user: { findUnique: (...args: any[]) => mockFindUnique(...args) },
    apiKey: {
      findFirst: (...args: any[]) => mockFindFirst(...args),
      update: (...args: any[]) => mockUpdate(...args),
    },
  },
}));

function createApp(middleware: any[]) {
  const app = express();
  app.use(express.json());
  app.use(
    session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
    }),
  );

  // Helper to set session data from query params (for testing)
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.headers['x-test-user-id']) {
      (req.session as any).userId = Number(req.headers['x-test-user-id']);
    }
    if (req.headers['x-test-two-factor-verified']) {
      (req.session as any).twoFactorVerified = req.headers['x-test-two-factor-verified'] === 'true';
    }
    next();
  });

  for (const mw of middleware) {
    app.use(mw);
  }

  app.get('/test', (_req: Request, res: Response) => {
    res.json({ ok: true, user: (_req as any).user });
  });

  app.use(errorHandler);
  return app;
}

describe('auth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isAuthenticated', () => {
    it('should pass with valid session userId', async () => {
      const fakeUser = { id: 1, username: 'admin', rootAdmin: true };
      mockFindUnique.mockResolvedValue(fakeUser);

      const app = createApp([isAuthenticated]);
      const res = await supertest(app).get('/test').set('x-test-user-id', '1');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.user).toMatchObject({ id: 1, username: 'admin', rootAdmin: true });
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should pass with valid Bearer API key', async () => {
      const fakeUser = { id: 2, username: 'apiuser', rootAdmin: false };
      const fakeApiKey = { id: 10, identifier: 'myident', token: 'secrettoken', user: fakeUser };
      mockFindFirst.mockResolvedValue(fakeApiKey);
      mockUpdate.mockResolvedValue({});

      const app = createApp([isAuthenticated]);
      const res = await supertest(app)
        .get('/test')
        .set('Authorization', 'Bearer myident.secrettoken');

      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ id: 2, username: 'apiuser' });
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { identifier: 'myident', keyType: 2 },
        include: { user: true },
      });
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { lastUsedAt: expect.any(Date) },
      });
    });

    it('should reject with no session and no token (401)', async () => {
      const app = createApp([isAuthenticated]);
      const res = await supertest(app).get('/test');

      expect(res.status).toBe(401);
      expect(res.body.errors[0].code).toBe('AuthenticationError');
    });

    it('should reject with invalid session userId (user not found)', async () => {
      mockFindUnique.mockResolvedValue(null);

      const app = createApp([isAuthenticated]);
      const res = await supertest(app).get('/test').set('x-test-user-id', '9999');

      expect(res.status).toBe(401);
      expect(res.body.errors[0].code).toBe('AuthenticationError');
    });

    it('should reject with malformed Bearer token (no dot separator)', async () => {
      const app = createApp([isAuthenticated]);
      const res = await supertest(app)
        .get('/test')
        .set('Authorization', 'Bearer nodottoken');

      expect(res.status).toBe(401);
      expect(res.body.errors[0].code).toBe('AuthenticationError');
    });

    it('should reject when API key identifier not found', async () => {
      mockFindFirst.mockResolvedValue(null);

      const app = createApp([isAuthenticated]);
      const res = await supertest(app)
        .get('/test')
        .set('Authorization', 'Bearer unknown.token');

      expect(res.status).toBe(401);
    });

    it('should reject when API key token does not match', async () => {
      const fakeApiKey = {
        id: 10,
        identifier: 'myident',
        token: 'correcttoken',
        user: { id: 2, username: 'apiuser', rootAdmin: false },
      };
      mockFindFirst.mockResolvedValue(fakeApiKey);

      const app = createApp([isAuthenticated]);
      const res = await supertest(app)
        .get('/test')
        .set('Authorization', 'Bearer myident.wrongtoken');

      expect(res.status).toBe(401);
    });

    it('should reject with empty Bearer value', async () => {
      const app = createApp([isAuthenticated]);
      const res = await supertest(app)
        .get('/test')
        .set('Authorization', 'Bearer ');

      expect(res.status).toBe(401);
    });

    it('should reject with non-Bearer authorization header', async () => {
      const app = createApp([isAuthenticated]);
      const res = await supertest(app)
        .get('/test')
        .set('Authorization', 'Basic dXNlcjpwYXNz');

      expect(res.status).toBe(401);
    });
  });

  describe('isAdmin', () => {
    it('should pass for rootAdmin=true', async () => {
      const app = createApp([
        (req: Request, _res: Response, next: NextFunction) => {
          (req as any).user = { id: 1, rootAdmin: true };
          next();
        },
        isAdmin,
      ]);

      const res = await supertest(app).get('/test');
      expect(res.status).toBe(200);
    });

    it('should reject for rootAdmin=false (403)', async () => {
      const app = createApp([
        (req: Request, _res: Response, next: NextFunction) => {
          (req as any).user = { id: 2, rootAdmin: false };
          next();
        },
        isAdmin,
      ]);

      const res = await supertest(app).get('/test');
      expect(res.status).toBe(403);
      expect(res.body.errors[0].detail).toBe('Must be an administrator.');
    });

    it('should reject when no user is set', async () => {
      const app = createApp([isAdmin]);

      const res = await supertest(app).get('/test');
      expect(res.status).toBe(403);
    });
  });

  describe('requireTwoFactor', () => {
    it('should pass when useTotp is false', async () => {
      const app = createApp([
        (req: Request, _res: Response, next: NextFunction) => {
          (req as any).user = { id: 1, useTotp: false };
          next();
        },
        requireTwoFactor,
      ]);

      const res = await supertest(app).get('/test');
      expect(res.status).toBe(200);
    });

    it('should pass when useTotp is true and twoFactorVerified is true', async () => {
      const app = createApp([
        (req: Request, _res: Response, next: NextFunction) => {
          (req as any).user = { id: 1, useTotp: true };
          next();
        },
        requireTwoFactor,
      ]);

      const res = await supertest(app)
        .get('/test')
        .set('x-test-two-factor-verified', 'true');

      expect(res.status).toBe(200);
    });

    it('should reject when useTotp is true but twoFactorVerified is not set (403)', async () => {
      const app = createApp([
        (req: Request, _res: Response, next: NextFunction) => {
          (req as any).user = { id: 1, useTotp: true };
          next();
        },
        requireTwoFactor,
      ]);

      const res = await supertest(app).get('/test');
      expect(res.status).toBe(403);
      expect(res.body.errors[0].detail).toBe('Two-factor authentication required.');
    });

    it('should pass when user is not set (no useTotp to check)', async () => {
      const app = createApp([requireTwoFactor]);

      const res = await supertest(app).get('/test');
      expect(res.status).toBe(200);
    });
  });
});
