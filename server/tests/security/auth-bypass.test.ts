import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { requireAuth, isAdmin } from '../../src/middleware/auth'
import { onError } from '../../src/middleware/errorHandler'
import {
  createTestHono,
  createMockPrisma,
  jsonRequest,
  MOCK_ADMIN,
  MOCK_USER,
} from '../helpers/test-app'
import type { Env, HonoVariables } from '../../src/types/env'

type AppType = { Bindings: Env; Variables: HonoVariables }

describe('authentication bypass prevention', () => {
  let prisma: ReturnType<typeof createMockPrisma>

  beforeEach(() => {
    prisma = createMockPrisma()
    vi.clearAllMocks()
  })

  describe('protected routes without auth return 401', () => {
    it('should return 401 when no user and no auth header', async () => {
      const { app } = createTestHono({ prisma })
      // No user injected
      app.onError(onError)
      app.get('/protected', requireAuth, (c) => c.json({ ok: true }))

      const res = await app.request('/protected')

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.errors[0].code).toBe('AuthenticationError')
    })

    it('should return 401 for POST to protected endpoint without auth', async () => {
      const { app } = createTestHono({ prisma })
      app.onError(onError)
      app.post('/protected', requireAuth, (c) => c.json({ ok: true }))

      const res = await jsonRequest(app, 'POST', '/protected', { data: 'test' })

      expect(res.status).toBe(401)
    })

    it('should allow access when user is set on context', async () => {
      const { app } = createTestHono({ user: MOCK_USER, prisma })
      app.onError(onError)
      app.get('/protected', requireAuth, (c) => c.json({ ok: true }))

      const res = await app.request('/protected')

      expect(res.status).toBe(200)
    })
  })

  describe('admin routes without admin role return 403', () => {
    it('should return 403 when regular user accesses admin route', async () => {
      const { app } = createTestHono({ user: MOCK_USER, prisma })
      app.onError(onError)
      app.get('/admin', requireAuth, isAdmin, (c) => c.json({ ok: true }))

      const res = await app.request('/admin')

      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.errors[0].detail).toBe('Must be an administrator.')
    })

    it('should allow admin user to access admin route', async () => {
      const { app } = createTestHono({ user: MOCK_ADMIN, prisma })
      app.onError(onError)
      app.get('/admin', requireAuth, isAdmin, (c) => c.json({ ok: true }))

      const res = await app.request('/admin')

      expect(res.status).toBe(200)
    })

    it('should return 401 when no user accesses admin route (auth checked first)', async () => {
      const { app } = createTestHono({ prisma })
      app.onError(onError)
      app.get('/admin', requireAuth, isAdmin, (c) => c.json({ ok: true }))

      const res = await app.request('/admin')

      expect(res.status).toBe(401)
    })
  })

  describe('JWT/token manipulation attempts fail', () => {
    it('should reject empty Bearer token', async () => {
      const { app } = createTestHono({ prisma })
      app.onError(onError)
      app.get('/protected', requireAuth, (c) => c.json({ ok: true }))

      const res = await app.request('/protected', {
        headers: { Authorization: 'Bearer ' },
      })

      expect(res.status).toBe(401)
    })

    it('should reject Bearer token without dot separator', async () => {
      const { app } = createTestHono({ prisma })
      app.onError(onError)
      app.get('/protected', requireAuth, (c) => c.json({ ok: true }))

      const res = await app.request('/protected', {
        headers: { Authorization: 'Bearer nodot' },
      })

      expect(res.status).toBe(401)
    })

    it('should reject Bearer token with invalid identifier', async () => {
      prisma.apiKey.findFirst.mockResolvedValue(null)

      const { app } = createTestHono({ prisma })
      app.onError(onError)
      app.get('/protected', requireAuth, (c) => c.json({ ok: true }))

      const res = await app.request('/protected', {
        headers: { Authorization: 'Bearer fakeidentifier.faketoken' },
      })

      expect(res.status).toBe(401)
    })

    it('should reject Bearer token with valid identifier but wrong secret', async () => {
      prisma.apiKey.findFirst.mockResolvedValue({
        id: 1,
        identifier: 'validkey',
        token: 'correct-secret',
        keyType: 2,
        user: MOCK_USER,
      })

      const { app } = createTestHono({ prisma })
      app.onError(onError)
      app.get('/protected', requireAuth, (c) => c.json({ ok: true }))

      const res = await app.request('/protected', {
        headers: { Authorization: 'Bearer validkey.wrong-secret' },
      })

      expect(res.status).toBe(401)
    })

    it('should accept Bearer token with valid identifier and correct secret', async () => {
      prisma.apiKey.findFirst.mockResolvedValue({
        id: 1,
        identifier: 'validkey',
        token: 'correct-secret',
        keyType: 2,
        user: { ...MOCK_USER },
      })

      const { app } = createTestHono({ prisma })
      app.onError(onError)
      app.get('/protected', requireAuth, (c) => c.json({ ok: true }))

      const res = await app.request('/protected', {
        headers: { Authorization: 'Bearer validkey.correct-secret' },
      })

      expect(res.status).toBe(200)
      // Verify lastUsedAt was updated
      expect(prisma.apiKey.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ lastUsedAt: expect.any(Date) }),
        }),
      )
    })

    it('should reject non-Bearer auth scheme', async () => {
      const { app } = createTestHono({ prisma })
      app.onError(onError)
      app.get('/protected', requireAuth, (c) => c.json({ ok: true }))

      const res = await app.request('/protected', {
        headers: { Authorization: 'Basic dXNlcjpwYXNz' },
      })

      expect(res.status).toBe(401)
    })

    it('should reject Bearer with only dots', async () => {
      const { app } = createTestHono({ prisma })
      app.onError(onError)
      app.get('/protected', requireAuth, (c) => c.json({ ok: true }))

      const res = await app.request('/protected', {
        headers: { Authorization: 'Bearer ...' },
      })

      expect(res.status).toBe(401)
    })

    it('should reject Bearer token with multiple dots (JWT-like format)', async () => {
      // The auth middleware splits on '.' and expects exactly 2 parts
      const { app } = createTestHono({ prisma })
      app.onError(onError)
      app.get('/protected', requireAuth, (c) => c.json({ ok: true }))

      const res = await app.request('/protected', {
        headers: { Authorization: 'Bearer header.payload.signature' },
      })

      // parts.length === 3 !== 2, so it falls through to AuthenticationError
      expect(res.status).toBe(401)
    })
  })

  describe('session fixation protection', () => {
    it('should not authenticate with forged session cookie alone', async () => {
      // The requireAuth middleware checks c.var.user first, then Bearer token.
      // A session cookie alone (without loadUser middleware setting c.var.user)
      // does not bypass authentication.
      const { app } = createTestHono({ prisma })
      app.onError(onError)
      app.get('/protected', requireAuth, (c) => c.json({ ok: true }))

      const res = await app.request('/protected', {
        headers: { Cookie: 'pyrotype_session=forged-session-value' },
      })

      expect(res.status).toBe(401)
    })

    it('should not authenticate when session data has wrong user ID', async () => {
      // Even if session exists in context but user is not set, auth fails
      const { app } = createTestHono({ prisma })
      app.onError(onError)
      app.use('/protected', async (c, next) => {
        c.set('session', { userId: 999, twoFactorVerified: false })
        c.set('sessionId', 'fake-session-id')
        // Notably, c.var.user is NOT set
        await next()
      })
      app.get('/protected', requireAuth, (c) => c.json({ ok: true }))

      const res = await app.request('/protected')

      expect(res.status).toBe(401)
    })
  })

  describe('invalid session IDs are rejected', () => {
    it('should reject request with empty authorization header', async () => {
      const { app } = createTestHono({ prisma })
      app.onError(onError)
      app.get('/protected', requireAuth, (c) => c.json({ ok: true }))

      const res = await app.request('/protected', {
        headers: { Authorization: '' },
      })

      expect(res.status).toBe(401)
    })

    it('should reject request with whitespace-only authorization', async () => {
      const { app } = createTestHono({ prisma })
      app.onError(onError)
      app.get('/protected', requireAuth, (c) => c.json({ ok: true }))

      const res = await app.request('/protected', {
        headers: { Authorization: '   ' },
      })

      expect(res.status).toBe(401)
    })

    it('should reject request with malformed authorization (no scheme)', async () => {
      const { app } = createTestHono({ prisma })
      app.onError(onError)
      app.get('/protected', requireAuth, (c) => c.json({ ok: true }))

      const res = await app.request('/protected', {
        headers: { Authorization: 'justAToken' },
      })

      expect(res.status).toBe(401)
    })
  })

  describe('two-factor authentication enforcement', () => {
    it('should block user with TOTP enabled but not verified', async () => {
      const { requireTwoFactor } = await import('../../src/middleware/auth')
      const userWithTotp = { ...MOCK_USER, useTotp: true }

      const { app } = createTestHono({ user: userWithTotp, prisma })
      app.onError(onError)
      app.use('/protected', async (c, next) => {
        c.set('session', { userId: userWithTotp.id, twoFactorVerified: false })
        await next()
      })
      app.get('/protected', requireTwoFactor, (c) => c.json({ ok: true }))

      const res = await app.request('/protected')

      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.errors[0].detail).toBe('Two-factor authentication required.')
    })

    it('should allow user with TOTP enabled and verified', async () => {
      const { requireTwoFactor } = await import('../../src/middleware/auth')
      const userWithTotp = { ...MOCK_USER, useTotp: true }

      const { app } = createTestHono({ user: userWithTotp, prisma })
      app.onError(onError)
      app.use('/protected', async (c, next) => {
        c.set('session', { userId: userWithTotp.id, twoFactorVerified: true })
        await next()
      })
      app.get('/protected', requireTwoFactor, (c) => c.json({ ok: true }))

      const res = await app.request('/protected')

      expect(res.status).toBe(200)
    })

    it('should allow user without TOTP enabled regardless of verification', async () => {
      const { requireTwoFactor } = await import('../../src/middleware/auth')

      const { app } = createTestHono({ user: MOCK_USER, prisma })
      app.onError(onError)
      app.get('/protected', requireTwoFactor, (c) => c.json({ ok: true }))

      const res = await app.request('/protected')

      expect(res.status).toBe(200)
    })
  })
})
