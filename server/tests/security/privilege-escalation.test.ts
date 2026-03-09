import { describe, it, expect, vi } from 'vitest'
import {
  createTestHono,
  createMockPrisma,
  jsonRequest,
  MOCK_USER,
  MOCK_ADMIN,
} from '../helpers/test-app'
import { onError } from '../../src/middleware/errorHandler'
import { requireAdminAccess } from '../../src/middleware/apiKeyAuth'
import { isAuthenticated } from '../../src/middleware/auth'

vi.mock('../../src/config/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('../../src/utils/crypto', () => ({
  verifyPassword: vi.fn(async () => false),
  generateToken: vi.fn(() => 'mock-token'),
  hashPassword: vi.fn(async (pw: string) => `hashed:${pw}`),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a Hono app with admin routes protected by requireAdminAccess
 * and a non-admin user set in context. This tests that the middleware
 * correctly blocks access.
 */
function buildPrivEscApp(user = MOCK_USER) {
  const prisma = createMockPrisma()
  const ctx = createTestHono({ user, prisma })
  ctx.app.onError(onError)

  // Admin API endpoints behind requireAdminAccess
  const adminPaths = [
    { method: 'get' as const, path: '/api/application/panel/status' },
    { method: 'get' as const, path: '/api/application/users' },
    { method: 'get' as const, path: '/api/application/users/1' },
    { method: 'get' as const, path: '/api/application/nodes' },
    { method: 'get' as const, path: '/api/application/servers' },
    { method: 'get' as const, path: '/api/application/locations' },
    { method: 'get' as const, path: '/api/application/nests' },
  ]

  // Mount admin routes with the real requireAdminAccess middleware
  ctx.app.use('/api/application/*', requireAdminAccess)

  for (const { method, path } of adminPaths) {
    ctx.app[method](path, (c) => c.json({ data: 'admin-only-data' }))
  }

  // Mutation routes
  ctx.app.post('/api/application/users', (c) => c.json({ data: 'created' }, 201))
  ctx.app.patch('/api/application/users/:id', (c) => c.json({ data: 'updated' }))
  ctx.app.delete('/api/application/users/:id', (c) => c.body(null, 204))

  ctx.app.post('/api/application/servers/:id/suspend', (c) => c.json({ ok: true }))
  ctx.app.post('/api/application/servers/:id/unsuspend', (c) => c.json({ ok: true }))
  ctx.app.post('/api/application/servers/:id/reinstall', (c) => c.json({ ok: true }))

  ctx.app.post('/api/application/nodes', (c) => c.json({ data: 'created' }, 201))
  ctx.app.delete('/api/application/nodes/:id', (c) => c.body(null, 204))

  ctx.app.post('/api/application/locations', (c) => c.json({ data: 'created' }, 201))
  ctx.app.delete('/api/application/locations/:id', (c) => c.body(null, 204))

  return ctx
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Privilege Escalation Prevention', () => {
  describe('Non-admin cannot access admin API endpoints', () => {
    const adminEndpoints = [
      { method: 'GET', path: '/api/application/panel/status' },
      { method: 'GET', path: '/api/application/users' },
      { method: 'GET', path: '/api/application/users/1' },
      { method: 'GET', path: '/api/application/nodes' },
      { method: 'GET', path: '/api/application/servers' },
      { method: 'GET', path: '/api/application/locations' },
      { method: 'GET', path: '/api/application/nests' },
    ]

    for (const { method, path } of adminEndpoints) {
      it(`non-admin user cannot access ${method} ${path}`, async () => {
        const { app } = buildPrivEscApp(MOCK_USER) // non-admin user
        const res = await app.request(path, { method })

        // requireAdminAccess checks rootAdmin, then falls to API key check
        // Non-admin user without Bearer token should get 403
        expect(res.status).toBeGreaterThanOrEqual(400)
        expect(res.status).toBeLessThan(500)
      })
    }
  })

  describe('Non-admin cannot create/modify/delete users via admin API', () => {
    it('cannot create a user via admin API', async () => {
      const { app } = buildPrivEscApp(MOCK_USER)
      const res = await jsonRequest(app, 'POST', '/api/application/users', {
        username: 'hacked',
        email: 'hacked@test.com',
        password: 'HackedPass123!',
        rootAdmin: true,
      })
      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.status).toBeLessThan(500)
    })

    it('cannot update a user via admin API', async () => {
      const { app } = buildPrivEscApp(MOCK_USER)
      const res = await jsonRequest(app, 'PATCH', '/api/application/users/1', {
        rootAdmin: true,
      })
      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.status).toBeLessThan(500)
    })

    it('cannot delete a user via admin API', async () => {
      const { app } = buildPrivEscApp(MOCK_USER)
      const res = await app.request('/api/application/users/1', { method: 'DELETE' })
      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.status).toBeLessThan(500)
    })
  })

  describe('Non-admin cannot suspend/unsuspend servers via admin API', () => {
    it('cannot suspend a server', async () => {
      const { app } = buildPrivEscApp(MOCK_USER)
      const res = await app.request('/api/application/servers/1/suspend', { method: 'POST' })
      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.status).toBeLessThan(500)
    })

    it('cannot unsuspend a server', async () => {
      const { app } = buildPrivEscApp(MOCK_USER)
      const res = await app.request('/api/application/servers/1/unsuspend', { method: 'POST' })
      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.status).toBeLessThan(500)
    })

    it('cannot reinstall a server', async () => {
      const { app } = buildPrivEscApp(MOCK_USER)
      const res = await app.request('/api/application/servers/1/reinstall', { method: 'POST' })
      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.status).toBeLessThan(500)
    })
  })

  describe('Non-admin cannot manage nodes via admin API', () => {
    it('cannot create a node', async () => {
      const { app } = buildPrivEscApp(MOCK_USER)
      const res = await jsonRequest(app, 'POST', '/api/application/nodes', {
        name: 'Hacked Node',
        fqdn: 'hacked.local',
      })
      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.status).toBeLessThan(500)
    })

    it('cannot delete a node', async () => {
      const { app } = buildPrivEscApp(MOCK_USER)
      const res = await app.request('/api/application/nodes/1', { method: 'DELETE' })
      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.status).toBeLessThan(500)
    })
  })

  describe('Non-admin cannot manage locations via admin API', () => {
    it('cannot create a location', async () => {
      const { app } = buildPrivEscApp(MOCK_USER)
      const res = await jsonRequest(app, 'POST', '/api/application/locations', {
        short: 'hack',
        long: 'Hacked Location',
      })
      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.status).toBeLessThan(500)
    })

    it('cannot delete a location', async () => {
      const { app } = buildPrivEscApp(MOCK_USER)
      const res = await app.request('/api/application/locations/1', { method: 'DELETE' })
      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.status).toBeLessThan(500)
    })
  })

  describe('Admin user CAN access admin routes', () => {
    it('admin user can access admin endpoints', async () => {
      const { app } = buildPrivEscApp(MOCK_ADMIN) // admin user
      const res = await app.request('/api/application/users')
      expect(res.status).toBe(200)
    })
  })
})
