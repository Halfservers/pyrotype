import { describe, it, expect } from 'vitest';
import { createTestApp, request, createAgent } from '../helpers/test-app';

const app = createTestApp();

describe('Authentication Bypass Prevention', () => {
  describe('Protected client endpoints require authentication', () => {
    const protectedClientEndpoints = [
      { method: 'get' as const, path: '/api/client' },
      { method: 'get' as const, path: '/api/client/permissions' },
      { method: 'get' as const, path: '/api/client/version' },
      { method: 'get' as const, path: '/api/client/nests' },
      { method: 'get' as const, path: '/api/client/servers/abc-123' },
    ];

    for (const { method, path } of protectedClientEndpoints) {
      it(`${method.toUpperCase()} ${path} returns 401 without auth`, async () => {
        const res = await request(app)[method](path);
        expect(res.status).toBe(401);
        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].code).toBe('AuthenticationError');
      });
    }
  });

  describe('Protected account endpoints require authentication', () => {
    const protectedAccountEndpoints = [
      { method: 'get' as const, path: '/api/client/account' },
      { method: 'put' as const, path: '/api/client/account/email' },
      { method: 'put' as const, path: '/api/client/account/password' },
      { method: 'get' as const, path: '/api/client/account/api-keys' },
      { method: 'get' as const, path: '/api/client/account/ssh-keys' },
      { method: 'get' as const, path: '/api/client/account/activity' },
    ];

    for (const { method, path } of protectedAccountEndpoints) {
      it(`${method.toUpperCase()} ${path} returns 401 without auth`, async () => {
        const res = await request(app)[method](path);
        expect(res.status).toBe(401);
        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].code).toBe('AuthenticationError');
      });
    }
  });

  describe('Admin API endpoints require API key', () => {
    const adminEndpoints = [
      { method: 'get' as const, path: '/api/application/panel/status' },
      { method: 'get' as const, path: '/api/application/users' },
      { method: 'get' as const, path: '/api/application/nodes' },
      { method: 'get' as const, path: '/api/application/servers' },
      { method: 'get' as const, path: '/api/application/locations' },
      { method: 'get' as const, path: '/api/application/nests' },
    ];

    for (const { method, path } of adminEndpoints) {
      it(`${method.toUpperCase()} ${path} returns 401 without Bearer token`, async () => {
        const res = await request(app)[method](path);
        expect(res.status).toBe(401);
        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].code).toBe('AuthenticationError');
      });
    }
  });

  describe('Invalid session cookie does not grant access', () => {
    it('rejects forged session cookie', async () => {
      const res = await request(app)
        .get('/api/client')
        .set('Cookie', 'pyrotype_session=s%3Aforged-session-value.invalid-signature');
      expect(res.status).toBe(401);
    });

    it('rejects empty session cookie', async () => {
      const res = await request(app)
        .get('/api/client')
        .set('Cookie', 'pyrotype_session=');
      expect(res.status).toBe(401);
    });

    it('rejects random string as session cookie', async () => {
      const res = await request(app)
        .get('/api/client')
        .set('Cookie', 'pyrotype_session=randomgarbage12345');
      expect(res.status).toBe(401);
    });
  });

  describe('Invalid Bearer tokens rejected', () => {
    it('rejects empty Bearer token', async () => {
      const res = await request(app)
        .get('/api/application/users')
        .set('Authorization', 'Bearer ');
      expect(res.status).toBe(401);
    });

    it('rejects Bearer token without dot separator', async () => {
      const res = await request(app)
        .get('/api/application/users')
        .set('Authorization', 'Bearer nodot');
      expect(res.status).toBe(401);
    });

    it('rejects Bearer token with invalid identifier', async () => {
      const res = await request(app)
        .get('/api/application/users')
        .set('Authorization', 'Bearer fakeidentifier.faketoken');
      expect(res.status).toBe(401);
    });

    it('rejects missing Authorization header on admin routes', async () => {
      const res = await request(app)
        .get('/api/application/users');
      expect(res.status).toBe(401);
      expect(res.body.errors[0].detail).toMatch(/Authorization/i);
    });

    it('rejects non-Bearer auth scheme', async () => {
      const res = await request(app)
        .get('/api/application/users')
        .set('Authorization', 'Basic dXNlcjpwYXNz');
      expect(res.status).toBe(401);
    });

    it('rejects Bearer token with only dots', async () => {
      const res = await request(app)
        .get('/api/application/users')
        .set('Authorization', 'Bearer ...');
      expect(res.status).toBe(401);
    });

    it('rejects Bearer with just a dot', async () => {
      const res = await request(app)
        .get('/api/application/users')
        .set('Authorization', 'Bearer .');
      expect(res.status).toBe(401);
    });
  });

  describe('Authenticated session does not work after logout', () => {
    it('cannot access protected routes after logging out', async () => {
      const agent = createAgent(app);

      // Get CSRF cookie
      await agent.get('/api/sanctum/csrf-cookie').expect(204);

      // Login
      await agent
        .post('/api/auth/login')
        .send({ user: 'admin', password: 'password' })
        .expect(200);

      // Verify access works
      const authedRes = await agent.get('/api/client');
      expect(authedRes.status).toBe(200);

      // Logout
      await agent.post('/api/auth/logout').expect(204);

      // Verify access is revoked
      const loggedOutRes = await agent.get('/api/client');
      expect(loggedOutRes.status).toBe(401);
    });
  });
});
