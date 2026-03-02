import { describe, it, expect, beforeAll } from 'vitest';
import { createTestApp, request } from '../helpers/test-app';
import { ensureAdminApiKey } from '../helpers/admin-auth';
import { prisma } from '../../src/config/database';
import crypto from 'crypto';

const BASE = '/api/application/nests';

describe('Admin Nests & Eggs API', () => {
  let app: ReturnType<typeof createTestApp>;
  let apiKey: string;
  let testNestId: number;
  let testEggId: number;

  beforeAll(async () => {
    app = createTestApp();
    apiKey = await ensureAdminApiKey();

    // Ensure a nest with an egg exists for testing
    let nest = await prisma.nest.findFirst();
    if (!nest) {
      nest = await prisma.nest.create({
        data: {
          uuid: crypto.randomUUID(),
          author: 'test@pyrotype.local',
          name: 'Test Nest',
          description: 'A test nest for automated tests',
        },
      });
    }
    testNestId = nest.id;

    let egg = await prisma.egg.findFirst({ where: { nestId: testNestId } });
    if (!egg) {
      egg = await prisma.egg.create({
        data: {
          uuid: crypto.randomUUID(),
          nestId: testNestId,
          author: 'test@pyrotype.local',
          name: 'Test Egg',
          description: 'A test egg',
          dockerImages: JSON.stringify({ default: 'ghcr.io/test:latest' }),
          startup: 'java -jar server.jar',
        },
      });
    }
    testEggId = egg.id;
  });

  // ── Authentication ──────────────────────────────────────────────────────

  describe('Authentication', () => {
    it('should return 401 for nests without auth', async () => {
      const res = await request(app).get(BASE);
      expect(res.status).toBe(401);
    });

    it('should return 401 for nest view without auth', async () => {
      const res = await request(app).get(`${BASE}/${testNestId}`);
      expect(res.status).toBe(401);
    });

    it('should return 401 for eggs without auth', async () => {
      const res = await request(app).get(`${BASE}/${testNestId}/eggs`);
      expect(res.status).toBe(401);
    });

    it('should return 401 for egg view without auth', async () => {
      const res = await request(app).get(`${BASE}/${testNestId}/eggs/${testEggId}`);
      expect(res.status).toBe(401);
    });
  });

  // ── GET /nests (index) ─────────────────────────────────────────────────

  describe('GET /api/application/nests', () => {
    it('should return 200 with paginated nest list', async () => {
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

    it('should return nests with correct attributes', async () => {
      const res = await request(app)
        .get(BASE)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const nest = res.body.data[0];
      expect(nest.object).toBe('nest');
      expect(nest.attributes).toHaveProperty('id');
      expect(nest.attributes).toHaveProperty('uuid');
      expect(nest.attributes).toHaveProperty('author');
      expect(nest.attributes).toHaveProperty('name');
      expect(nest.attributes).toHaveProperty('description');
      expect(nest.attributes).toHaveProperty('created_at');
      expect(nest.attributes).toHaveProperty('updated_at');
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get(`${BASE}?page=1&per_page=1`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      expect(res.body.meta.pagination.per_page).toBe(1);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
    });
  });

  // ── GET /nests/:id (view) ──────────────────────────────────────────────

  describe('GET /api/application/nests/:id', () => {
    it('should return 200 with nest details', async () => {
      const res = await request(app)
        .get(`${BASE}/${testNestId}`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('nest');
      expect(res.body.attributes.id).toBe(testNestId);
      expect(res.body.attributes).toHaveProperty('uuid');
      expect(res.body.attributes).toHaveProperty('author');
      expect(res.body.attributes).toHaveProperty('name');
    });

    it('should return 404 for a non-existent nest', async () => {
      const res = await request(app)
        .get(`${BASE}/999999`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(404);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].code).toBe('NotFoundError');
    });
  });

  // ── GET /nests/:id/eggs (egg index) ────────────────────────────────────

  describe('GET /api/application/nests/:id/eggs', () => {
    it('should return 200 with egg list for a valid nest', async () => {
      const res = await request(app)
        .get(`${BASE}/${testNestId}/eggs`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('list');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should return eggs with correct attributes', async () => {
      const res = await request(app)
        .get(`${BASE}/${testNestId}/eggs`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      const egg = res.body.data[0];
      expect(egg.object).toBe('egg');
      expect(egg.attributes).toHaveProperty('id');
      expect(egg.attributes).toHaveProperty('uuid');
      expect(egg.attributes).toHaveProperty('name');
      expect(egg.attributes).toHaveProperty('nest');
      expect(egg.attributes).toHaveProperty('author');
      expect(egg.attributes).toHaveProperty('docker_image');
      expect(egg.attributes).toHaveProperty('docker_images');
      expect(egg.attributes).toHaveProperty('config');
      expect(egg.attributes).toHaveProperty('startup');
      expect(egg.attributes).toHaveProperty('script');
      expect(egg.attributes).toHaveProperty('created_at');
      expect(egg.attributes).toHaveProperty('updated_at');
      expect(egg.attributes.nest).toBe(testNestId);
    });

    it('should return 404 for eggs under a non-existent nest', async () => {
      const res = await request(app)
        .get(`${BASE}/999999/eggs`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(404);
    });

    it('should return empty list for a nest with no eggs', async () => {
      // Create an empty nest
      const emptyNest = await prisma.nest.create({
        data: {
          uuid: crypto.randomUUID(),
          author: 'test@pyrotype.local',
          name: `Empty Nest ${Date.now()}`,
        },
      });

      const res = await request(app)
        .get(`${BASE}/${emptyNest.id}/eggs`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  // ── GET /nests/:id/eggs/:eggId (egg view) ─────────────────────────────

  describe('GET /api/application/nests/:id/eggs/:eggId', () => {
    it('should return 200 with egg details', async () => {
      const res = await request(app)
        .get(`${BASE}/${testNestId}/eggs/${testEggId}`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('egg');
      expect(res.body.attributes.id).toBe(testEggId);
      expect(res.body.attributes.nest).toBe(testNestId);
      expect(res.body.attributes).toHaveProperty('config');
      expect(res.body.attributes.config).toHaveProperty('files');
      expect(res.body.attributes.config).toHaveProperty('startup');
      expect(res.body.attributes.config).toHaveProperty('stop');
      expect(res.body.attributes.config).toHaveProperty('logs');
      expect(res.body.attributes).toHaveProperty('script');
      expect(res.body.attributes.script).toHaveProperty('privileged');
      expect(res.body.attributes.script).toHaveProperty('install');
      expect(res.body.attributes.script).toHaveProperty('entry');
      expect(res.body.attributes.script).toHaveProperty('container');
    });

    it('should return 404 for a non-existent egg', async () => {
      const res = await request(app)
        .get(`${BASE}/${testNestId}/eggs/999999`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(404);
      expect(res.body.errors[0].code).toBe('NotFoundError');
    });

    it('should return 404 for an egg under the wrong nest', async () => {
      // Create a second nest with no eggs -- the testEggId belongs to testNestId
      const otherNest = await prisma.nest.create({
        data: {
          uuid: crypto.randomUUID(),
          author: 'test@pyrotype.local',
          name: `Other Nest ${Date.now()}`,
        },
      });

      const res = await request(app)
        .get(`${BASE}/${otherNest.id}/eggs/${testEggId}`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(404);
    });

    it('should return 404 when nest does not exist', async () => {
      const res = await request(app)
        .get(`${BASE}/999999/eggs/${testEggId}`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(404);
    });
  });
});
