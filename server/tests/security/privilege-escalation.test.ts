import { describe, it, expect, beforeAll } from 'vitest';
import { createTestApp, createAgent } from '../helpers/test-app';
import { prisma } from '../../src/config/database';
import { hashPassword } from '../../src/utils/crypto';

const app = createTestApp();

describe('Privilege Escalation Prevention', () => {
  let nonAdminAgent: ReturnType<typeof createAgent>;

  beforeAll(async () => {
    // Ensure a non-admin user exists
    const existing = await prisma.user.findFirst({ where: { username: 'testregular' } });
    if (!existing) {
      const hashed = await hashPassword('regularpass123');
      await prisma.user.create({
        data: {
          uuid: 'bbbbbbbb-1111-2222-3333-444444444444',
          username: 'testregular',
          email: 'regular@pyrotype.local',
          password: hashed,
          language: 'en',
          rootAdmin: false,
          useTotp: false,
          nameFirst: 'Regular',
          nameLast: 'User',
        },
      });
    }

    // Login as non-admin
    nonAdminAgent = createAgent(app);
    await nonAdminAgent.get('/api/sanctum/csrf-cookie').expect(204);
    await nonAdminAgent
      .post('/api/auth/login')
      .send({ user: 'testregular', password: 'regularpass123' })
      .expect(200);
  });

  describe('Non-admin cannot access admin API endpoints', () => {
    // Admin API requires a Bearer API key from an admin user, not session.
    // A non-admin session should NOT get admin access.
    const adminEndpoints = [
      { method: 'get' as const, path: '/api/application/panel/status' },
      { method: 'get' as const, path: '/api/application/users' },
      { method: 'get' as const, path: '/api/application/users/1' },
      { method: 'get' as const, path: '/api/application/nodes' },
      { method: 'get' as const, path: '/api/application/servers' },
      { method: 'get' as const, path: '/api/application/locations' },
      { method: 'get' as const, path: '/api/application/nests' },
    ];

    for (const { method, path } of adminEndpoints) {
      it(`non-admin session cannot access ${method.toUpperCase()} ${path}`, async () => {
        // Admin routes require API key auth, not session auth.
        // A session-based request (even from admin) should get 401.
        const res = await nonAdminAgent[method](path);
        expect(res.status).toBe(401);
      });
    }
  });

  describe('Non-admin cannot create/modify/delete users via admin API', () => {
    it('cannot create a user via admin API', async () => {
      const res = await nonAdminAgent
        .post('/api/application/users')
        .send({
          username: 'hacked',
          email: 'hacked@test.com',
          password: 'HackedPass123!',
          nameFirst: 'Hack',
          nameLast: 'Er',
          rootAdmin: true,
        });
      expect(res.status).toBe(401);
    });

    it('cannot update a user via admin API', async () => {
      const res = await nonAdminAgent
        .patch('/api/application/users/1')
        .send({ rootAdmin: true });
      expect(res.status).toBe(401);
    });

    it('cannot delete a user via admin API', async () => {
      const res = await nonAdminAgent.delete('/api/application/users/1');
      expect(res.status).toBe(401);
    });
  });

  describe('Non-admin cannot suspend/unsuspend servers via admin API', () => {
    it('cannot suspend a server', async () => {
      const res = await nonAdminAgent.post('/api/application/servers/1/suspend');
      expect(res.status).toBe(401);
    });

    it('cannot unsuspend a server', async () => {
      const res = await nonAdminAgent.post('/api/application/servers/1/unsuspend');
      expect(res.status).toBe(401);
    });

    it('cannot reinstall a server', async () => {
      const res = await nonAdminAgent.post('/api/application/servers/1/reinstall');
      expect(res.status).toBe(401);
    });
  });

  describe('Non-admin cannot manage nodes via admin API', () => {
    it('cannot create a node', async () => {
      const res = await nonAdminAgent
        .post('/api/application/nodes')
        .send({
          name: 'Hacked Node',
          fqdn: 'hacked.local',
          scheme: 'https',
          daemonBase: '/srv/daemon-data',
          daemonSftp: 2022,
          daemonListen: 8080,
          memory: 32768,
          disk: 1048576,
          memoryOverallocate: 0,
          diskOverallocate: 0,
          locationId: 1,
        });
      expect(res.status).toBe(401);
    });

    it('cannot delete a node', async () => {
      const res = await nonAdminAgent.delete('/api/application/nodes/1');
      expect(res.status).toBe(401);
    });
  });

  describe('Non-admin cannot manage locations via admin API', () => {
    it('cannot create a location', async () => {
      const res = await nonAdminAgent
        .post('/api/application/locations')
        .send({ short: 'hack', long: 'Hacked Location' });
      expect(res.status).toBe(401);
    });

    it('cannot delete a location', async () => {
      const res = await nonAdminAgent.delete('/api/application/locations/1');
      expect(res.status).toBe(401);
    });
  });
});
