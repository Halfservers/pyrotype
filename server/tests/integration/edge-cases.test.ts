import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import {
  createTestHono,
  createMockPrisma,
  jsonRequest,
  MOCK_ADMIN,
  MOCK_USER,
} from '../helpers/test-app'
import { onError } from '../../src/middleware/errorHandler'
import { AppError, ValidationError } from '../../src/utils/errors'

vi.mock('../../src/config/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type AppType = { Bindings: any; Variables: any }

/**
 * Build a minimal Hono app with test routes for edge-case testing.
 * We mount routes directly rather than importing the full app to avoid
 * pulling in database connections and other side effects.
 */
function buildEdgeCaseApp(user = MOCK_ADMIN) {
  const prisma = createMockPrisma()
  const ctx = createTestHono({ user, prisma })
  ctx.app.onError(onError)

  // Health-like endpoint
  ctx.app.get('/api/health', (c) => c.json({ status: 'ok', version: '1.0.0' }))

  // CSRF cookie endpoint
  ctx.app.get('/api/sanctum/csrf-cookie', (c) => c.body(null, 204))

  // Login-like endpoint that parses JSON body
  ctx.app.post('/api/auth/login', async (c) => {
    const body = await c.req.json()
    if (!body.user || !body.password) {
      throw new ValidationError('user and password are required')
    }
    return c.json({ data: { complete: true } })
  })

  // Paginated endpoint requiring auth
  ctx.app.get('/api/client', (c) => {
    const page = Number(c.req.query('page') ?? '1')
    const perPage = Number(c.req.query('per_page') ?? '25')
    if (!Number.isInteger(page) || page < 1) {
      throw new ValidationError('page must be a positive integer')
    }
    if (!Number.isInteger(perPage) || perPage < 1 || perPage > 100) {
      throw new ValidationError('per_page must be 1-100')
    }
    return c.json({
      data: [],
      meta: { pagination: { current_page: page, per_page: perPage, total: 0 } },
    })
  })

  // Version endpoint requiring auth
  ctx.app.get('/api/client/version', (c) => {
    if (!c.var.user) throw new AppError('Authentication required', 401, 'AuthenticationError')
    return c.json({ version: '1.0.0' })
  })

  // Catch-all 404
  ctx.app.all('*', (c) => c.json({ errors: [{ code: 'NotFoundError', status: '404', detail: 'Not found' }] }, 404))

  return ctx
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Edge Cases', () => {
  describe('Empty / Malformed Bodies', () => {
    it('should handle request with Content-Type: application/json but empty body', async () => {
      const { app } = buildEdgeCaseApp()
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '',
      })
      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.status).toBeLessThan(600)
    })

    it('should handle request with Content-Type: text/plain', async () => {
      const { app } = buildEdgeCaseApp()
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'some plain text',
      })
      expect(res.status).toBeGreaterThanOrEqual(400)
    })

    it('should handle request with malformed JSON body', async () => {
      const { app } = buildEdgeCaseApp()
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{invalid json}',
      })
      expect(res.status).toBeGreaterThanOrEqual(400)
    })
  })

  describe('Pagination Edge Cases', () => {
    it('should handle very large page numbers gracefully', async () => {
      const { app } = buildEdgeCaseApp()
      const res = await app.request('/api/client?page=999999')
      expect(res.status).toBe(200)
      const json = await res.json() as any
      expect(json.data).toEqual([])
      expect(json.meta.pagination.current_page).toBe(999999)
    })

    it('should reject negative page numbers', async () => {
      const { app } = buildEdgeCaseApp()
      const res = await app.request('/api/client?page=-1')
      expect(res.status).toBeGreaterThanOrEqual(400)
    })

    it('should reject page=0', async () => {
      const { app } = buildEdgeCaseApp()
      const res = await app.request('/api/client?page=0')
      expect(res.status).toBeGreaterThanOrEqual(400)
    })

    it('should handle string values where numbers expected', async () => {
      const { app } = buildEdgeCaseApp()
      const res = await app.request('/api/client?page=abc')
      expect(res.status).toBeGreaterThanOrEqual(400)
    })

    it('should handle per_page exceeding max (100)', async () => {
      const { app } = buildEdgeCaseApp()
      const res = await app.request('/api/client?per_page=500')
      expect(res.status).toBeGreaterThanOrEqual(400)
    })
  })

  describe('Unknown Routes', () => {
    it('should return 404 for completely unknown routes', async () => {
      const { app } = buildEdgeCaseApp()
      const res = await app.request('/api/nonexistent')
      expect(res.status).toBe(404)
    })

    it('should return 404 for unknown nested routes', async () => {
      const { app } = buildEdgeCaseApp()
      const res = await app.request('/api/client/nonexistent/deeply/nested')
      expect(res.status).toBeGreaterThanOrEqual(400)
    })

    it('should handle requests to root path', async () => {
      const { app } = buildEdgeCaseApp()
      const res = await app.request('/')
      expect(res.status).toBe(404)
    })
  })

  describe('HTTP Methods on CSRF Endpoint', () => {
    it('should return 204 for GET /api/sanctum/csrf-cookie', async () => {
      const { app } = buildEdgeCaseApp()
      const res = await app.request('/api/sanctum/csrf-cookie')
      expect(res.status).toBe(204)
    })

    it('should not match POST on GET-only CSRF endpoint', async () => {
      const { app } = buildEdgeCaseApp()
      const res = await app.request('/api/sanctum/csrf-cookie', { method: 'POST' })
      // Falls through to catch-all 404
      expect(res.status).toBeGreaterThanOrEqual(400)
    })
  })

  describe('Content Negotiation', () => {
    it('should return JSON even with Accept: text/html', async () => {
      const { app } = buildEdgeCaseApp()
      const res = await app.request('/api/health', {
        headers: { Accept: 'text/html' },
      })
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toMatch(/json/)
    })

    it('should return JSON even with Accept: */*', async () => {
      const { app } = buildEdgeCaseApp()
      const res = await app.request('/api/health', {
        headers: { Accept: '*/*' },
      })
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toMatch(/json/)
    })
  })

  describe('Large Payloads', () => {
    it('should handle oversized login input without crashing', async () => {
      const { app } = buildEdgeCaseApp()
      const res = await jsonRequest(app, 'POST', '/api/auth/login', {
        user: 'a'.repeat(10000),
        password: 'b'.repeat(10000),
      })
      // Should get a response (200 or 4xx) but not crash
      expect(res.status).toBeLessThan(600)
    })
  })

  describe('Version Endpoint', () => {
    it('should return version when authenticated', async () => {
      const { app } = buildEdgeCaseApp(MOCK_ADMIN)
      const res = await app.request('/api/client/version')
      expect(res.status).toBe(200)
      const json = await res.json() as any
      expect(json).toHaveProperty('version')
    })

    it('should require authentication', async () => {
      const { app } = buildEdgeCaseApp(undefined as any)
      // Build without user to simulate unauthenticated
      const ctx = createTestHono()
      ctx.app.onError(onError)
      ctx.app.get('/api/client/version', (c) => {
        if (!c.var.user) throw new AppError('Authentication required', 401, 'AuthenticationError')
        return c.json({ version: '1.0.0' })
      })
      const res = await ctx.app.request('/api/client/version')
      expect(res.status).toBe(401)
    })
  })

  describe('URL Path Variations', () => {
    it('should handle query strings on health endpoint', async () => {
      const { app } = buildEdgeCaseApp()
      const res = await app.request('/api/health?foo=bar&baz=qux')
      expect(res.status).toBe(200)
      const json = await res.json() as any
      expect(json.status).toBe('ok')
    })
  })
})
