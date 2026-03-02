import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { type Request, type Response, type NextFunction } from 'express';
import session from 'express-session';
import supertest from 'supertest';
import { loadUser } from '../../src/middleware/loadUser';
import { errorHandler } from '../../src/middleware/errorHandler';

const mockFindUnique = vi.fn();

vi.mock('../../src/config/database', () => ({
  prisma: {
    user: { findUnique: (...args: any[]) => mockFindUnique(...args) },
  },
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(
    session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
    }),
  );

  // Set session userId via header for testing
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.headers['x-test-user-id']) {
      (req.session as any).userId = Number(req.headers['x-test-user-id']);
    }
    next();
  });

  app.use(loadUser);

  app.get('/test', (req: Request, res: Response) => {
    res.json({
      ok: true,
      user: (req as any).user || null,
    });
  });

  app.use(errorHandler);
  return app;
}

describe('loadUser middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load user into req.user when session has userId', async () => {
    const fakeUser = { id: 1, username: 'admin', rootAdmin: true, email: 'admin@test.com' };
    mockFindUnique.mockResolvedValue(fakeUser);

    const app = createApp();
    const res = await supertest(app).get('/test').set('x-test-user-id', '1');

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: 1, username: 'admin', rootAdmin: true });
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('should continue without user when no session userId', async () => {
    const app = createApp();
    const res = await supertest(app).get('/test');

    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('should continue without user when user not found in DB', async () => {
    mockFindUnique.mockResolvedValue(null);

    const app = createApp();
    const res = await supertest(app).get('/test').set('x-test-user-id', '9999');

    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
  });

  it('should pass errors to next()', async () => {
    mockFindUnique.mockRejectedValue(new Error('DB connection failed'));

    const app = createApp();
    const res = await supertest(app).get('/test').set('x-test-user-id', '1');

    expect(res.status).toBe(500);
    expect(res.body.errors[0].detail).toBe('An unexpected error occurred.');
  });
});
