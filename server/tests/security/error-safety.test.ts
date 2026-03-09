import { describe, it, expect, vi } from 'vitest'
import {
  createTestHono,
  createMockPrisma,
  jsonRequest,
  MOCK_ADMIN,
} from '../helpers/test-app'
import { onError } from '../../src/middleware/errorHandler'
import {
  AppError,
  AuthenticationError,
  ValidationError,
} from '../../src/utils/errors'

vi.mock('../../src/config/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildErrorSafetyApp() {
  const prisma = createMockPrisma()
  const ctx = createTestHono({ prisma })
  ctx.app.onError(onError)

  // Login-like endpoint
  ctx.app.post('/api/auth/login', async (c) => {
    const body = await c.req.json()
    if (!body.user || !body.password) {
      throw new ValidationError('user and password are required')
    }
    // Simulate credential check
    throw new ValidationError('These credentials do not match our records.')
  })

  // Protected client route (requires user)
  ctx.app.get('/api/client', (c) => {
    if (!c.var.user) throw new AuthenticationError()
    return c.json({ data: [] })
  })

  // Admin route (requires API key)
  ctx.app.get('/api/application/users', (c) => {
    const auth = c.req.header('authorization')
    if (!auth?.startsWith('Bearer ')) throw new AuthenticationError()
    throw new AuthenticationError('Invalid API key')
  })

  // Route that triggers an unexpected error (simulates DB leak)
  ctx.app.get('/api/internal-error', () => {
    throw new Error('SELECT * FROM users WHERE id = 1')
  })

  // Catch-all 404
  ctx.app.all('*', (c) =>
    c.json({ errors: [{ code: 'NotFoundError', status: '404', detail: 'Not found' }] }, 404),
  )

  return ctx
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Error Response Safety', () => {
  describe('Error responses never contain stack traces', () => {
    it('500-level errors do not expose stack traces', async () => {
      const { app } = buildErrorSafetyApp()
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"invalid json',
      })

      const body = JSON.stringify(await res.json())
      expect(body).not.toContain('at ')
      expect(body).not.toMatch(/\w+\.ts:\d+/)
      expect(body).not.toMatch(/\w+\.js:\d+/)
      expect(body).not.toContain('node_modules')
    })

    it('401 errors do not expose stack traces', async () => {
      const ctx = createTestHono()
      ctx.app.onError(onError)
      ctx.app.get('/api/client', () => { throw new AuthenticationError() })

      const res = await ctx.app.request('/api/client')
      const body = JSON.stringify(await res.json())
      expect(body).not.toContain('at ')
      expect(body).not.toMatch(/\w+\.ts:\d+/)
      expect(body).not.toContain('node_modules')
    })

    it('422 validation errors do not expose stack traces', async () => {
      const { app } = buildErrorSafetyApp()
      const res = await jsonRequest(app, 'POST', '/api/auth/login', {})
      const body = JSON.stringify(await res.json())
      expect(body).not.toContain('at ')
      expect(body).not.toMatch(/\w+\.ts:\d+/)
    })
  })

  describe('Error responses never contain database details', () => {
    it('login failure does not expose DB internals', async () => {
      const { app } = buildErrorSafetyApp()
      const res = await jsonRequest(app, 'POST', '/api/auth/login', {
        user: 'admin',
        password: 'wrongpassword',
      })

      const body = JSON.stringify(await res.json()).toLowerCase()
      expect(body).not.toContain('sqlite')
      expect(body).not.toContain('prisma')
      expect(body).not.toContain('database')
      expect(body).not.toContain('select ')
      expect(body).not.toContain('insert ')
      expect(body).not.toContain('table')
    })

    it('unexpected error does not expose SQL in response', async () => {
      const { app } = buildErrorSafetyApp()
      const res = await app.request('/api/internal-error')

      expect(res.status).toBe(500)
      const json = await res.json() as any
      // The onError handler should return a generic message
      expect(json.errors[0].detail).toBe('An unexpected error occurred.')
      const body = JSON.stringify(json).toLowerCase()
      expect(body).not.toContain('select')
    })

    it('invalid API key does not expose DB internals', async () => {
      const { app } = buildErrorSafetyApp()
      const res = await app.request('/api/application/users', {
        headers: { Authorization: 'Bearer invalid.key' },
      })

      const body = JSON.stringify(await res.json()).toLowerCase()
      expect(body).not.toContain('sqlite')
      expect(body).not.toContain('prisma')
      expect(body).not.toContain('select ')
    })
  })

  describe('Error responses use consistent format', () => {
    it('401 error has correct format', async () => {
      const ctx = createTestHono()
      ctx.app.onError(onError)
      ctx.app.get('/api/client', () => { throw new AuthenticationError() })

      const res = await ctx.app.request('/api/client')

      expect(res.status).toBe(401)
      const json = await res.json() as any
      expect(json).toHaveProperty('errors')
      expect(json.errors).toBeInstanceOf(Array)
      expect(json.errors[0]).toHaveProperty('code')
      expect(json.errors[0]).toHaveProperty('status')
      expect(json.errors[0]).toHaveProperty('detail')
      expect(json.errors[0].status).toBe('401')
    })

    it('422 validation error has correct format', async () => {
      const { app } = buildErrorSafetyApp()
      const res = await jsonRequest(app, 'POST', '/api/auth/login', {})

      expect(res.status).toBe(422)
      const json = await res.json() as any
      expect(json).toHaveProperty('errors')
      expect(json.errors).toBeInstanceOf(Array)
      expect(json.errors[0]).toHaveProperty('code')
      expect(json.errors[0]).toHaveProperty('status', '422')
      expect(json.errors[0]).toHaveProperty('detail')
    })

    it('unknown routes do not return 200', async () => {
      const { app } = buildErrorSafetyApp()
      const res = await app.request('/api/nonexistent/endpoint')

      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.status).not.toBe(200)
    })

    it('invalid JSON body returns an error status', async () => {
      const { app } = buildErrorSafetyApp()
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"broken": }',
      })

      expect(res.status).toBeGreaterThanOrEqual(400)
      const body = JSON.stringify(await res.json())
      expect(body).not.toContain('node_modules')
    })
  })

  describe('Error details do not leak sensitive information', () => {
    it('wrong password error is generic', async () => {
      const { app } = buildErrorSafetyApp()
      const res = await jsonRequest(app, 'POST', '/api/auth/login', {
        user: 'admin',
        password: 'wrongpassword',
      })

      const json = await res.json() as any
      expect(json.errors[0].detail).not.toMatch(/password.*wrong/i)
      expect(json.errors[0].detail).not.toMatch(/user.*found/i)
    })

    it('nonexistent user error is generic and indistinguishable', async () => {
      const { app } = buildErrorSafetyApp()
      const res = await jsonRequest(app, 'POST', '/api/auth/login', {
        user: 'totallyinvaliduser',
        password: 'password',
      })

      const json = await res.json() as any
      expect(json.errors[0].detail).toMatch(/credentials/i)
    })
  })
})
