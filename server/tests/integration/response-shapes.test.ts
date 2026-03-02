import { describe, it, expect, beforeAll } from 'vitest';
import { request, createTestApp, createAgent } from '../helpers/test-app';
import { ADMIN_USER, INVALID_CREDENTIALS, NONEXISTENT_USER, MALFORMED_INPUTS } from '../helpers/fixtures';
import type supertest from 'supertest';

describe('Response Shapes', () => {
  // Shared authenticated agent to avoid hitting rate limits on /api/auth/login
  let authedAgent: supertest.SuperAgentTest;

  beforeAll(async () => {
    const app = createTestApp();
    authedAgent = createAgent(app);
    await authedAgent.get('/api/sanctum/csrf-cookie');
    await authedAgent.post('/api/auth/login').send(ADMIN_USER).expect(200);
  });

  describe('Error Response Format', () => {
    function expectErrorShape(body: any) {
      expect(body).toHaveProperty('errors');
      expect(Array.isArray(body.errors)).toBe(true);
      expect(body.errors.length).toBeGreaterThan(0);
      for (const error of body.errors) {
        expect(error).toHaveProperty('code');
        expect(error).toHaveProperty('status');
        expect(error).toHaveProperty('detail');
        expect(typeof error.code).toBe('string');
        expect(typeof error.status).toBe('string');
        expect(typeof error.detail).toBe('string');
      }
    }

    it('should return error format for invalid login credentials', async () => {
      const res = await request()
        .post('/api/auth/login')
        .send(INVALID_CREDENTIALS);

      expect(res.status).toBe(422);
      expectErrorShape(res.body);
    });

    it('should return error format for nonexistent user login', async () => {
      const res = await request()
        .post('/api/auth/login')
        .send(NONEXISTENT_USER);

      expect(res.status).toBe(422);
      expectErrorShape(res.body);
    });

    it('should return error format for missing credentials', async () => {
      const res = await request()
        .post('/api/auth/login')
        .send(MALFORMED_INPUTS.emptyBody);

      expect(res.status).toBe(422);
      expectErrorShape(res.body);
    });

    it('should return error format for missing user field', async () => {
      const res = await request()
        .post('/api/auth/login')
        .send(MALFORMED_INPUTS.missingUser);

      expect(res.status).toBe(422);
      expectErrorShape(res.body);
    });

    it('should return error format for missing password field', async () => {
      const res = await request()
        .post('/api/auth/login')
        .send(MALFORMED_INPUTS.missingPassword);

      expect(res.status).toBe(422);
      expectErrorShape(res.body);
    });

    it('should return error format for unauthenticated access to protected routes', async () => {
      const res = await request().get('/api/client');

      expect(res.status).toBe(401);
      expectErrorShape(res.body);
    });

    it('should return error format for unauthenticated account access', async () => {
      const res = await request().get('/api/client/account');

      expect(res.status).toBe(401);
      expectErrorShape(res.body);
    });
  });

  describe('Login Success Response Shape', () => {
    it('should return proper data shape on successful login', async () => {
      // Use a fresh app to avoid rate limiting
      const app = createTestApp();
      const res = await request(app)
        .post('/api/auth/login')
        .send(ADMIN_USER);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('complete');
      expect(res.body.data).toHaveProperty('intended');
      expect(res.body.data).toHaveProperty('user');
      expect(typeof res.body.data.complete).toBe('boolean');
      expect(typeof res.body.data.intended).toBe('string');

      // User object shape
      const user = res.body.data.user;
      expect(user).toHaveProperty('object', 'user');
      expect(user).toHaveProperty('attributes');
      expect(user.attributes).toHaveProperty('id');
      expect(user.attributes).toHaveProperty('uuid');
      expect(user.attributes).toHaveProperty('username');
      expect(user.attributes).toHaveProperty('email');
      expect(user.attributes).toHaveProperty('language');
      expect(user.attributes).toHaveProperty('root_admin');
      expect(user.attributes).toHaveProperty('use_totp');
      expect(user.attributes).toHaveProperty('name_first');
      expect(user.attributes).toHaveProperty('name_last');
      expect(user.attributes).toHaveProperty('created_at');
      expect(user.attributes).toHaveProperty('updated_at');
    });

    it('should return complete=true and intended=/ for non-2FA user', async () => {
      const app = createTestApp();
      const res = await request(app)
        .post('/api/auth/login')
        .send(ADMIN_USER);

      expect(res.body.data.complete).toBe(true);
      expect(res.body.data.intended).toBe('/');
    });
  });

  describe('Client Server List Pagination Structure', () => {
    it('should return proper paginated list structure', async () => {
      const res = await authedAgent.get('/api/client');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('object', 'list');
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta).toHaveProperty('pagination');

      const pagination = res.body.meta.pagination;
      expect(pagination).toHaveProperty('total');
      expect(pagination).toHaveProperty('count');
      expect(pagination).toHaveProperty('per_page');
      expect(pagination).toHaveProperty('current_page');
      expect(pagination).toHaveProperty('total_pages');
      expect(pagination).toHaveProperty('links');

      expect(typeof pagination.total).toBe('number');
      expect(typeof pagination.count).toBe('number');
      expect(typeof pagination.per_page).toBe('number');
      expect(typeof pagination.current_page).toBe('number');
      expect(typeof pagination.total_pages).toBe('number');
    });

    it('should have correct pagination defaults', async () => {
      const res = await authedAgent.get('/api/client');

      const pagination = res.body.meta.pagination;
      expect(pagination.current_page).toBe(1);
      expect(pagination.per_page).toBe(50);
    });

    it('should accept custom per_page parameter', async () => {
      const res = await authedAgent.get('/api/client?per_page=10');

      expect(res.status).toBe(200);
      expect(res.body.meta.pagination.per_page).toBe(10);
    });
  });

  describe('CSRF Cookie Endpoint Response', () => {
    it('should return 204 with empty body', async () => {
      const res = await request().get('/api/sanctum/csrf-cookie');

      expect(res.status).toBe(204);
      expect(res.text).toBeFalsy();
    });
  });

  describe('Client Permissions Response Shape', () => {
    it('should return system_permissions object', async () => {
      const res = await authedAgent.get('/api/client/permissions');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('object', 'system_permissions');
      expect(res.body).toHaveProperty('attributes');
      expect(res.body.attributes).toHaveProperty('permissions');
    });
  });

  describe('Fractal Item Wrapper', () => {
    it('should wrap individual server items with object and attributes', async () => {
      const listRes = await authedAgent.get('/api/client');

      if (listRes.body.data.length > 0) {
        const item = listRes.body.data[0];
        expect(item).toHaveProperty('object', 'server');
        expect(item).toHaveProperty('attributes');
        expect(item.attributes).toHaveProperty('identifier');
        expect(item.attributes).toHaveProperty('uuid');
        expect(item.attributes).toHaveProperty('name');
      }
    });
  });
});
