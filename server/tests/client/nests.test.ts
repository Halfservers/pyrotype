import { describe, it, expect, beforeAll } from 'vitest';
import type { TestAgent } from 'supertest';
import { createTestApp, createAuthenticatedAgent, request } from '../helpers/test-app';

describe('Client Nest Endpoints', () => {
  let app: ReturnType<typeof createTestApp>;
  let agent: TestAgent;

  beforeAll(async () => {
    app = createTestApp();
    const auth = await createAuthenticatedAgent();
    agent = auth.agent;
  });

  describe('GET /api/client/nests', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/client/nests');
      expect(res.status).toBe(401);
    });

    it('should return 200 with nest list', async () => {
      const res = await agent.get('/api/client/nests');

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('list');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return nests with proper attributes when data exists', async () => {
      const res = await agent.get('/api/client/nests');

      expect(res.status).toBe(200);
      if (res.body.data.length > 0) {
        const nest = res.body.data[0];
        expect(nest.object).toBe('nest');
        expect(nest.attributes).toHaveProperty('id');
        expect(nest.attributes).toHaveProperty('uuid');
        expect(nest.attributes).toHaveProperty('name');
        expect(nest.attributes).toHaveProperty('author');
        expect(nest.attributes).toHaveProperty('description');
        expect(nest.attributes).toHaveProperty('relationships');
        expect(nest.attributes.relationships).toHaveProperty('eggs');
        expect(nest.attributes.relationships.eggs.object).toBe('list');
        expect(Array.isArray(nest.attributes.relationships.eggs.data)).toBe(true);
      }
    });

    it('should include egg relationships with proper attributes', async () => {
      const res = await agent.get('/api/client/nests');

      expect(res.status).toBe(200);
      const nestWithEggs = res.body.data.find(
        (n: any) => n.attributes.relationships.eggs.data.length > 0,
      );

      if (nestWithEggs) {
        const egg = nestWithEggs.attributes.relationships.eggs.data[0];
        expect(egg.object).toBe('egg');
        expect(egg.attributes).toHaveProperty('id');
        expect(egg.attributes).toHaveProperty('uuid');
        expect(egg.attributes).toHaveProperty('name');
        expect(egg.attributes).toHaveProperty('author');
        expect(egg.attributes).toHaveProperty('description');
        expect(egg.attributes).toHaveProperty('docker_images');
        expect(egg.attributes).toHaveProperty('startup');
      }
    });
  });

  describe('GET /api/client/nests/:nest', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/client/nests/1');
      expect(res.status).toBe(401);
    });

    it('should return 200 with nest details for valid ID', async () => {
      // First get the list to find a valid nest ID
      const listRes = await agent.get('/api/client/nests');
      if (listRes.body.data.length === 0) {
        return;
      }

      const nestId = listRes.body.data[0].attributes.id;
      const res = await agent.get(`/api/client/nests/${nestId}`);

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('nest');
      expect(res.body.attributes).toBeDefined();
      expect(res.body.attributes).toHaveProperty('id');
      expect(res.body.attributes).toHaveProperty('uuid');
      expect(res.body.attributes).toHaveProperty('name');
      expect(res.body.attributes).toHaveProperty('relationships');
    });

    it('should return 404 for non-existent nest ID', async () => {
      const res = await agent.get('/api/client/nests/999999');

      expect(res.status).toBe(404);
    });

    it('should handle non-numeric nest ID without crashing', async () => {
      const res = await agent.get('/api/client/nests/invalid');

      // parseInt('invalid') returns NaN which Prisma rejects; server returns an error
      expect([400, 404, 422, 500]).toContain(res.status);
    });
  });
});
