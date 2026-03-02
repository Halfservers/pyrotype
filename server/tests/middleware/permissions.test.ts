import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { type Request, type Response, type NextFunction } from 'express';
import supertest from 'supertest';
import {
  authenticateServerAccess,
  requirePermission,
  validateServerState,
} from '../../src/middleware/permissions';
import { errorHandler } from '../../src/middleware/errorHandler';

// Mock prisma
const mockServerFindFirst = vi.fn();
const mockSubuserFindFirst = vi.fn();

vi.mock('../../src/config/database', () => ({
  prisma: {
    server: { findFirst: (...args: any[]) => mockServerFindFirst(...args) },
    subuser: { findFirst: (...args: any[]) => mockSubuserFindFirst(...args) },
  },
}));

function createApp(
  middleware: any[],
  opts: {
    user?: any;
    server?: any;
    serverPermissions?: string[];
    routeParam?: string;
  } = {},
) {
  const app = express();
  app.use(express.json());

  // Inject user before middleware
  if (opts.user) {
    app.use((req: Request, _res: Response, next: NextFunction) => {
      (req as any).user = opts.user;
      next();
    });
  }

  // Inject server and permissions for validateServerState / requirePermission tests
  if (opts.server) {
    app.use((req: Request, _res: Response, next: NextFunction) => {
      (req as any).server = opts.server;
      next();
    });
  }
  if (opts.serverPermissions) {
    app.use((req: Request, _res: Response, next: NextFunction) => {
      (req as any).serverPermissions = opts.serverPermissions;
      next();
    });
  }

  const paramPath = opts.routeParam ? `/:server` : '/test';

  for (const mw of middleware) {
    if (opts.routeParam) {
      app.use('/:server', mw);
    } else {
      app.use(mw);
    }
  }

  app.get(paramPath, (_req: Request, res: Response) => {
    res.json({
      ok: true,
      server: (_req as any).server ? { id: (_req as any).server.id } : null,
      permissions: (_req as any).serverPermissions,
    });
  });

  app.use(errorHandler);
  return app;
}

describe('permissions middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authenticateServerAccess', () => {
    const fakeServer = {
      id: 1,
      uuid: 'abc-123',
      uuidShort: 'abc123',
      ownerId: 1,
      status: null,
      node: { id: 1, maintenanceMode: false },
      allocation: { id: 1 },
      egg: { id: 1 },
    };

    it('should load server for owner with wildcard permissions', async () => {
      mockServerFindFirst.mockResolvedValue(fakeServer);

      const app = createApp([authenticateServerAccess], {
        user: { id: 1, rootAdmin: false },
        routeParam: 'server',
      });

      const res = await supertest(app).get('/abc-123');
      expect(res.status).toBe(200);
      expect(res.body.permissions).toEqual(['*']);
    });

    it('should load server for admin with wildcard permissions', async () => {
      const serverOwnedByOther = { ...fakeServer, ownerId: 99 };
      mockServerFindFirst.mockResolvedValue(serverOwnedByOther);

      const app = createApp([authenticateServerAccess], {
        user: { id: 2, rootAdmin: true },
        routeParam: 'server',
      });

      const res = await supertest(app).get('/abc-123');
      expect(res.status).toBe(200);
      expect(res.body.permissions).toEqual(['*']);
    });

    it('should load server for subuser with subuser permissions', async () => {
      const serverOwnedByOther = { ...fakeServer, ownerId: 99 };
      mockServerFindFirst.mockResolvedValue(serverOwnedByOther);
      mockSubuserFindFirst.mockResolvedValue({
        id: 5,
        permissions: ['control.start', 'control.stop', 'file.read'],
      });

      const app = createApp([authenticateServerAccess], {
        user: { id: 3, rootAdmin: false },
        routeParam: 'server',
      });

      const res = await supertest(app).get('/abc-123');
      expect(res.status).toBe(200);
      expect(res.body.permissions).toEqual(['control.start', 'control.stop', 'file.read']);
    });

    it('should reject non-owner/non-subuser (404)', async () => {
      const serverOwnedByOther = { ...fakeServer, ownerId: 99 };
      mockServerFindFirst.mockResolvedValue(serverOwnedByOther);
      mockSubuserFindFirst.mockResolvedValue(null);

      const app = createApp([authenticateServerAccess], {
        user: { id: 3, rootAdmin: false },
        routeParam: 'server',
      });

      const res = await supertest(app).get('/abc-123');
      expect(res.status).toBe(404);
      expect(res.body.errors[0].detail).toBe('Server not found.');
    });

    it('should reject invalid server ID (404)', async () => {
      mockServerFindFirst.mockResolvedValue(null);

      const app = createApp([authenticateServerAccess], {
        user: { id: 1, rootAdmin: false },
        routeParam: 'server',
      });

      const res = await supertest(app).get('/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.errors[0].detail).toBe('Server not found.');
    });

    it('should handle numeric server IDs', async () => {
      mockServerFindFirst.mockResolvedValue(fakeServer);

      const app = createApp([authenticateServerAccess], {
        user: { id: 1, rootAdmin: false },
        routeParam: 'server',
      });

      const res = await supertest(app).get('/1');
      expect(res.status).toBe(200);
      expect(mockServerFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ id: 1 }),
            ]),
          }),
        }),
      );
    });
  });

  describe('requirePermission', () => {
    it('should pass with wildcard "*" permission', async () => {
      const app = createApp([requirePermission('control.start')], {
        serverPermissions: ['*'],
      });

      const res = await supertest(app).get('/test');
      expect(res.status).toBe(200);
    });

    it('should pass with exact permission match', async () => {
      const app = createApp([requirePermission('control.start')], {
        serverPermissions: ['control.start', 'control.stop'],
      });

      const res = await supertest(app).get('/test');
      expect(res.status).toBe(200);
    });

    it('should pass with prefix match (e.g., "control.*")', async () => {
      const app = createApp([requirePermission('control.*')], {
        serverPermissions: ['control.start', 'control.stop'],
      });

      const res = await supertest(app).get('/test');
      expect(res.status).toBe(200);
    });

    it('should reject missing permission (403)', async () => {
      const app = createApp([requirePermission('admin.delete')], {
        serverPermissions: ['control.start', 'control.stop'],
      });

      const res = await supertest(app).get('/test');
      expect(res.status).toBe(403);
      expect(res.body.errors[0].detail).toBe(
        'You do not have permission to perform this action.',
      );
    });

    it('should reject when no permissions are set', async () => {
      const app = createApp([requirePermission('control.start')], {
        serverPermissions: [],
      });

      const res = await supertest(app).get('/test');
      expect(res.status).toBe(403);
    });

    it('should pass when any of multiple required permissions match', async () => {
      const app = createApp([requirePermission('admin.delete', 'control.start')], {
        serverPermissions: ['control.start'],
      });

      const res = await supertest(app).get('/test');
      expect(res.status).toBe(200);
    });

    it('should handle no serverPermissions on request', async () => {
      const app = createApp([requirePermission('control.start')]);

      const res = await supertest(app).get('/test');
      expect(res.status).toBe(403);
    });
  });

  describe('validateServerState', () => {
    it('should pass for normal server', async () => {
      const app = createApp([validateServerState], {
        server: { id: 1, status: null, node: { maintenanceMode: false } },
      });

      const res = await supertest(app).get('/test');
      expect(res.status).toBe(200);
    });

    it('should reject suspended server (409)', async () => {
      const app = createApp([validateServerState], {
        server: { id: 1, status: 'suspended', node: { maintenanceMode: false } },
      });

      const res = await supertest(app).get('/test');
      expect(res.status).toBe(409);
      expect(res.body.errors[0].code).toBe('ServerStateConflictError');
    });

    it('should reject server on node in maintenance (409)', async () => {
      const app = createApp([validateServerState], {
        server: { id: 1, status: null, node: { maintenanceMode: true } },
      });

      const res = await supertest(app).get('/test');
      expect(res.status).toBe(409);
      expect(res.body.errors[0].code).toBe('ServerStateConflictError');
    });

    it('should reject server with restoring_backup status (409)', async () => {
      const app = createApp([validateServerState], {
        server: { id: 1, status: 'restoring_backup', node: { maintenanceMode: false } },
      });

      const res = await supertest(app).get('/test');
      expect(res.status).toBe(409);
    });

    it('should reject when server is not set on request (404)', async () => {
      const app = createApp([validateServerState]);

      const res = await supertest(app).get('/test');
      expect(res.status).toBe(404);
    });

    it('should pass for server with running status', async () => {
      const app = createApp([validateServerState], {
        server: { id: 1, status: 'running', node: { maintenanceMode: false } },
      });

      const res = await supertest(app).get('/test');
      expect(res.status).toBe(200);
    });
  });
});
