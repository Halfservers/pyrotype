import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createTestHono,
  createMockPrisma,
  jsonRequest,
  MOCK_ADMIN,
  MOCK_USER,
} from '../helpers/test-app'
import { onError } from '../../src/middleware/errorHandler'
import { AppError, AuthenticationError, ValidationError } from '../../src/utils/errors'

vi.mock('../../src/config/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a Hono app simulating the auth flow with mock controllers.
 * We use a simple token-based approach to track authentication state
 * within a single test, since Hono's app.request() does not maintain
 * cookies across calls like supertest agents do.
 */
function buildAuthFlowApp() {
  const prisma = createMockPrisma()
  const ctx = createTestHono({ prisma })
  ctx.app.onError(onError)

  // Simple in-memory session store for the test
  const sessions = new Map<string, { userId: number; username: string }>()

  // Login endpoint
  ctx.app.post('/api/auth/login', async (c) => {
    const body = await c.req.json()
    if (!body.user || !body.password) {
      throw new ValidationError('user and password are required')
    }
    if (body.password !== 'correct-password') {
      throw new ValidationError('These credentials do not match our records.')
    }

    const sessionId = `session-${Date.now()}-${Math.random()}`
    sessions.set(sessionId, { userId: 1, username: body.user })

    return c.json({
      data: {
        complete: true,
        intended: '/',
        user: {
          object: 'user',
          attributes: {
            username: body.user,
            email: `${body.user}@pyrotype.local`,
          },
        },
        _sessionId: sessionId,
      },
    })
  })

  // CSRF endpoint
  ctx.app.get('/api/sanctum/csrf-cookie', (c) => c.body(null, 204))

  // Protected endpoint -- checks x-session-id header for test tracking
  ctx.app.get('/api/client', (c) => {
    const sid = c.req.header('x-session-id')
    if (!sid || !sessions.has(sid)) {
      throw new AuthenticationError()
    }
    return c.json({ data: [], meta: { pagination: { total: 0 } } })
  })

  // Account endpoint
  ctx.app.get('/api/client/account', (c) => {
    const sid = c.req.header('x-session-id')
    if (!sid || !sessions.has(sid)) {
      throw new AuthenticationError()
    }
    return c.json({ data: { username: sessions.get(sid)!.username } })
  })

  // Logout endpoint
  ctx.app.post('/api/auth/logout', (c) => {
    const sid = c.req.header('x-session-id')
    if (sid) sessions.delete(sid)
    return c.body(null, 204)
  })

  return { ...ctx, sessions }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Full Auth Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Login -> Access Protected Resource -> Logout -> Verify Denied', () => {
    it('should complete the full authentication lifecycle', async () => {
      const { app } = buildAuthFlowApp()

      // Step 1: Login
      const loginRes = await jsonRequest(app, 'POST', '/api/auth/login', {
        user: 'admin',
        password: 'correct-password',
      })
      expect(loginRes.status).toBe(200)
      const loginJson = await loginRes.json() as any
      expect(loginJson.data.complete).toBe(true)
      expect(loginJson.data.user.attributes.username).toBe('admin')

      const sessionId = loginJson.data._sessionId

      // Step 2: Access protected resource
      const protectedRes = await app.request('/api/client', {
        headers: { 'x-session-id': sessionId },
      })
      expect(protectedRes.status).toBe(200)

      // Step 3: Logout
      const logoutRes = await app.request('/api/auth/logout', {
        method: 'POST',
        headers: { 'x-session-id': sessionId },
      })
      expect(logoutRes.status).toBe(204)

      // Step 4: Verify denied after logout
      const deniedRes = await app.request('/api/client', {
        headers: { 'x-session-id': sessionId },
      })
      expect(deniedRes.status).toBe(401)
    })
  })

  describe('CSRF Cookie -> Login -> Get User Details', () => {
    it('should work with CSRF cookie flow', async () => {
      const { app } = buildAuthFlowApp()

      // Step 1: Get CSRF cookie
      const csrfRes = await app.request('/api/sanctum/csrf-cookie')
      expect(csrfRes.status).toBe(204)

      // Step 2: Login
      const loginRes = await jsonRequest(app, 'POST', '/api/auth/login', {
        user: 'admin',
        password: 'correct-password',
      })
      expect(loginRes.status).toBe(200)
      const loginJson = await loginRes.json() as any
      expect(loginJson.data.complete).toBe(true)

      // Step 3: Access account details
      const accountRes = await app.request('/api/client/account', {
        headers: { 'x-session-id': loginJson.data._sessionId },
      })
      expect(accountRes.status).toBe(200)
    })
  })

  describe('Failed Login -> Retry with Correct Credentials', () => {
    it('should allow login after failed attempt with wrong password', async () => {
      const { app } = buildAuthFlowApp()

      // Step 1: Fail to login
      const failRes = await jsonRequest(app, 'POST', '/api/auth/login', {
        user: 'admin',
        password: 'wrong-password',
      })
      expect(failRes.status).toBe(422)
      const failJson = await failRes.json() as any
      expect(failJson.errors[0].detail).toContain('credentials do not match')

      // Step 2: Retry with correct credentials
      const successRes = await jsonRequest(app, 'POST', '/api/auth/login', {
        user: 'admin',
        password: 'correct-password',
      })
      expect(successRes.status).toBe(200)
      const successJson = await successRes.json() as any
      expect(successJson.data.complete).toBe(true)

      // Step 3: Access protected resource
      const protectedRes = await app.request('/api/client', {
        headers: { 'x-session-id': successJson.data._sessionId },
      })
      expect(protectedRes.status).toBe(200)
    })
  })

  describe('Multiple Sessions', () => {
    it('should maintain independent sessions', async () => {
      const { app } = buildAuthFlowApp()

      // Login user 1
      const login1 = await jsonRequest(app, 'POST', '/api/auth/login', {
        user: 'admin',
        password: 'correct-password',
      })
      const session1 = ((await login1.json()) as any).data._sessionId

      // User 1 authenticated
      const res1 = await app.request('/api/client', {
        headers: { 'x-session-id': session1 },
      })
      expect(res1.status).toBe(200)

      // User 2 NOT authenticated (no session)
      const res2 = await app.request('/api/client')
      expect(res2.status).toBe(401)
    })
  })

  describe('Logout Idempotency', () => {
    it('should handle logout gracefully even without active session', async () => {
      const { app } = buildAuthFlowApp()
      const res = await app.request('/api/auth/logout', { method: 'POST' })
      expect(res.status).toBe(204)
    })

    it('should handle double logout', async () => {
      const { app } = buildAuthFlowApp()

      // Login
      const loginRes = await jsonRequest(app, 'POST', '/api/auth/login', {
        user: 'admin',
        password: 'correct-password',
      })
      const sid = ((await loginRes.json()) as any).data._sessionId

      // First logout
      const res1 = await app.request('/api/auth/logout', {
        method: 'POST',
        headers: { 'x-session-id': sid },
      })
      expect(res1.status).toBe(204)

      // Second logout (session already gone)
      const res2 = await app.request('/api/auth/logout', {
        method: 'POST',
        headers: { 'x-session-id': sid },
      })
      expect(res2.status).toBe(204)
    })
  })
})
