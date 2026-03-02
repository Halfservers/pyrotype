import { describe, it, expect, beforeAll } from 'vitest';
import type { TestAgent } from 'supertest';
import { createTestApp, createAuthenticatedAgent, request } from '../helpers/test-app';

describe('Client API Key Endpoints', () => {
  let app: ReturnType<typeof createTestApp>;
  let agent: TestAgent;

  beforeAll(async () => {
    app = createTestApp();
    const auth = await createAuthenticatedAgent();
    agent = auth.agent;
  });

  describe('GET /api/client/account/api-keys', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/client/account/api-keys');
      expect(res.status).toBe(401);
    });

    it('should return 200 with key list', async () => {
      const res = await agent.get('/api/client/account/api-keys');

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('list');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/client/account/api-keys', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await request(app)
        .post('/api/client/account/api-keys')
        .send({ description: 'Test key' });
      expect(res.status).toBe(401);
    });

    it('should create an API key and return secret token', async () => {
      const res = await agent
        .post('/api/client/account/api-keys')
        .send({ description: 'Test API key' });

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('api_key');
      expect(res.body.attributes).toBeDefined();
      expect(res.body.attributes).toHaveProperty('identifier');
      expect(res.body.attributes).toHaveProperty('description');
      expect(res.body.attributes.description).toBe('Test API key');
      expect(res.body.attributes).toHaveProperty('allowed_ips');
      expect(res.body.attributes).toHaveProperty('created_at');
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta).toHaveProperty('secret_token');
      expect(typeof res.body.meta.secret_token).toBe('string');
      expect(res.body.meta.secret_token.length).toBeGreaterThan(0);
    });

    it('should create API key with allowed_ips', async () => {
      const res = await agent
        .post('/api/client/account/api-keys')
        .send({ description: 'IP-restricted key', allowed_ips: ['127.0.0.1', '10.0.0.1'] });

      expect(res.status).toBe(200);
      expect(res.body.attributes.allowed_ips).toEqual(['127.0.0.1', '10.0.0.1']);
    });

    it('should create API key without description', async () => {
      const res = await agent
        .post('/api/client/account/api-keys')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('api_key');
      expect(res.body.meta).toHaveProperty('secret_token');
    });
  });

  describe('DELETE /api/client/account/api-keys/:identifier', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await request(app).delete('/api/client/account/api-keys/fake-identifier');
      expect(res.status).toBe(401);
    });

    it('should delete an existing API key', async () => {
      // Create a key first
      const createRes = await agent
        .post('/api/client/account/api-keys')
        .send({ description: 'Key to delete' });

      expect(createRes.status).toBe(200);
      const identifier = createRes.body.attributes.identifier;

      // Delete it
      const deleteRes = await agent.delete(`/api/client/account/api-keys/${identifier}`);
      expect(deleteRes.status).toBe(204);

      // Verify it's gone
      const listRes = await agent.get('/api/client/account/api-keys');
      const identifiers = listRes.body.data.map((k: any) => k.attributes.identifier);
      expect(identifiers).not.toContain(identifier);
    });

    it('should return 404 for non-existent identifier', async () => {
      const res = await agent.delete('/api/client/account/api-keys/nonexistent123456');
      expect(res.status).toBe(404);
    });
  });

  describe('API key CRUD lifecycle', () => {
    it('should support full create-list-delete cycle', async () => {
      // List initial keys
      const initialRes = await agent.get('/api/client/account/api-keys');
      expect(initialRes.status).toBe(200);
      const initialCount = initialRes.body.data.length;

      // Create a key
      const createRes = await agent
        .post('/api/client/account/api-keys')
        .send({ description: 'Lifecycle test key' });
      expect(createRes.status).toBe(200);
      const identifier = createRes.body.attributes.identifier;

      // List should have one more
      const afterCreateRes = await agent.get('/api/client/account/api-keys');
      expect(afterCreateRes.body.data.length).toBe(initialCount + 1);

      // Delete the key
      const deleteRes = await agent.delete(`/api/client/account/api-keys/${identifier}`);
      expect(deleteRes.status).toBe(204);

      // List should be back to initial count
      const afterDeleteRes = await agent.get('/api/client/account/api-keys');
      expect(afterDeleteRes.body.data.length).toBe(initialCount);
    });
  });
});
