import { describe, it, expect, beforeAll } from 'vitest';
import { createTestApp, createAgent, request } from '../helpers/test-app';

describe('POST /api/auth/login/checkpoint', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeAll(() => {
    app = createTestApp();
  });

  it('should reject checkpoint without pending auth session', async () => {
    const res = await request(app)
      .post('/api/auth/login/checkpoint')
      .send({
        confirmation_token: 'some-token',
        authentication_code: '123456',
      });

    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].detail).toContain('authentication token');
  });

  it('should reject checkpoint with no body', async () => {
    const res = await request(app)
      .post('/api/auth/login/checkpoint')
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
  });

  it('should reject checkpoint with invalid confirmation token on fresh session', async () => {
    const agent = createAgent(app);

    // Try checkpoint without first logging in (no pending auth)
    const res = await agent
      .post('/api/auth/login/checkpoint')
      .send({
        confirmation_token: 'invalid-token',
        authentication_code: '123456',
      });

    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
  });

  it('should reject checkpoint with missing confirmation_token field', async () => {
    const res = await request(app)
      .post('/api/auth/login/checkpoint')
      .send({
        authentication_code: '123456',
      });

    expect(res.status).toBe(422);
  });

  it('should reject checkpoint with missing authentication_code field', async () => {
    const res = await request(app)
      .post('/api/auth/login/checkpoint')
      .send({
        confirmation_token: 'some-token',
      });

    expect(res.status).toBe(422);
  });

  it('should not leak user information on invalid checkpoint attempts', async () => {
    const res = await request(app)
      .post('/api/auth/login/checkpoint')
      .send({
        confirmation_token: 'invalid',
        authentication_code: '000000',
      });

    expect(res.status).toBe(422);
    const body = JSON.stringify(res.body);
    // Should not contain user details
    expect(body).not.toContain('admin@pyrotype.local');
    expect(body).not.toContain('"password"');
  });
});
