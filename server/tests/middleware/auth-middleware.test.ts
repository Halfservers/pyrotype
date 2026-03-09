import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { requireAuth, isAdmin, requireTwoFactor } from '../../src/middleware/auth'
import { onError } from '../../src/middleware/errorHandler'
import { createMockPrisma, MOCK_ADMIN, MOCK_USER } from '../helpers/test-app'
import type { Env, HonoVariables } from '../../src/types/env'

type AppEnv = { Bindings: Env; Variables: HonoVariables }

function buildApp(opts?: {
  user?: typeof MOCK_ADMIN | null
  prisma?: ReturnType<typeof createMockPrisma>
  session?: { twoFactorVerified?: boolean } | null
  middlewares?: any[]
}) {
  const prisma = opts?.prisma ?? createMockPrisma()
  const app = new Hono<AppEnv>()

  app.use('*', async (c, next) => {
    c.set('prisma', prisma as any)
    if (opts?.user !== undefined && opts.user !== null) {
      c.set('user', opts.user as any)
    }
    if (opts?.session !== undefined) {
      c.set('session', opts.session as any)
    }
    await next()
  })

  if (opts?.middlewares) {
    for (const mw of opts.middlewares) {
      app.use('*', mw)
    }
  }

  app.get('/test', (c) => c.json({ ok: true, user: c.var.user ?? null }))
  app.onError(onError)

  return { app, prisma }
}

describe('auth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('requireAuth', () => {
    it('should pass when user is already set on context', async () => {
      const { app } = buildApp({ user: MOCK_ADMIN, middlewares: [requireAuth] })

      const res = await app.request('/test')
      expect(res.status).toBe(200)

      const body = await res.json() as any
      expect(body.ok).toBe(true)
      expect(body.user).toMatchObject({ id: 1, username: 'admin', rootAdmin: true })
    })

    it('should pass with valid Bearer API key', async () => {
      const prisma = createMockPrisma()
      const fakeUser = { id: 2, username: 'apiuser', rootAdmin: false }
      const fakeApiKey = { id: 10, identifier: 'myident', token: 'secrettoken', user: fakeUser }
      prisma.apiKey.findFirst.mockResolvedValue(fakeApiKey)
      prisma.apiKey.update.mockResolvedValue({})

      const { app } = buildApp({ prisma, middlewares: [requireAuth] })

      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer myident.secrettoken' },
      })

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.user).toMatchObject({ id: 2, username: 'apiuser' })
      expect(prisma.apiKey.findFirst).toHaveBeenCalledWith({
        where: { identifier: 'myident', keyType: 2 },
        include: { user: true },
      })
      expect(prisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { lastUsedAt: expect.any(Date) },
      })
    })

    it('should reject with no user and no token (401)', async () => {
      const { app } = buildApp({ middlewares: [requireAuth] })

      const res = await app.request('/test')
      expect(res.status).toBe(401)

      const body = await res.json() as any
      expect(body.errors[0].code).toBe('AuthenticationError')
    })

    it('should reject with malformed Bearer token (no dot separator)', async () => {
      const { app } = buildApp({ middlewares: [requireAuth] })

      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer nodottoken' },
      })

      expect(res.status).toBe(401)
      const body = await res.json() as any
      expect(body.errors[0].code).toBe('AuthenticationError')
    })

    it('should reject when API key identifier not found', async () => {
      const prisma = createMockPrisma()
      prisma.apiKey.findFirst.mockResolvedValue(null)

      const { app } = buildApp({ prisma, middlewares: [requireAuth] })

      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer unknown.token' },
      })

      expect(res.status).toBe(401)
    })

    it('should reject when API key token does not match', async () => {
      const prisma = createMockPrisma()
      prisma.apiKey.findFirst.mockResolvedValue({
        id: 10,
        identifier: 'myident',
        token: 'correcttoken',
        user: { id: 2, username: 'apiuser', rootAdmin: false },
      })

      const { app } = buildApp({ prisma, middlewares: [requireAuth] })

      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer myident.wrongtoken' },
      })

      expect(res.status).toBe(401)
    })

    it('should reject with empty Bearer value', async () => {
      const { app } = buildApp({ middlewares: [requireAuth] })

      const res = await app.request('/test', {
        headers: { Authorization: 'Bearer ' },
      })

      expect(res.status).toBe(401)
    })

    it('should reject with non-Bearer authorization header', async () => {
      const { app } = buildApp({ middlewares: [requireAuth] })

      const res = await app.request('/test', {
        headers: { Authorization: 'Basic dXNlcjpwYXNz' },
      })

      expect(res.status).toBe(401)
    })
  })

  describe('isAdmin', () => {
    it('should pass for rootAdmin=true', async () => {
      const { app } = buildApp({ user: MOCK_ADMIN, middlewares: [isAdmin] })

      const res = await app.request('/test')
      expect(res.status).toBe(200)
    })

    it('should reject for rootAdmin=false (403)', async () => {
      const { app } = buildApp({ user: MOCK_USER, middlewares: [isAdmin] })

      const res = await app.request('/test')
      expect(res.status).toBe(403)

      const body = await res.json() as any
      expect(body.errors[0].detail).toBe('Must be an administrator.')
    })

    it('should reject when no user is set', async () => {
      const { app } = buildApp({ middlewares: [isAdmin] })

      const res = await app.request('/test')
      expect(res.status).toBe(403)
    })
  })

  describe('requireTwoFactor', () => {
    it('should pass when useTotp is false', async () => {
      const { app } = buildApp({
        user: { ...MOCK_ADMIN, useTotp: false },
        middlewares: [requireTwoFactor],
      })

      const res = await app.request('/test')
      expect(res.status).toBe(200)
    })

    it('should pass when useTotp is true and twoFactorVerified is true', async () => {
      const { app } = buildApp({
        user: { ...MOCK_ADMIN, useTotp: true },
        session: { twoFactorVerified: true },
        middlewares: [requireTwoFactor],
      })

      const res = await app.request('/test')
      expect(res.status).toBe(200)
    })

    it('should reject when useTotp is true but twoFactorVerified is not set (403)', async () => {
      const { app } = buildApp({
        user: { ...MOCK_ADMIN, useTotp: true },
        session: null,
        middlewares: [requireTwoFactor],
      })

      const res = await app.request('/test')
      expect(res.status).toBe(403)

      const body = await res.json() as any
      expect(body.errors[0].detail).toBe('Two-factor authentication required.')
    })

    it('should pass when user is not set (no useTotp to check)', async () => {
      const { app } = buildApp({ middlewares: [requireTwoFactor] })

      const res = await app.request('/test')
      expect(res.status).toBe(200)
    })
  })
})
