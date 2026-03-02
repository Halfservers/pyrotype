import { describe, it, expect, beforeAll } from 'vitest';
import { createTestApp, request } from '../helpers/test-app';
import { ensureAdminApiKey } from '../helpers/admin-auth';
import { prisma } from '../../src/config/database';

const BASE = '/api/application/servers';

describe('Admin Servers API', () => {
  let app: ReturnType<typeof createTestApp>;
  let apiKey: string;
  let testServerId: number;
  let testNodeId: number;
  let testAllocationId: number;
  let testNestId: number;
  let testEggId: number;
  let testUserId: number;

  beforeAll(async () => {
    app = createTestApp();
    apiKey = await ensureAdminApiKey();

    // Ensure we have the prerequisite data for creating servers
    const admin = await prisma.user.findFirst({ where: { rootAdmin: true } });
    testUserId = admin!.id;

    // Get or create a location
    let location = await prisma.location.findFirst();
    if (!location) {
      location = await prisma.location.create({ data: { short: 'test-loc' } });
    }

    // Get or create a node
    let node = await prisma.node.findFirst();
    if (!node) {
      const crypto = await import('crypto');
      node = await prisma.node.create({
        data: {
          uuid: crypto.randomUUID(),
          name: 'Test Node',
          locationId: location.id,
          fqdn: 'test.node.local',
          scheme: 'https',
          memory: 32768,
          disk: 1048576,
          daemonTokenId: crypto.randomBytes(8).toString('hex'),
          daemonToken: crypto.randomBytes(32).toString('hex'),
        },
      });
    }
    testNodeId = node.id;

    // Get or create an allocation
    let allocation = await prisma.allocation.findFirst({ where: { serverId: null } });
    if (!allocation) {
      allocation = await prisma.allocation.create({
        data: { nodeId: testNodeId, ip: '127.0.0.1', port: 25565 },
      });
    }
    testAllocationId = allocation.id;

    // Get or create a nest
    let nest = await prisma.nest.findFirst();
    if (!nest) {
      const crypto = await import('crypto');
      nest = await prisma.nest.create({
        data: { uuid: crypto.randomUUID(), author: 'test@test.local', name: 'Test Nest' },
      });
    }
    testNestId = nest.id;

    // Get or create an egg
    let egg = await prisma.egg.findFirst({ where: { nestId: testNestId } });
    if (!egg) {
      const crypto = await import('crypto');
      egg = await prisma.egg.create({
        data: {
          uuid: crypto.randomUUID(),
          nestId: testNestId,
          author: 'test@test.local',
          name: 'Test Egg',
          dockerImages: JSON.stringify({ default: 'ghcr.io/test:latest' }),
        },
      });
    }
    testEggId = egg.id;
  });

  // ── GET /servers (index) ───────────────────────────────────────────────

  describe('GET /api/application/servers', () => {
    it('should return 200 with paginated server list', async () => {
      const res = await request(app)
        .get(BASE)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('list');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.pagination).toBeDefined();
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get(BASE);
      expect(res.status).toBe(401);
    });

    it('should return servers with correct attributes', async () => {
      // Create a server first so we have data
      const allocForCreate = await prisma.allocation.create({
        data: { nodeId: testNodeId, ip: '127.0.0.1', port: 30000 + Math.floor(Math.random() * 10000) },
      });

      await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({
          name: `attr-test-${Date.now()}`,
          owner_id: testUserId,
          node_id: testNodeId,
          allocation_id: allocForCreate.id,
          nest_id: testNestId,
          egg_id: testEggId,
          startup: 'java -jar server.jar',
          image: 'ghcr.io/test:latest',
          memory: 1024,
          swap: 0,
          disk: 5120,
          io: 500,
          cpu: 100,
        });

      const res = await request(app)
        .get(BASE)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      if (res.body.data.length > 0) {
        const server = res.body.data[0];
        expect(server.object).toBe('server');
        expect(server.attributes).toHaveProperty('id');
        expect(server.attributes).toHaveProperty('uuid');
        expect(server.attributes).toHaveProperty('name');
        expect(server.attributes).toHaveProperty('status');
        expect(server.attributes).toHaveProperty('limits');
        expect(server.attributes).toHaveProperty('feature_limits');
        expect(server.attributes).toHaveProperty('user');
        expect(server.attributes).toHaveProperty('node');
        expect(server.attributes).toHaveProperty('allocation');
        expect(server.attributes).toHaveProperty('container');
        expect(server.attributes.limits).toHaveProperty('memory');
        expect(server.attributes.limits).toHaveProperty('disk');
        expect(server.attributes.limits).toHaveProperty('cpu');
      }
    });

    it('should support filter[name]', async () => {
      const res = await request(app)
        .get(`${BASE}?filter[name]=attr-test`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      for (const item of res.body.data) {
        expect(item.attributes.name.toLowerCase()).toContain('attr-test');
      }
    });
  });

  // ── POST /servers (store) ──────────────────────────────────────────────

  describe('POST /api/application/servers', () => {
    it('should create a server with valid data and return 201', async () => {
      const alloc = await prisma.allocation.create({
        data: { nodeId: testNodeId, ip: '127.0.0.1', port: 40000 + Math.floor(Math.random() * 10000) },
      });

      const payload = {
        name: `test-server-${Date.now()}`,
        description: 'Automated test server',
        owner_id: testUserId,
        node_id: testNodeId,
        allocation_id: alloc.id,
        nest_id: testNestId,
        egg_id: testEggId,
        startup: 'java -jar server.jar',
        image: 'ghcr.io/test:latest',
        memory: 1024,
        swap: 0,
        disk: 5120,
        io: 500,
        cpu: 100,
      };

      const res = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${apiKey}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.object).toBe('server');
      expect(res.body.attributes.name).toBe(payload.name);
      expect(res.body.attributes.user).toBe(testUserId);
      expect(res.body.attributes.node).toBe(testNodeId);
      expect(res.body.attributes.limits.memory).toBe(1024);
      expect(res.body.attributes.limits.disk).toBe(5120);

      testServerId = res.body.attributes.id;
    });

    it('should return 422 when required fields are missing', async () => {
      const res = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({});

      expect(res.status).toBe(422);
    });

    it('should return 422 when name is missing', async () => {
      const res = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({
          owner_id: testUserId,
          node_id: testNodeId,
          allocation_id: testAllocationId,
          nest_id: testNestId,
          egg_id: testEggId,
          startup: 'java -jar server.jar',
          image: 'ghcr.io/test:latest',
          memory: 1024,
          swap: 0,
          disk: 5120,
          io: 500,
          cpu: 100,
        });

      expect(res.status).toBe(422);
    });
  });

  // ── GET /servers/:id (view) ────────────────────────────────────────────

  describe('GET /api/application/servers/:id', () => {
    it('should return 200 with server details', async () => {
      if (!testServerId) return;

      const res = await request(app)
        .get(`${BASE}/${testServerId}`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('server');
      expect(res.body.attributes.id).toBe(testServerId);
    });

    it('should return 404 for a non-existent server', async () => {
      const res = await request(app)
        .get(`${BASE}/999999`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(404);
    });
  });

  // ── PATCH /servers/:id/details ─────────────────────────────────────────

  describe('PATCH /api/application/servers/:id/details', () => {
    it('should update server details', async () => {
      if (!testServerId) return;

      const res = await request(app)
        .patch(`${BASE}/${testServerId}/details`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ name: 'Updated Server Name', description: 'Updated description' });

      expect(res.status).toBe(200);
      expect(res.body.attributes.name).toBe('Updated Server Name');
      expect(res.body.attributes.description).toBe('Updated description');
    });

    it('should return 404 when server does not exist', async () => {
      const res = await request(app)
        .patch(`${BASE}/999999/details`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ name: 'Ghost' });

      expect(res.status).toBe(404);
    });
  });

  // ── PATCH /servers/:id/build ───────────────────────────────────────────

  describe('PATCH /api/application/servers/:id/build', () => {
    it('should update server build configuration', async () => {
      if (!testServerId) return;

      const res = await request(app)
        .patch(`${BASE}/${testServerId}/build`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ memory: 2048, cpu: 200, disk: 10240 });

      expect(res.status).toBe(200);
      expect(res.body.attributes.limits.memory).toBe(2048);
      expect(res.body.attributes.limits.cpu).toBe(200);
      expect(res.body.attributes.limits.disk).toBe(10240);
    });

    it('should return 404 for a non-existent server', async () => {
      const res = await request(app)
        .patch(`${BASE}/999999/build`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ memory: 2048 });

      expect(res.status).toBe(404);
    });
  });

  // ── POST /servers/:id/suspend ──────────────────────────────────────────

  describe('POST /api/application/servers/:id/suspend', () => {
    it('should suspend a server and return 204', async () => {
      if (!testServerId) return;

      const res = await request(app)
        .post(`${BASE}/${testServerId}/suspend`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(204);

      // Verify status changed
      const getRes = await request(app)
        .get(`${BASE}/${testServerId}`)
        .set('Authorization', `Bearer ${apiKey}`);
      expect(getRes.body.attributes.status).toBe('suspended');
      expect(getRes.body.attributes.suspended).toBe(true);
    });

    it('should return 404 for a non-existent server', async () => {
      const res = await request(app)
        .post(`${BASE}/999999/suspend`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(404);
    });
  });

  // ── POST /servers/:id/unsuspend ────────────────────────────────────────

  describe('POST /api/application/servers/:id/unsuspend', () => {
    it('should unsuspend a server and return 204', async () => {
      if (!testServerId) return;

      const res = await request(app)
        .post(`${BASE}/${testServerId}/unsuspend`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(204);

      // Verify status changed
      const getRes = await request(app)
        .get(`${BASE}/${testServerId}`)
        .set('Authorization', `Bearer ${apiKey}`);
      expect(getRes.body.attributes.suspended).toBe(false);
    });

    it('should return 404 for a non-existent server', async () => {
      const res = await request(app)
        .post(`${BASE}/999999/unsuspend`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(404);
    });
  });

  // ── POST /servers/:id/reinstall ────────────────────────────────────────

  describe('POST /api/application/servers/:id/reinstall', () => {
    it('should trigger reinstall and return 204', async () => {
      if (!testServerId) return;

      const res = await request(app)
        .post(`${BASE}/${testServerId}/reinstall`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(204);

      // Verify status changed to installing
      const getRes = await request(app)
        .get(`${BASE}/${testServerId}`)
        .set('Authorization', `Bearer ${apiKey}`);
      expect(getRes.body.attributes.status).toBe('installing');
    });

    it('should return 404 for a non-existent server', async () => {
      const res = await request(app)
        .post(`${BASE}/999999/reinstall`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(404);
    });
  });

  // ── DELETE /servers/:id ────────────────────────────────────────────────

  describe('DELETE /api/application/servers/:id', () => {
    it('should delete a server and return 204', async () => {
      // Create a server to delete
      const alloc = await prisma.allocation.create({
        data: { nodeId: testNodeId, ip: '127.0.0.1', port: 50000 + Math.floor(Math.random() * 10000) },
      });

      const createRes = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({
          name: `to-delete-${Date.now()}`,
          owner_id: testUserId,
          node_id: testNodeId,
          allocation_id: alloc.id,
          nest_id: testNestId,
          egg_id: testEggId,
          startup: 'java -jar server.jar',
          image: 'ghcr.io/test:latest',
          memory: 512,
          swap: 0,
          disk: 1024,
          io: 500,
          cpu: 50,
        });

      const serverId = createRes.body.attributes.id;

      const res = await request(app)
        .delete(`${BASE}/${serverId}`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(204);

      // Verify it's gone
      const getRes = await request(app)
        .get(`${BASE}/${serverId}`)
        .set('Authorization', `Bearer ${apiKey}`);
      expect(getRes.status).toBe(404);
    });

    it('should support force delete', async () => {
      const alloc = await prisma.allocation.create({
        data: { nodeId: testNodeId, ip: '127.0.0.1', port: 50000 + Math.floor(Math.random() * 10000) },
      });

      const createRes = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({
          name: `force-delete-${Date.now()}`,
          owner_id: testUserId,
          node_id: testNodeId,
          allocation_id: alloc.id,
          nest_id: testNestId,
          egg_id: testEggId,
          startup: 'java -jar server.jar',
          image: 'ghcr.io/test:latest',
          memory: 512,
          swap: 0,
          disk: 1024,
          io: 500,
          cpu: 50,
        });

      const serverId = createRes.body.attributes.id;

      const res = await request(app)
        .delete(`${BASE}/${serverId}/force`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(204);
    });

    it('should return 404 for a non-existent server', async () => {
      const res = await request(app)
        .delete(`${BASE}/999999`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(404);
    });
  });
});
