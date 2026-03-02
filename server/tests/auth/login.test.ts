import { describe, it, expect } from 'vitest';
import { createTestApp, createAgent, createAuthenticatedAgent, request } from '../helpers/test-app';
import { ADMIN_USER, INVALID_CREDENTIALS, NONEXISTENT_USER, MALFORMED_INPUTS } from '../helpers/fixtures';

describe('POST /api/auth/login', () => {
  // Each test gets a fresh app to avoid rate limiting (5 req/min per IP per path).

  it('should login with valid credentials and return complete user data', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send(ADMIN_USER);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.complete).toBe(true);
    expect(res.body.data.intended).toBe('/');
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.object).toBe('user');
    expect(res.body.data.user.attributes).toBeDefined();

    const attrs = res.body.data.user.attributes;
    expect(attrs.username).toBe('admin');
    expect(attrs.email).toBe('admin@pyrotype.local');
    expect(attrs.root_admin).toBe(true);
    expect(attrs).toHaveProperty('id');
    expect(attrs).toHaveProperty('uuid');
    expect(attrs).toHaveProperty('language');
    expect(attrs).toHaveProperty('use_totp');
    expect(attrs).toHaveProperty('name_first');
    expect(attrs).toHaveProperty('name_last');
    expect(attrs).toHaveProperty('created_at');
    expect(attrs).toHaveProperty('updated_at');
  });

  it('should login with email instead of username', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ user: 'admin@pyrotype.local', password: 'password' });

    expect(res.status).toBe(200);
    expect(res.body.data.complete).toBe(true);
    expect(res.body.data.user.attributes.username).toBe('admin');
  });

  it('should set session cookie on successful login', async () => {
    const app = createTestApp();
    const agent = createAgent(app);
    const res = await agent
      .post('/api/auth/login')
      .send(ADMIN_USER);

    expect(res.status).toBe(200);
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
    expect(cookieStr).toContain('pyrotype_session');
  });

  it('should reject wrong password with 422', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send(INVALID_CREDENTIALS);

    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].detail).toContain('credentials do not match');
  });

  it('should reject nonexistent user with 422', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send(NONEXISTENT_USER);

    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].detail).toContain('credentials do not match');
  });

  it('should return same error for wrong user and wrong password (no enumeration)', async () => {
    const app = createTestApp();
    const wrongUserRes = await request(app)
      .post('/api/auth/login')
      .send(NONEXISTENT_USER);

    const wrongPassRes = await request(app)
      .post('/api/auth/login')
      .send(INVALID_CREDENTIALS);

    expect(wrongUserRes.status).toBe(wrongPassRes.status);
    expect(wrongUserRes.body.errors[0].detail).toBe(wrongPassRes.body.errors[0].detail);
  });

  it('should reject empty body with 422', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send(MALFORMED_INPUTS.emptyBody);

    expect(res.status).toBe(422);
  });

  it('should reject missing user field with 422', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send(MALFORMED_INPUTS.missingUser);

    expect(res.status).toBe(422);
  });

  it('should reject missing password field with 422', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send(MALFORMED_INPUTS.missingPassword);

    expect(res.status).toBe(422);
  });

  it('should not reflect XSS in response', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send(MALFORMED_INPUTS.xssAttempt);

    const body = JSON.stringify(res.body);
    expect(body).not.toContain('<script>');
    expect(body).not.toContain('alert(1)');
  });

  it('should handle SQL injection attempt safely', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send(MALFORMED_INPUTS.sqlInjection);

    // Should fail with credentials error, not a 500 server error
    expect(res.status).not.toBe(500);
    expect(res.status).toBe(422);
  });

  it('should handle oversized input without crashing', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send(MALFORMED_INPUTS.oversizedInput);

    expect(res.status).not.toBe(500);
  });
});

describe('GET /api/sanctum/csrf-cookie', () => {
  it('should return 204 with no body', async () => {
    const app = createTestApp();
    const res = await request(app)
      .get('/api/sanctum/csrf-cookie');

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
  });
});

describe('POST /api/auth/logout', () => {
  it('should logout authenticated user and return 204', async () => {
    const { agent } = await createAuthenticatedAgent();

    const logoutRes = await agent.post('/api/auth/logout');
    expect(logoutRes.status).toBe(204);
  });

  it('should clear session cookie on logout', async () => {
    const { agent } = await createAuthenticatedAgent();

    const logoutRes = await agent.post('/api/auth/logout');
    expect(logoutRes.status).toBe(204);

    const setCookie = logoutRes.headers['set-cookie'];
    if (setCookie) {
      const cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
      // Cookie should be cleared (expired or empty)
      expect(
        cookieStr.includes('Expires=') ||
        cookieStr.includes('Max-Age=0') ||
        cookieStr.includes('pyrotype_session=;')
      ).toBe(true);
    }
  });

  it('should handle logout when not authenticated (no session)', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/auth/logout');

    // Should not crash - either 204 or a graceful error
    expect(res.status).not.toBe(500);
  });

  it('should invalidate session after logout (cannot access protected resource)', async () => {
    const { agent } = await createAuthenticatedAgent();

    // Logout
    await agent.post('/api/auth/logout');

    // Try to access the client account endpoint (requires auth)
    const protectedRes = await agent.get('/api/client/account');
    // Should be rejected since session is gone
    expect(protectedRes.status).not.toBe(200);
  });
});
