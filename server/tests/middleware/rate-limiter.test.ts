import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { onError } from '../../src/middleware/errorHandler'
import type { Env, HonoVariables } from '../../src/types/env'

type AppEnv = { Bindings: Env; Variables: HonoVariables }

// Import the real rateLimit (setup.ts only mocks logger, not rateLimiter)
// Use dynamic import to get a fresh module each time if needed
let rateLimit: typeof import('../../src/middleware/rateLimiter').rateLimit

beforeEach(async () => {
  // Get fresh module to reset requestCounts Map between describe blocks
  const mod = await vi.importActual<typeof import('../../src/middleware/rateLimiter')>(
    '../../src/middleware/rateLimiter',
  )
  rateLimit = mod.rateLimit
})

function buildApp(maxRequests: number, windowMinutes: number, path = '/test') {
  const app = new Hono<AppEnv>()
  app.use(`${path}`, rateLimit(maxRequests, windowMinutes))
  app.get(path, (c) => c.json({ ok: true }))
  app.onError(onError)
  return app
}

describe('rate limiter middleware', () => {
  let pathCounter = 0
  function uniquePath() {
    return `/rate-test-${++pathCounter}-${Date.now()}`
  }

  it('should allow requests under the limit', async () => {
    const path = uniquePath()
    const app = buildApp(5, 1, path)

    for (let i = 0; i < 5; i++) {
      const res = await app.request(path, {
        headers: { 'x-forwarded-for': '127.0.0.1' },
      })
      expect(res.status).toBe(200)
    }
  })

  it('should block requests over the limit (429)', async () => {
    const path = uniquePath()
    const app = buildApp(3, 1, path)

    // First 3 requests should succeed
    for (let i = 0; i < 3; i++) {
      const res = await app.request(path, {
        headers: { 'x-forwarded-for': '127.0.0.1' },
      })
      expect(res.status).toBe(200)
    }

    // 4th request should be rate limited
    const res = await app.request(path, {
      headers: { 'x-forwarded-for': '127.0.0.1' },
    })
    expect(res.status).toBe(429)
    const body = await res.json() as any
    expect(body.errors[0].code).toBe('TooManyRequestsError')
  })

  it('should reset after window expires', async () => {
    vi.useFakeTimers()

    const path = uniquePath()
    const app = buildApp(2, 1, path) // 2 requests per 1 minute

    // Use up the limit
    for (let i = 0; i < 2; i++) {
      const res = await app.request(path, {
        headers: { 'x-forwarded-for': '127.0.0.1' },
      })
      expect(res.status).toBe(200)
    }

    // Should be blocked
    const blocked = await app.request(path, {
      headers: { 'x-forwarded-for': '127.0.0.1' },
    })
    expect(blocked.status).toBe(429)

    // Advance time past the window (1 minute = 60000ms)
    vi.advanceTimersByTime(60001)

    // Should be allowed again
    const allowed = await app.request(path, {
      headers: { 'x-forwarded-for': '127.0.0.1' },
    })
    expect(allowed.status).toBe(200)

    vi.useRealTimers()
  })

  it('should track different IPs independently', async () => {
    const path = uniquePath()
    const app = buildApp(1, 1, path)

    // First IP: first request succeeds
    const res1 = await app.request(path, {
      headers: { 'x-forwarded-for': '10.0.0.1' },
    })
    expect(res1.status).toBe(200)

    // Second IP: first request also succeeds
    const res2 = await app.request(path, {
      headers: { 'x-forwarded-for': '10.0.0.2' },
    })
    expect(res2.status).toBe(200)

    // First IP: second request blocked
    const res3 = await app.request(path, {
      headers: { 'x-forwarded-for': '10.0.0.1' },
    })
    expect(res3.status).toBe(429)
  })

  it('should track different paths independently', async () => {
    const path1 = uniquePath()
    const path2 = uniquePath()

    const app = new Hono<AppEnv>()
    app.use(`${path1}`, rateLimit(1, 1))
    app.use(`${path2}`, rateLimit(1, 1))
    app.get(path1, (c) => c.json({ ok: true }))
    app.get(path2, (c) => c.json({ ok: true }))
    app.onError(onError)

    // Path 1: first request succeeds
    const res1 = await app.request(path1, {
      headers: { 'x-forwarded-for': '127.0.0.1' },
    })
    expect(res1.status).toBe(200)

    // Path 2: first request also succeeds
    const res2 = await app.request(path2, {
      headers: { 'x-forwarded-for': '127.0.0.1' },
    })
    expect(res2.status).toBe(200)

    // Path 1: second request blocked
    const res3 = await app.request(path1, {
      headers: { 'x-forwarded-for': '127.0.0.1' },
    })
    expect(res3.status).toBe(429)

    // Path 2: second request also blocked
    const res4 = await app.request(path2, {
      headers: { 'x-forwarded-for': '127.0.0.1' },
    })
    expect(res4.status).toBe(429)
  })

  it('should allow exactly maxRequests', async () => {
    const path = uniquePath()
    const app = buildApp(1, 1, path)

    const res1 = await app.request(path, {
      headers: { 'x-forwarded-for': '127.0.0.1' },
    })
    expect(res1.status).toBe(200)

    const res2 = await app.request(path, {
      headers: { 'x-forwarded-for': '127.0.0.1' },
    })
    expect(res2.status).toBe(429)
  })
})
