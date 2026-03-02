import { describe, it, expect, beforeAll } from 'vitest';
import { createTestApp, request } from '../helpers/test-app';
import { ensureAdminApiKey } from '../helpers/admin-auth';

const BASE = '/api/application/locations';

describe('Admin Locations API', () => {
  let app: ReturnType<typeof createTestApp>;
  let apiKey: string;

  beforeAll(async () => {
    app = createTestApp();
    apiKey = await ensureAdminApiKey();
  });

  // ── Authentication ──────────────────────────────────────────────────────

  describe('Authentication', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).get(BASE);
      expect(res.status).toBe(401);
    });
  });

  // ── GET /locations (index) ─────────────────────────────────────────────

  describe('GET /api/application/locations', () => {
    it('should return 200 with paginated location list', async () => {
      const res = await request(app)
        .get(BASE)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('list');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.pagination).toBeDefined();
      expect(res.body.meta.pagination).toHaveProperty('total');
      expect(res.body.meta.pagination).toHaveProperty('per_page');
      expect(res.body.meta.pagination).toHaveProperty('current_page');
      expect(res.body.meta.pagination).toHaveProperty('total_pages');
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get(`${BASE}?page=1&per_page=1`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      expect(res.body.meta.pagination.per_page).toBe(1);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
    });

    it('should support filter[short]', async () => {
      // Create a location with known short
      await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ short: `filtershort_${Date.now()}`, long: 'Filterable Location' });

      const res = await request(app)
        .get(`${BASE}?filter[short]=filtershort`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      for (const item of res.body.data) {
        expect(item.attributes.short.toLowerCase()).toContain('filtershort');
      }
    });
  });

  // ── GET /locations/:id (view) ──────────────────────────────────────────

  describe('GET /api/application/locations/:id', () => {
    let createdId: number;

    beforeAll(async () => {
      const res = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ short: `view_${Date.now()}`, long: 'View Test Location' });
      createdId = res.body.attributes.id;
    });

    it('should return 200 with location details', async () => {
      const res = await request(app)
        .get(`${BASE}/${createdId}`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('location');
      expect(res.body.attributes.id).toBe(createdId);
      expect(res.body.attributes).toHaveProperty('short');
      expect(res.body.attributes).toHaveProperty('long');
      expect(res.body.attributes).toHaveProperty('created_at');
      expect(res.body.attributes).toHaveProperty('updated_at');
    });

    it('should return 404 for a non-existent location', async () => {
      const res = await request(app)
        .get(`${BASE}/999999`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(404);
      expect(res.body.errors[0].code).toBe('NotFoundError');
    });
  });

  // ── POST /locations (store) ────────────────────────────────────────────

  describe('POST /api/application/locations', () => {
    it('should create a location with valid data and return 201', async () => {
      const payload = {
        short: `loc_${Date.now()}`,
        long: 'Test Location Description',
      };

      const res = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${apiKey}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.object).toBe('location');
      expect(res.body.attributes.short).toBe(payload.short);
      expect(res.body.attributes.long).toBe(payload.long);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.resource).toContain('/api/application/locations/');
    });

    it('should create a location without long description', async () => {
      const payload = {
        short: `nolng_${Date.now()}`,
      };

      const res = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${apiKey}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.attributes.short).toBe(payload.short);
    });

    it('should return 422 when short is missing', async () => {
      const res = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({});

      expect(res.status).toBe(422);
    });

    it('should return 422 when short exceeds 60 chars', async () => {
      const res = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ short: 'a'.repeat(61) });

      expect(res.status).toBe(422);
    });
  });

  // ── PATCH /locations/:id (update) ──────────────────────────────────────

  describe('PATCH /api/application/locations/:id', () => {
    let updateId: number;

    beforeAll(async () => {
      const res = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ short: `upd_${Date.now()}`, long: 'Original' });
      updateId = res.body.attributes.id;
    });

    it('should update location fields and return 200', async () => {
      const res = await request(app)
        .patch(`${BASE}/${updateId}`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ long: 'Updated Description' });

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('location');
      expect(res.body.attributes.long).toBe('Updated Description');
    });

    it('should update short name', async () => {
      const newShort = `new_${Date.now()}`;
      const res = await request(app)
        .patch(`${BASE}/${updateId}`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ short: newShort });

      expect(res.status).toBe(200);
      expect(res.body.attributes.short).toBe(newShort);
    });

    it('should return 404 for a non-existent location', async () => {
      const res = await request(app)
        .patch(`${BASE}/999999`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ long: 'Ghost' });

      expect(res.status).toBe(404);
    });
  });

  // ── DELETE /locations/:id ──────────────────────────────────────────────

  describe('DELETE /api/application/locations/:id', () => {
    it('should delete a location without nodes and return 204', async () => {
      const createRes = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ short: `del_${Date.now()}` });
      const locId = createRes.body.attributes.id;

      const res = await request(app)
        .delete(`${BASE}/${locId}`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(204);

      // Verify it's gone
      const getRes = await request(app)
        .get(`${BASE}/${locId}`)
        .set('Authorization', `Bearer ${apiKey}`);
      expect(getRes.status).toBe(404);
    });

    it('should return 404 for a non-existent location', async () => {
      const res = await request(app)
        .delete(`${BASE}/999999`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(404);
    });

    it('should return 409 when deleting a location with nodes attached', async () => {
      // Create a location then attach a node
      const locRes = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ short: `conflict_${Date.now()}` });
      const locId = locRes.body.attributes.id;

      // Create a node attached to this location
      await request(app)
        .post('/api/application/nodes')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({
          name: `conflict-node-${Date.now()}`,
          location_id: locId,
          fqdn: `conflict-${Date.now()}.test.local`,
          scheme: 'https',
          memory: 4096,
          memory_overallocate: 0,
          disk: 131072,
          disk_overallocate: 0,
        });

      const res = await request(app)
        .delete(`${BASE}/${locId}`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(409);
      expect(res.body.errors[0].code).toBe('ConflictError');
    });
  });
});
