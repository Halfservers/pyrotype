import { describe, it, expect, beforeAll } from 'vitest';
import { createTestApp, request } from '../helpers/test-app';
import { ensureAdminApiKey, ensureNonAdminApiKey, getAdminApiKey } from '../helpers/admin-auth';

const BASE = '/api/application/users';

describe('Admin Users API', () => {
  let app: ReturnType<typeof createTestApp>;
  let apiKey: string;
  let nonAdminKey: string;

  beforeAll(async () => {
    app = createTestApp();
    apiKey = await ensureAdminApiKey();
    nonAdminKey = await ensureNonAdminApiKey();
  });

  // ── Authentication ──────────────────────────────────────────────────────

  describe('Authentication', () => {
    it('should return 401 when no Authorization header is provided', async () => {
      const res = await request(app).get(BASE);
      expect(res.status).toBe(401);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].code).toBe('AuthenticationError');
    });

    it('should return 401 with an invalid API key', async () => {
      const res = await request(app)
        .get(BASE)
        .set('Authorization', 'Bearer invalid.key');
      expect(res.status).toBe(401);
    });

    it('should return 401 with a malformed Authorization header', async () => {
      const res = await request(app)
        .get(BASE)
        .set('Authorization', 'Basic abc123');
      expect(res.status).toBe(401);
    });

    it('should return 403 when API key belongs to a non-admin user', async () => {
      const res = await request(app)
        .get(BASE)
        .set('Authorization', `Bearer ${nonAdminKey}`);
      expect(res.status).toBe(403);
    });
  });

  // ── GET /users (index) ─────────────────────────────────────────────────

  describe('GET /api/application/users', () => {
    it('should return 200 with paginated user list', async () => {
      const res = await request(app)
        .get(BASE)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('list');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.pagination).toBeDefined();
      expect(res.body.meta.pagination).toHaveProperty('total');
      expect(res.body.meta.pagination).toHaveProperty('per_page');
      expect(res.body.meta.pagination).toHaveProperty('current_page');
      expect(res.body.meta.pagination).toHaveProperty('total_pages');
    });

    it('should return users with correct attributes', async () => {
      const res = await request(app)
        .get(BASE)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      const user = res.body.data[0];
      expect(user.object).toBe('user');
      expect(user.attributes).toHaveProperty('id');
      expect(user.attributes).toHaveProperty('uuid');
      expect(user.attributes).toHaveProperty('username');
      expect(user.attributes).toHaveProperty('email');
      expect(user.attributes).toHaveProperty('first_name');
      expect(user.attributes).toHaveProperty('last_name');
      expect(user.attributes).toHaveProperty('language');
      expect(user.attributes).toHaveProperty('root_admin');
      expect(user.attributes).toHaveProperty('2fa_enabled');
      expect(user.attributes).toHaveProperty('created_at');
      expect(user.attributes).toHaveProperty('updated_at');
    });

    it('should support pagination with page and per_page', async () => {
      const res = await request(app)
        .get(`${BASE}?page=1&per_page=1`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      expect(res.body.meta.pagination.per_page).toBe(1);
      expect(res.body.meta.pagination.current_page).toBe(1);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
    });

    it('should support filter[email]', async () => {
      const res = await request(app)
        .get(`${BASE}?filter[email]=admin`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      for (const item of res.body.data) {
        expect(item.attributes.email.toLowerCase()).toContain('admin');
      }
    });

    it('should support filter[username]', async () => {
      const res = await request(app)
        .get(`${BASE}?filter[username]=admin`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should support sort by id ascending', async () => {
      const res = await request(app)
        .get(`${BASE}?sort=id`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.map((u: any) => u.attributes.id);
      for (let i = 1; i < ids.length; i++) {
        expect(ids[i]).toBeGreaterThanOrEqual(ids[i - 1]);
      }
    });

    it('should support sort by id descending', async () => {
      const res = await request(app)
        .get(`${BASE}?sort=-id`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.map((u: any) => u.attributes.id);
      for (let i = 1; i < ids.length; i++) {
        expect(ids[i]).toBeLessThanOrEqual(ids[i - 1]);
      }
    });
  });

  // ── GET /users/:id (view) ──────────────────────────────────────────────

  describe('GET /api/application/users/:id', () => {
    it('should return 200 with user details for a valid id', async () => {
      const res = await request(app)
        .get(`${BASE}/1`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('user');
      expect(res.body.attributes).toBeDefined();
      expect(res.body.attributes.id).toBe(1);
    });

    it('should return 404 for a non-existent user', async () => {
      const res = await request(app)
        .get(`${BASE}/999999`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(404);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].code).toBe('NotFoundError');
    });
  });

  // ── POST /users (store) ────────────────────────────────────────────────

  describe('POST /api/application/users', () => {
    it('should create a user with valid data and return 201', async () => {
      const payload = {
        username: `testcreate_${Date.now()}`,
        email: `testcreate_${Date.now()}@test.local`,
        name_first: 'Test',
        name_last: 'Created',
        password: 'SecurePass123!',
        root_admin: false,
        language: 'en',
      };

      const res = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${apiKey}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.object).toBe('user');
      expect(res.body.attributes.username).toBe(payload.username);
      expect(res.body.attributes.email).toBe(payload.email);
      expect(res.body.attributes.first_name).toBe('Test');
      expect(res.body.attributes.last_name).toBe('Created');
      expect(res.body.attributes.root_admin).toBe(false);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.resource).toContain('/api/application/users/');
    });

    it('should create a user without a password (auto-generated)', async () => {
      const payload = {
        username: `nopass_${Date.now()}`,
        email: `nopass_${Date.now()}@test.local`,
        name_first: 'NoPass',
      };

      const res = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${apiKey}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.attributes.username).toBe(payload.username);
    });

    it('should return 422 when required fields are missing', async () => {
      const res = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({});

      expect(res.status).toBe(422);
      expect(res.body.errors).toBeDefined();
    });

    it('should return 422 when username is missing', async () => {
      const res = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ email: 'test@test.local', name_first: 'Test' });

      expect(res.status).toBe(422);
    });

    it('should return 422 when email is invalid', async () => {
      const res = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ username: 'bademail', email: 'not-an-email', name_first: 'Test' });

      expect(res.status).toBe(422);
    });

    it('should return 422 when password is too short', async () => {
      const res = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({
          username: `shortpw_${Date.now()}`,
          email: `shortpw_${Date.now()}@test.local`,
          name_first: 'Test',
          password: 'short',
        });

      expect(res.status).toBe(422);
    });
  });

  // ── PATCH /users/:id (update) ──────────────────────────────────────────

  describe('PATCH /api/application/users/:id', () => {
    let createdUserId: number;

    beforeAll(async () => {
      const payload = {
        username: `toupdate_${Date.now()}`,
        email: `toupdate_${Date.now()}@test.local`,
        name_first: 'ToUpdate',
      };
      const res = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${apiKey}`)
        .send(payload);
      createdUserId = res.body.attributes.id;
    });

    it('should update user fields and return 200', async () => {
      const res = await request(app)
        .patch(`${BASE}/${createdUserId}`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ name_first: 'Updated', language: 'de' });

      expect(res.status).toBe(200);
      expect(res.body.object).toBe('user');
      expect(res.body.attributes.first_name).toBe('Updated');
      expect(res.body.attributes.language).toBe('de');
    });

    it('should update root_admin status', async () => {
      const res = await request(app)
        .patch(`${BASE}/${createdUserId}`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ root_admin: true });

      expect(res.status).toBe(200);
      expect(res.body.attributes.root_admin).toBe(true);
    });

    it('should return 404 when updating a non-existent user', async () => {
      const res = await request(app)
        .patch(`${BASE}/999999`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ name_first: 'Ghost' });

      expect(res.status).toBe(404);
    });
  });

  // ── DELETE /users/:id ──────────────────────────────────────────────────

  describe('DELETE /api/application/users/:id', () => {
    it('should delete a user and return 204', async () => {
      // Create a user to delete
      const payload = {
        username: `todelete_${Date.now()}`,
        email: `todelete_${Date.now()}@test.local`,
        name_first: 'ToDelete',
      };
      const createRes = await request(app)
        .post(BASE)
        .set('Authorization', `Bearer ${apiKey}`)
        .send(payload);
      const userId = createRes.body.attributes.id;

      const res = await request(app)
        .delete(`${BASE}/${userId}`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(204);

      // Verify user is gone
      const getRes = await request(app)
        .get(`${BASE}/${userId}`)
        .set('Authorization', `Bearer ${apiKey}`);
      expect(getRes.status).toBe(404);
    });

    it('should return 404 when deleting a non-existent user', async () => {
      const res = await request(app)
        .delete(`${BASE}/999999`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(res.status).toBe(404);
    });
  });
});
