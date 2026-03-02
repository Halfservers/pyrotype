import { describe, it, expect, beforeAll } from 'vitest';
import { createTestApp, request } from '../helpers/test-app';
import { ensureAdminApiKey } from '../helpers/admin-auth';
import { prisma } from '../../src/config/database';

const BASE = '/api/application/nodes';

describe('Admin Nodes API', () => {
  let app: ReturnType<typeof createTestApp>;
  let apiKey: string;
  let testLocationId: number;

  beforeAll(async () => {
    app = createTestApp();
    apiKey = await ensureAdminApiKey();

    // Ensure a location exists for node creation
    let location = await prisma.location.findFirst();
    if (!location) {
      location = await prisma.location.create({ data: { short: 'node-test-loc' } });
    }
    testLocationId = location.id;
  });

  // ── Authentication ──────────────────────────────────────────────────────

  describe('Authentication', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).get(BASE);
      expect(res.status).toBe(401);
    });
  });

  // ── GET /nodes (index) ─────────────────────────────────────────────────

  describe('GET /api/application/nodes', () => {
    it('should return 200 with paginated node list', async () => {
      const res = await request(app)
        .get(BASE)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('list');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.pagination).toBeDefined();
    });

    it('should return nodes with correct attributes', async () => {
      const res = await request(app)
        .get(BASE)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      if (res.body.data.length > 0) {
        const node = res.body.data[0];
        expect(node.object).toBe('node');
        expect(node.attributes).toHaveProperty('id');
        expect(node.attributes).toHaveProperty('uuid');
        expect(node.attributes).toHaveProperty('name');
        expect(node.attributes).toHaveProperty('fqdn');
        expect(node.attributes).toHaveProperty('scheme');
        expect(node.attributes).toHaveProperty('memory');
        expect(node.attributes).toHaveProperty('disk');
        expect(node.attributes).toHaveProperty('location_id');
        expect(node.attributes).toHaveProperty('daemon_listen');
        expect(node.attributes).toHaveProperty('daemon_sftp');
        expect(node.attributes).toHaveProperty('daemon_base');
        expect(node.attributes).toHaveProperty('created_at');
        expect(node.attributes).toHaveProperty('updated_at');
      }
    });

    it('should support filter[name]', async () => {
      const res = await request(app)
        .get(`${BASE}?filter[name]=Test`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
    });

    it('should support sort by memory', async () => {
      const res = await request(app)
        .get(`${BASE}?sort=memory`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
    });
  });

  // ── GET /nodes/:id (view) ──────────────────────────────────────────────

  describe('GET /api/application/nodes/:id', () => {
    it('should return 404 for a non-existent node', async () => {
      const res = await request(app)
        .get(`${BASE}/999999`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(404);
      expect(res.body.errors[0].code).toBe('NotFoundError');
    });
  });

  // ── POST /nodes (store) ────────────────────────────────────────────────

  describe('POST /api/application/nodes', () => {
    it('should create a node with valid data and return 201', async () => {
      const payload = {
        name: `test-node-${Date.now()}`,
        location_id: testLocationId,
        fqdn: `node-${Date.now()}.test.local`,
        scheme: 'https',
        memory: 16384,
        memory_overallocate: 0,
        disk: 524288,
        disk_overallocate: 0,
      };

      const res = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${apiKey}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.object).toBe('node');
      expect(res.body.attributes.name).toBe(payload.name);
      expect(res.body.attributes.fqdn).toBe(payload.fqdn);
      expect(res.body.attributes.memory).toBe(16384);
      expect(res.body.attributes.disk).toBe(524288);
      expect(res.body.attributes.location_id).toBe(testLocationId);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.resource).toContain('/api/application/nodes/');
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
          location_id: testLocationId,
          fqdn: 'test.local',
          scheme: 'https',
          memory: 1024,
          memory_overallocate: 0,
          disk: 1024,
          disk_overallocate: 0,
        });

      expect(res.status).toBe(422);
    });

    it('should return 422 when memory is less than 1', async () => {
      const res = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({
          name: 'bad-memory-node',
          location_id: testLocationId,
          fqdn: 'test.local',
          scheme: 'https',
          memory: 0,
          memory_overallocate: 0,
          disk: 1024,
          disk_overallocate: 0,
        });

      expect(res.status).toBe(422);
    });
  });

  // ── PATCH /nodes/:id (update) ──────────────────────────────────────────

  describe('PATCH /api/application/nodes/:id', () => {
    let createdNodeId: number;

    beforeAll(async () => {
      const payload = {
        name: `update-node-${Date.now()}`,
        location_id: testLocationId,
        fqdn: `upd-node-${Date.now()}.test.local`,
        scheme: 'https',
        memory: 8192,
        memory_overallocate: 0,
        disk: 262144,
        disk_overallocate: 0,
      };

      const res = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${apiKey}`)
        .send(payload);
      createdNodeId = res.body.attributes.id;
    });

    it('should update node fields and return 200', async () => {
      const res = await request(app)
        .patch(`${BASE}/${createdNodeId}`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ name: 'Updated Node Name', memory: 32768 });

      expect(res.status).toBe(200);
      expect(res.body.attributes.name).toBe('Updated Node Name');
      expect(res.body.attributes.memory).toBe(32768);
    });

    it('should update maintenance_mode', async () => {
      const res = await request(app)
        .patch(`${BASE}/${createdNodeId}`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ maintenance_mode: true });

      expect(res.status).toBe(200);
      expect(res.body.attributes.maintenance_mode).toBe(true);
    });

    it('should return 404 for a non-existent node', async () => {
      const res = await request(app)
        .patch(`${BASE}/999999`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ name: 'Ghost' });

      expect(res.status).toBe(404);
    });
  });

  // ── DELETE /nodes/:id ──────────────────────────────────────────────────

  describe('DELETE /api/application/nodes/:id', () => {
    it('should delete a node without servers and return 204', async () => {
      const payload = {
        name: `delete-node-${Date.now()}`,
        location_id: testLocationId,
        fqdn: `del-node-${Date.now()}.test.local`,
        scheme: 'https',
        memory: 4096,
        memory_overallocate: 0,
        disk: 131072,
        disk_overallocate: 0,
      };

      const createRes = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${apiKey}`)
        .send(payload);
      const nodeId = createRes.body.attributes.id;

      const res = await request(app)
        .delete(`${BASE}/${nodeId}`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(204);

      // Verify it's gone
      const getRes = await request(app)
        .get(`${BASE}/${nodeId}`)
        .set('Authorization', `Bearer ${apiKey}`);
      expect(getRes.status).toBe(404);
    });

    it('should return 404 for a non-existent node', async () => {
      const res = await request(app)
        .delete(`${BASE}/999999`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(404);
    });
  });

  // ── Allocations (/nodes/:id/allocations) ───────────────────────────────

  describe('Node Allocations', () => {
    let allocNodeId: number;

    beforeAll(async () => {
      const payload = {
        name: `alloc-node-${Date.now()}`,
        location_id: testLocationId,
        fqdn: `alloc-node-${Date.now()}.test.local`,
        scheme: 'https',
        memory: 4096,
        memory_overallocate: 0,
        disk: 131072,
        disk_overallocate: 0,
      };
      const res = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${apiKey}`)
        .send(payload);
      allocNodeId = res.body.attributes.id;
    });

    describe('GET /api/application/nodes/:id/allocations', () => {
      it('should return 200 with paginated allocation list', async () => {
        const res = await request(app)
          .get(`${BASE}/${allocNodeId}/allocations`)
          .set('Authorization', `Bearer ${apiKey}`);

        expect(res.status).toBe(200);
        expect(res.body.object).toBe('list');
        expect(res.body.meta.pagination).toBeDefined();
      });

      it('should return 404 for a non-existent node', async () => {
        const res = await request(app)
          .get(`${BASE}/999999/allocations`)
          .set('Authorization', `Bearer ${apiKey}`);

        expect(res.status).toBe(404);
      });
    });

    describe('POST /api/application/nodes/:id/allocations', () => {
      it('should create allocations and return 204', async () => {
        const res = await request(app)
          .post(`${BASE}/${allocNodeId}/allocations`)
          .set('Authorization', `Bearer ${apiKey}`)
          .send({ ip: '10.0.0.1', ports: ['25565'] });

        expect(res.status).toBe(204);

        // Verify allocation was created
        const listRes = await request(app)
          .get(`${BASE}/${allocNodeId}/allocations`)
          .set('Authorization', `Bearer ${apiKey}`);
        expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
      });

      it('should create allocations from a port range', async () => {
        const res = await request(app)
          .post(`${BASE}/${allocNodeId}/allocations`)
          .set('Authorization', `Bearer ${apiKey}`)
          .send({ ip: '10.0.0.2', ports: ['8000-8005'] });

        expect(res.status).toBe(204);
      });

      it('should return 404 for a non-existent node', async () => {
        const res = await request(app)
          .post(`${BASE}/999999/allocations`)
          .set('Authorization', `Bearer ${apiKey}`)
          .send({ ip: '10.0.0.1', ports: ['25565'] });

        expect(res.status).toBe(404);
      });
    });

    describe('DELETE /api/application/nodes/:id/allocations/:allocationId', () => {
      it('should delete an unassigned allocation and return 204', async () => {
        // Create an allocation directly to ensure it exists
        const alloc = await prisma.allocation.create({
          data: { nodeId: allocNodeId, ip: '10.0.0.99', port: 9999 },
        });

        const res = await request(app)
          .delete(`${BASE}/${allocNodeId}/allocations/${alloc.id}`)
          .set('Authorization', `Bearer ${apiKey}`);

        expect(res.status).toBe(204);
      });

      it('should return 404 for a non-existent allocation', async () => {
        const res = await request(app)
          .delete(`${BASE}/${allocNodeId}/allocations/999999`)
          .set('Authorization', `Bearer ${apiKey}`);

        expect(res.status).toBe(404);
      });
    });
  });
});
