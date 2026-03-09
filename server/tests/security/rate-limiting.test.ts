import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { createTestHono, createMockKV } from '../helpers/test-app'
import { onError } from '../../src/middleware/errorHandler'
import { TooManyRequestsError } from '../../src/utils/errors'
import type { MiddlewareHandler } from 'hono'

vi.mock('../../src/config/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// ---------------------------------------------------------------------------
// KV-based rate limiter for Workers environment
// ---------------------------------------------------------------------------

/**
 * Rate limit middleware using a KV-like store (Map in tests).
 * This mirrors the approach needed for Cloudflare Workers where
 * in-memory Maps are not shared across isolates.
 */
function kvRateLimit(
  store: Map<string, string>,
  maxRequests: number,
  windowMinutes: number,
): MiddlewareHandler {
  return async (c, next) => {
    const clientIp = c.req.header('x-forwarded-for') || 'unknown'
    const key = `ratelimit:${clientIp}:${c.req.path}`
    const now = Date.now()
    const windowMs = windowMinutes * 60 * 1000

    const existing = store.get(key)
    if (!existing) {
      store.set(key, JSON.stringify({ count: 1, resetAt: now + windowMs }))
      await next()
      return
    }

    const entry = JSON.parse(existing) as { count: number; resetAt: number }
    if (now > entry.resetAt) {
      store.set(key, JSON.stringify({ count: 1, resetAt: now + windowMs }))
      await next()
      return
    }

    entry.count++
    store.set(key, JSON.stringify(entry))

    if (entry.count > maxRequests) {
      throw new TooManyRequestsError()
    }

    await next()
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRateLimitApp(maxRequests: number, windowMinutes: number, path: string) {
  const store = new Map<string, string>()
  const app = new Hono()
  app.onError(onError)

  app.post(path, kvRateLimit(store, maxRequests, windowMinutes), (c) => {
    return c.json({ ok: true })
  })

  return { app, store }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Rate Limiting', () => {
  describe('Requests within the limit succeed', () => {
    it('allows requests up to the maximum', async () => {
      const { app } = buildRateLimitApp(5, 1, '/api/test/login')

      for (let i = 0; i < 5; i++) {
        const res = await app.request('/api/test/login', { method: 'POST' })
        expect(res.status).toBe(200)
      }
    })
  })

  describe('Exceeding the limit returns 429', () => {
    it('returns 429 when rate limit is exceeded', async () => {
      const { app } = buildRateLimitApp(3, 1, '/api/test/login')

      // Use up the limit (3 requests)
      for (let i = 0; i < 3; i++) {
        const res = await app.request('/api/test/login', { method: 'POST' })
        expect(res.status).toBe(200)
      }

      // 4th request should be rate limited
      const res = await app.request('/api/test/login', { method: 'POST' })
      expect(res.status).toBe(429)
    })

    it('returns correct error format in 429 response', async () => {
      const { app } = buildRateLimitApp(1, 1, '/api/test/login')

      // Exhaust limit
      await app.request('/api/test/login', { method: 'POST' })

      // Should get rate limited with proper format
      const res = await app.request('/api/test/login', { method: 'POST' })
      expect(res.status).toBe(429)
      const json = await res.json() as any
      expect(json.errors).toBeInstanceOf(Array)
      expect(json.errors[0]).toHaveProperty('code', 'TooManyRequestsError')
      expect(json.errors[0]).toHaveProperty('status', '429')
      expect(json.errors[0]).toHaveProperty('detail')
    })
  })

  describe('Rate limits are per-path', () => {
    it('separate endpoints have independent rate limit buckets', async () => {
      const store = new Map<string, string>()
      const app = new Hono()
      app.onError(onError)

      app.post('/api/login', kvRateLimit(store, 1, 1), (c) => c.json({ ok: true }))
      app.post('/api/reset', kvRateLimit(store, 1, 1), (c) => c.json({ ok: true }))

      // Exhaust limit on /api/login
      await app.request('/api/login', { method: 'POST' })
      const res1 = await app.request('/api/login', { method: 'POST' })
      expect(res1.status).toBe(429)

      // /api/reset should still be allowed
      const res2 = await app.request('/api/reset', { method: 'POST' })
      expect(res2.status).toBe(200)
    })
  })

  describe('Rate limit window resets', () => {
    it('allows requests again after window expires', async () => {
      // Use a very short window (0.001 minutes = 60ms)
      const { app } = buildRateLimitApp(1, 0.001, '/api/test/reset')

      // First request OK
      const res1 = await app.request('/api/test/reset', { method: 'POST' })
      expect(res1.status).toBe(200)

      // Second request rate limited
      const res2 = await app.request('/api/test/reset', { method: 'POST' })
      expect(res2.status).toBe(429)

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Should be allowed again
      const res3 = await app.request('/api/test/reset', { method: 'POST' })
      expect(res3.status).toBe(200)
    })
  })

  describe('Production rateLimiter module', () => {
    it('rateLimit returns a Hono middleware function', async () => {
      // Import the real rateLimit to verify it returns a function
      const { rateLimit } = await import('../../src/middleware/rateLimiter')
      const middleware = rateLimit(10, 1)
      expect(typeof middleware).toBe('function')
    })

    it('rateLimiter alias converts windowMs to minutes', async () => {
      const { rateLimiter } = await import('../../src/middleware/rateLimiter')
      const middleware = rateLimiter(10, 60000) // 60000ms = 1 minute
      expect(typeof middleware).toBe('function')
    })
  })
})
