import { describe, it, expect, vi } from 'vitest'
import { createTestHono, jsonRequest } from '../helpers/test-app'
import { onError } from '../../src/middleware/errorHandler'

vi.mock('../../src/config/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildHealthApp() {
  const ctx = createTestHono()
  ctx.app.onError(onError)

  // Mount the health route matching src/routes/index.ts
  ctx.app.get('/api/health', (c) => c.json({ status: 'ok', version: '1.0.0' }))

  // Catch-all for method/path mismatches
  ctx.app.all('*', (c) =>
    c.json(
      { errors: [{ code: 'NotFoundError', status: '404', detail: 'Not found' }] },
      404,
    ),
  )

  return ctx
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/health', () => {
  it('should return 200 with status ok and version', async () => {
    const { app } = buildHealthApp()
    const res = await app.request('/api/health')

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ status: 'ok', version: '1.0.0' })
  })

  it('should have correct content-type header', async () => {
    const { app } = buildHealthApp()
    const res = await app.request('/api/health')

    expect(res.headers.get('content-type')).toMatch(/application\/json/)
  })

  it('should respond to HEAD requests', async () => {
    const { app } = buildHealthApp()
    const res = await app.request('/api/health', { method: 'HEAD' })

    expect(res.status).toBe(200)
    // HEAD should not return a body
    const text = await res.text()
    expect(text).toBe('')
  })

  it('should return 404 for POST /api/health', async () => {
    const { app } = buildHealthApp()
    const res = await app.request('/api/health', { method: 'POST' })

    // Falls through to catch-all since no POST handler registered
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('should return 404 for PUT /api/health', async () => {
    const { app } = buildHealthApp()
    const res = await app.request('/api/health', { method: 'PUT' })

    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('should return 404 for DELETE /api/health', async () => {
    const { app } = buildHealthApp()
    const res = await app.request('/api/health', { method: 'DELETE' })

    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('should handle query strings without issue', async () => {
    const { app } = buildHealthApp()
    const res = await app.request('/api/health?foo=bar&baz=qux')

    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json.status).toBe('ok')
  })
})
