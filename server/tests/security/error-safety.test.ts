import { describe, it, expect } from 'vitest';
import { createTestApp, request, createAuthenticatedAgent } from '../helpers/test-app';

const app = createTestApp();

describe('Error Response Safety', () => {
  describe('Error responses never contain stack traces', () => {
    it('500-level errors do not expose stack traces', async () => {
      // Trigger an error by sending invalid JSON
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid json');

      const body = JSON.stringify(res.body);
      expect(body).not.toContain('at ');
      expect(body).not.toMatch(/\w+\.ts:\d+/);
      expect(body).not.toMatch(/\w+\.js:\d+/);
      expect(body).not.toContain('node_modules');
    });

    it('401 errors do not expose stack traces', async () => {
      const res = await request(app).get('/api/client');
      const body = JSON.stringify(res.body);
      expect(body).not.toContain('at ');
      expect(body).not.toMatch(/\w+\.ts:\d+/);
      expect(body).not.toContain('node_modules');
    });

    it('422 validation errors do not expose stack traces', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      const body = JSON.stringify(res.body);
      expect(body).not.toContain('at ');
      expect(body).not.toMatch(/\w+\.ts:\d+/);
    });
  });

  describe('Error responses never contain database details', () => {
    it('login failure does not expose DB internals', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ user: 'admin', password: 'wrongpassword' });

      const body = JSON.stringify(res.body).toLowerCase();
      expect(body).not.toContain('sqlite');
      expect(body).not.toContain('prisma');
      expect(body).not.toContain('database');
      expect(body).not.toContain('select ');
      expect(body).not.toContain('insert ');
      expect(body).not.toContain('table');
    });

    it('invalid query to admin API does not expose DB internals', async () => {
      const res = await request(app)
        .get('/api/application/users')
        .set('Authorization', 'Bearer invalid.key');

      const body = JSON.stringify(res.body).toLowerCase();
      expect(body).not.toContain('sqlite');
      expect(body).not.toContain('prisma');
      expect(body).not.toContain('select ');
    });
  });

  describe('Error responses use consistent format', () => {
    it('401 error has correct format', async () => {
      const res = await request(app).get('/api/client');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('errors');
      expect(res.body.errors).toBeInstanceOf(Array);
      expect(res.body.errors[0]).toHaveProperty('code');
      expect(res.body.errors[0]).toHaveProperty('status');
      expect(res.body.errors[0]).toHaveProperty('detail');
      expect(res.body.errors[0].status).toBe('401');
    });

    it('422 validation error has correct format', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty('errors');
      expect(res.body.errors).toBeInstanceOf(Array);
      expect(res.body.errors[0]).toHaveProperty('code');
      expect(res.body.errors[0]).toHaveProperty('status', '422');
      expect(res.body.errors[0]).toHaveProperty('detail');
    });

    it('unknown routes do not return 200', async () => {
      const res = await request(app).get('/api/nonexistent/endpoint');

      // Express may return 404 (default) or another error status.
      // The key security concern is that unknown routes never succeed.
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).not.toBe(200);
    });

    it('invalid JSON body returns an error status', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"broken": }');

      // Express json parser may return 400 (SyntaxError) or the errorHandler
      // may catch it as 500. Either way, it should never return 200.
      expect(res.status).toBeGreaterThanOrEqual(400);
      // The error response should not leak stack traces
      const body = JSON.stringify(res.body);
      expect(body).not.toContain('node_modules');
    });
  });

  describe('Error details do not leak sensitive information', () => {
    it('wrong password error is generic', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ user: 'admin', password: 'wrongpassword' });

      // Should not reveal whether user exists or password was wrong
      expect(res.body.errors[0].detail).not.toMatch(/password.*wrong/i);
      expect(res.body.errors[0].detail).not.toMatch(/user.*found/i);
    });

    it('nonexistent user error is generic and indistinguishable', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ user: 'totallyinvaliduser', password: 'password' });

      // Same generic error as wrong password (prevents user enumeration)
      expect(res.body.errors[0].detail).toMatch(/credentials/i);
    });
  });
});
