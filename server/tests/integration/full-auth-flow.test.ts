import { describe, it, expect } from 'vitest';
import { createAgent, createTestApp, createAgent as createNewAgent } from '../helpers/test-app';
import { ADMIN_USER, INVALID_CREDENTIALS } from '../helpers/fixtures';

describe('Full Auth Flow', () => {
  describe('Login -> Access Protected Resource -> Logout -> Verify Denied', () => {
    it('should complete the full authentication lifecycle', async () => {
      const app = createTestApp();
      const agent = createAgent(app);

      // Step 1: Login
      const loginRes = await agent
        .post('/api/auth/login')
        .send(ADMIN_USER);

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.complete).toBe(true);
      expect(loginRes.body.data.user.attributes.username).toBe('admin');

      // Step 2: Access protected resource (client root)
      const protectedRes = await agent.get('/api/client');

      expect(protectedRes.status).toBe(200);

      // Step 3: Logout
      const logoutRes = await agent.post('/api/auth/logout');

      expect(logoutRes.status).toBe(204);

      // Step 4: Verify cannot access protected resource after logout
      const deniedRes = await agent.get('/api/client');

      expect(deniedRes.status).toBe(401);
    });
  });

  describe('CSRF Cookie -> Login -> Get User Details', () => {
    it('should work with CSRF cookie flow', async () => {
      const app = createTestApp();
      const agent = createAgent(app);

      // Step 1: Get CSRF cookie
      const csrfRes = await agent.get('/api/sanctum/csrf-cookie');

      expect(csrfRes.status).toBe(204);

      // Step 2: Login
      const loginRes = await agent
        .post('/api/auth/login')
        .send(ADMIN_USER);

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.complete).toBe(true);

      // Step 3: Access account details (requires auth)
      const accountRes = await agent.get('/api/client/account');

      expect(accountRes.status).toBe(200);
    });
  });

  describe('Failed Login -> Retry with Correct Credentials', () => {
    it('should allow login after failed attempt with wrong password', async () => {
      const app = createTestApp();
      const agent = createAgent(app);

      // Step 1: Fail to login with wrong password
      const failRes = await agent
        .post('/api/auth/login')
        .send(INVALID_CREDENTIALS);

      expect(failRes.status).toBe(422);
      expect(failRes.body.errors).toBeDefined();
      expect(failRes.body.errors[0].detail).toBe('These credentials do not match our records.');

      // Step 2: Retry with correct credentials
      const successRes = await agent
        .post('/api/auth/login')
        .send(ADMIN_USER);

      expect(successRes.status).toBe(200);
      expect(successRes.body.data.complete).toBe(true);

      // Step 3: Verify we can now access protected resources
      const protectedRes = await agent.get('/api/client');

      expect(protectedRes.status).toBe(200);
    });
  });

  describe('Multiple Sessions', () => {
    it('should maintain independent sessions for different agents', async () => {
      // Create authenticated agent on one app instance
      const app1 = createTestApp();
      const agent1 = createAgent(app1);
      await agent1.post('/api/auth/login').send(ADMIN_USER).expect(200);

      // Create unauthenticated agent on another app instance
      const app2 = createTestApp();
      const agent2 = createAgent(app2);

      // Agent1 should be authenticated
      const res1 = await agent1.get('/api/client');
      expect(res1.status).toBe(200);

      // Agent2 should NOT be authenticated
      const res2 = await agent2.get('/api/client');
      expect(res2.status).toBe(401);
    });
  });

  describe('Logout Idempotency', () => {
    it('should handle logout gracefully even without active session', async () => {
      const app = createTestApp();
      const agent = createAgent(app);

      // Logout without ever logging in
      const res = await agent.post('/api/auth/logout');

      // Should not error out
      expect(res.status).toBe(204);
    });

    it('should handle double logout', async () => {
      const app = createTestApp();
      const agent = createAgent(app);
      await agent.post('/api/auth/login').send(ADMIN_USER).expect(200);

      // First logout
      const res1 = await agent.post('/api/auth/logout');
      expect(res1.status).toBe(204);

      // Second logout (session already destroyed)
      const res2 = await agent.post('/api/auth/logout');
      expect(res2.status).toBe(204);
    });
  });
});
