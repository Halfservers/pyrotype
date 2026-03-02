import { describe, it, expect, beforeAll } from 'vitest';
import type { TestAgent } from 'supertest';
import { createTestApp, createAuthenticatedAgent, request } from '../helpers/test-app';

describe('Client Account Endpoints', () => {
  let app: ReturnType<typeof createTestApp>;
  let agent: TestAgent;

  beforeAll(async () => {
    app = createTestApp();
    const auth = await createAuthenticatedAgent();
    agent = auth.agent;
  });

  describe('GET /api/client/account', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/client/account');
      expect(res.status).toBe(401);
    });

    it('should return 200 with user details when authenticated', async () => {
      const res = await agent.get('/api/client/account');

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('user');
      expect(res.body.attributes).toBeDefined();

      const attrs = res.body.attributes;
      expect(attrs).toHaveProperty('id');
      expect(attrs).toHaveProperty('uuid');
      expect(attrs.username).toBe('admin');
      expect(attrs.email).toBe('admin@pyrotype.local');
      expect(attrs).toHaveProperty('language');
      expect(attrs).toHaveProperty('root_admin');
      expect(attrs).toHaveProperty('use_totp');
      expect(attrs).toHaveProperty('name_first');
      expect(attrs).toHaveProperty('name_last');
      expect(attrs).toHaveProperty('created_at');
      expect(attrs).toHaveProperty('updated_at');
    });

    it('should not return password hash in response', async () => {
      const res = await agent.get('/api/client/account');

      const body = JSON.stringify(res.body);
      expect(body).not.toContain('password');
      expect(body).not.toContain('$2');
    });
  });

  describe('PUT /api/client/account/email', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await request(app)
        .put('/api/client/account/email')
        .send({ email: 'new@example.com', password: 'password' });
      expect(res.status).toBe(401);
    });

    it('should update email with valid data', async () => {
      const newEmail = `test_email_${Date.now()}@pyrotype.local`;

      const res = await agent
        .put('/api/client/account/email')
        .send({ email: newEmail, password: 'password' });

      expect(res.status).toBe(204);

      // Revert email back
      await agent
        .put('/api/client/account/email')
        .send({ email: 'admin@pyrotype.local', password: 'password' });
    });

    it('should reject when password is missing', async () => {
      const res = await agent
        .put('/api/client/account/email')
        .send({ email: 'new@example.com' });

      expect(res.status).toBe(422);
    });

    it('should reject when email is missing', async () => {
      const res = await agent
        .put('/api/client/account/email')
        .send({ password: 'password' });

      expect(res.status).toBe(422);
    });

    it('should reject when password is wrong', async () => {
      const res = await agent
        .put('/api/client/account/email')
        .send({ email: 'new@example.com', password: 'wrong-password' });

      expect(res.status).toBe(400);
    });

    it('should reject empty body', async () => {
      const res = await agent
        .put('/api/client/account/email')
        .send({});

      expect(res.status).toBe(422);
    });
  });

  describe('PUT /api/client/account/password', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await request(app)
        .put('/api/client/account/password')
        .send({
          current_password: 'password',
          password: 'newpassword123',
          password_confirmation: 'newpassword123',
        });
      expect(res.status).toBe(401);
    });

    it('should update password with valid data and revert', async () => {
      const res = await agent
        .put('/api/client/account/password')
        .send({
          current_password: 'password',
          password: 'newpassword123',
          password_confirmation: 'newpassword123',
        });

      expect(res.status).toBe(204);

      // Revert password back
      await agent
        .put('/api/client/account/password')
        .send({
          current_password: 'newpassword123',
          password: 'password',
          password_confirmation: 'password',
        });
    });

    it('should reject wrong current password', async () => {
      const res = await agent
        .put('/api/client/account/password')
        .send({
          current_password: 'wrong-password',
          password: 'newpassword123',
          password_confirmation: 'newpassword123',
        });

      expect(res.status).toBe(400);
    });

    it('should reject mismatched confirmation', async () => {
      const res = await agent
        .put('/api/client/account/password')
        .send({
          current_password: 'password',
          password: 'newpassword123',
          password_confirmation: 'different-password',
        });

      expect(res.status).toBe(422);
    });

    it('should reject password shorter than 8 characters', async () => {
      const res = await agent
        .put('/api/client/account/password')
        .send({
          current_password: 'password',
          password: 'short',
          password_confirmation: 'short',
        });

      expect(res.status).toBe(422);
    });

    it('should reject missing fields', async () => {
      const res = await agent
        .put('/api/client/account/password')
        .send({ current_password: 'password' });

      expect(res.status).toBe(422);
    });

    it('should reject empty body', async () => {
      const res = await agent
        .put('/api/client/account/password')
        .send({});

      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/client/account/activity', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/client/account/activity');
      expect(res.status).toBe(401);
    });

    it('should return 200 with activity logs', async () => {
      const res = await agent.get('/api/client/account/activity');

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('list');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta).toHaveProperty('pagination');
      expect(res.body.meta.pagination).toHaveProperty('total');
      expect(res.body.meta.pagination).toHaveProperty('count');
      expect(res.body.meta.pagination).toHaveProperty('per_page');
      expect(res.body.meta.pagination).toHaveProperty('current_page');
      expect(res.body.meta.pagination).toHaveProperty('total_pages');
    });

    it('should support pagination parameters', async () => {
      const res = await agent.get('/api/client/account/activity?page=1&per_page=5');

      expect(res.status).toBe(200);
      expect(res.body.meta.pagination.current_page).toBe(1);
      expect(res.body.meta.pagination.per_page).toBe(5);
    });

    it('should support event filter', async () => {
      const res = await agent.get('/api/client/account/activity?filter[event]=auth');

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('list');
    });

    it('should return proper activity log attributes when data exists', async () => {
      const res = await agent.get('/api/client/account/activity');

      if (res.body.data.length > 0) {
        const log = res.body.data[0];
        expect(log.object).toBe('activity_log');
        expect(log.attributes).toHaveProperty('id');
        expect(log.attributes).toHaveProperty('event');
        expect(log.attributes).toHaveProperty('ip');
        expect(log.attributes).toHaveProperty('timestamp');
        expect(log.attributes).toHaveProperty('is_api');
        expect(log.attributes).toHaveProperty('properties');
      }
    });

    it('should handle large page numbers gracefully', async () => {
      const res = await agent.get('/api/client/account/activity?page=99999');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });
});
