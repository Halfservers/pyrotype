import { describe, it, expect, beforeAll } from 'vitest';
import type { TestAgent } from 'supertest';
import { createTestApp, createAuthenticatedAgent, request } from '../helpers/test-app';

describe('Client Server Endpoints', () => {
  let app: ReturnType<typeof createTestApp>;
  let agent: TestAgent;

  beforeAll(async () => {
    app = createTestApp();
    const auth = await createAuthenticatedAgent();
    agent = auth.agent;
  });

  describe('GET /api/client/', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/client/');
      expect(res.status).toBe(401);
    });

    it('should return 200 with server list when authenticated', async () => {
      const res = await agent.get('/api/client/');

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('list');
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta).toHaveProperty('pagination');
      expect(res.body.meta.pagination).toHaveProperty('total');
      expect(res.body.meta.pagination).toHaveProperty('count');
      expect(res.body.meta.pagination).toHaveProperty('per_page');
      expect(res.body.meta.pagination).toHaveProperty('current_page');
      expect(res.body.meta.pagination).toHaveProperty('total_pages');
    });

    it('should return paginated results with correct structure', async () => {
      const res = await agent.get('/api/client/?page=1&per_page=5');

      expect(res.status).toBe(200);
      expect(res.body.meta.pagination.current_page).toBe(1);
      expect(res.body.meta.pagination.per_page).toBe(5);
    });

    it('should filter servers by type=owner', async () => {
      const res = await agent.get('/api/client/?type=owner');

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('list');
      expect(Array.isArray(res.body.data)).toBe(true);
      for (const item of res.body.data) {
        expect(item.attributes.server_owner).toBe(true);
      }
    });

    it('should handle page=2 pagination', async () => {
      const res = await agent.get('/api/client/?page=2&per_page=1');

      expect(res.status).toBe(200);
      expect(res.body.meta.pagination.current_page).toBe(2);
    });

    it('should handle huge page number gracefully (empty data)', async () => {
      const res = await agent.get('/api/client/?page=99999');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should return proper server attributes when data exists', async () => {
      const res = await agent.get('/api/client/');

      expect(res.status).toBe(200);
      if (res.body.data.length > 0) {
        const server = res.body.data[0].attributes;
        expect(server).toHaveProperty('identifier');
        expect(server).toHaveProperty('uuid');
        expect(server).toHaveProperty('name');
        expect(server).toHaveProperty('node');
        expect(server).toHaveProperty('sftp_details');
        expect(server).toHaveProperty('limits');
        expect(server).toHaveProperty('feature_limits');
        expect(server).toHaveProperty('status');
        expect(server).toHaveProperty('is_suspended');
        expect(server).toHaveProperty('is_installing');
        expect(server).toHaveProperty('relationships');
      }
    });

    it('should support filter[*] query parameter', async () => {
      const res = await agent.get('/api/client/?filter[*]=nonexistent_filter_xyz');

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('list');
      expect(res.body.data).toEqual([]);
    });

    it('should handle type=admin for admin users', async () => {
      const res = await agent.get('/api/client/?type=admin');

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('list');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should handle type=admin-all for admin users', async () => {
      const res = await agent.get('/api/client/?type=admin-all');

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('list');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/client/permissions', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/client/permissions');
      expect(res.status).toBe(401);
    });

    it('should return 200 with system permissions schema', async () => {
      const res = await agent.get('/api/client/permissions');

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('system_permissions');
      expect(res.body.attributes).toHaveProperty('permissions');
      const perms = res.body.attributes.permissions;
      expect(perms).toHaveProperty('websocket');
      expect(perms).toHaveProperty('control');
      expect(perms).toHaveProperty('user');
      expect(perms).toHaveProperty('file');
      expect(perms).toHaveProperty('backup');
      expect(perms).toHaveProperty('allocation');
      expect(perms).toHaveProperty('startup');
      expect(perms).toHaveProperty('database');
      expect(perms).toHaveProperty('schedule');
      expect(perms).toHaveProperty('settings');
      expect(perms).toHaveProperty('activity');
    });

    it('should return permissions with keys and descriptions', async () => {
      const res = await agent.get('/api/client/permissions');

      const perms = res.body.attributes.permissions;
      for (const [_key, value] of Object.entries(perms)) {
        const group = value as { description: string; keys: Record<string, string> };
        expect(group).toHaveProperty('description');
        expect(group).toHaveProperty('keys');
        expect(typeof group.description).toBe('string');
        expect(typeof group.keys).toBe('object');
      }
    });
  });

  describe('GET /api/client/version', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/client/version');
      expect(res.status).toBe(401);
    });

    it('should return version info when authenticated', async () => {
      const res = await agent.get('/api/client/version');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('version');
      expect(typeof res.body.version).toBe('string');
    });
  });
});
