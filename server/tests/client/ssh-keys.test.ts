import { describe, it, expect, beforeAll } from 'vitest';
import type { TestAgent } from 'supertest';
import crypto from 'crypto';
import { createTestApp, createAuthenticatedAgent, request } from '../helpers/test-app';

function generateTestSSHKey(seed?: string): string {
  const data = crypto.randomBytes(32).toString('base64');
  return `ssh-rsa ${data} test@pyrotype${seed ? `-${seed}` : ''}`;
}

describe('Client SSH Key Endpoints', () => {
  let app: ReturnType<typeof createTestApp>;
  let agent: TestAgent;

  beforeAll(async () => {
    app = createTestApp();
    const auth = await createAuthenticatedAgent();
    agent = auth.agent;
  });

  describe('GET /api/client/account/ssh-keys', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/client/account/ssh-keys');
      expect(res.status).toBe(401);
    });

    it('should return 200 with SSH key list', async () => {
      const res = await agent.get('/api/client/account/ssh-keys');

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('list');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/client/account/ssh-keys', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await request(app)
        .post('/api/client/account/ssh-keys')
        .send({ name: 'test', public_key: generateTestSSHKey() });
      expect(res.status).toBe(401);
    });

    it('should create an SSH key with valid data', async () => {
      const publicKey = generateTestSSHKey(Date.now().toString());

      const res = await agent
        .post('/api/client/account/ssh-keys')
        .send({ name: 'Test SSH Key', public_key: publicKey });

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('ssh_key');
      expect(res.body.attributes).toBeDefined();
      expect(res.body.attributes.name).toBe('Test SSH Key');
      expect(res.body.attributes).toHaveProperty('fingerprint');
      expect(res.body.attributes.fingerprint).toMatch(/^SHA256:/);
      expect(res.body.attributes).toHaveProperty('public_key');
      expect(res.body.attributes).toHaveProperty('created_at');
    });

    it('should reject when name is missing', async () => {
      const res = await agent
        .post('/api/client/account/ssh-keys')
        .send({ public_key: generateTestSSHKey() });

      expect(res.status).toBe(422);
    });

    it('should reject when public_key is missing', async () => {
      const res = await agent
        .post('/api/client/account/ssh-keys')
        .send({ name: 'Key without public key' });

      expect(res.status).toBe(422);
    });

    it('should reject empty body', async () => {
      const res = await agent
        .post('/api/client/account/ssh-keys')
        .send({});

      expect(res.status).toBe(422);
    });

    it('should reject duplicate SSH key fingerprint', async () => {
      const publicKey = generateTestSSHKey('duplicate-test-' + Date.now());

      // Create first
      const first = await agent
        .post('/api/client/account/ssh-keys')
        .send({ name: 'First Key', public_key: publicKey });
      expect(first.status).toBe(200);

      // Try duplicate
      const duplicate = await agent
        .post('/api/client/account/ssh-keys')
        .send({ name: 'Duplicate Key', public_key: publicKey });

      expect(duplicate.status).toBe(422);
    });
  });

  describe('POST /api/client/account/ssh-keys/remove', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await request(app)
        .post('/api/client/account/ssh-keys/remove')
        .send({ fingerprint: 'SHA256:test' });
      expect(res.status).toBe(401);
    });

    it('should soft-delete an existing SSH key', async () => {
      const publicKey = generateTestSSHKey('delete-test-' + Date.now());

      // Create a key
      const createRes = await agent
        .post('/api/client/account/ssh-keys')
        .send({ name: 'Key To Delete', public_key: publicKey });
      expect(createRes.status).toBe(200);
      const fingerprint = createRes.body.attributes.fingerprint;

      // Delete it
      const deleteRes = await agent
        .post('/api/client/account/ssh-keys/remove')
        .send({ fingerprint });

      expect(deleteRes.status).toBe(204);

      // Verify it's gone from the list
      const listRes = await agent.get('/api/client/account/ssh-keys');
      const fingerprints = listRes.body.data.map((k: any) => k.attributes.fingerprint);
      expect(fingerprints).not.toContain(fingerprint);
    });

    it('should reject when fingerprint is missing', async () => {
      const res = await agent
        .post('/api/client/account/ssh-keys/remove')
        .send({});

      expect(res.status).toBe(422);
    });

    it('should return 204 for non-existent fingerprint (idempotent)', async () => {
      const res = await agent
        .post('/api/client/account/ssh-keys/remove')
        .send({ fingerprint: 'SHA256:nonexistent-fingerprint' });

      expect(res.status).toBe(204);
    });
  });

  describe('SSH key CRUD lifecycle', () => {
    it('should support full create-list-delete cycle', async () => {
      const publicKey = generateTestSSHKey('lifecycle-' + Date.now());

      // List initial keys
      const initialRes = await agent.get('/api/client/account/ssh-keys');
      expect(initialRes.status).toBe(200);
      const initialCount = initialRes.body.data.length;

      // Create
      const createRes = await agent
        .post('/api/client/account/ssh-keys')
        .send({ name: 'Lifecycle Test', public_key: publicKey });
      expect(createRes.status).toBe(200);
      const fingerprint = createRes.body.attributes.fingerprint;

      // List should have one more
      const afterCreateRes = await agent.get('/api/client/account/ssh-keys');
      expect(afterCreateRes.body.data.length).toBe(initialCount + 1);

      // Delete
      const deleteRes = await agent
        .post('/api/client/account/ssh-keys/remove')
        .send({ fingerprint });
      expect(deleteRes.status).toBe(204);

      // List should be back to initial count
      const afterDeleteRes = await agent.get('/api/client/account/ssh-keys');
      expect(afterDeleteRes.body.data.length).toBe(initialCount);
    });
  });
});
