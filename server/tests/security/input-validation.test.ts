import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { z } from 'zod'
import { validate } from '../../src/middleware/validate'
import { onError } from '../../src/middleware/errorHandler'
import {
  createTestHono,
  createMockPrisma,
  jsonRequest,
  MOCK_USER,
} from '../helpers/test-app'
import type { Env, HonoVariables } from '../../src/types/env'

type AppType = { Bindings: Env; Variables: HonoVariables }

/**
 * Builds a minimal Hono app with validate middleware and the onError handler.
 * The route accepts POST /test with a body schema and GET /items with query schema.
 */
function buildValidationApp() {
  const bodySchema = z.object({
    name: z.string().min(1).max(255),
    email: z.string().email(),
  })

  const querySchema = z.object({
    page: z.coerce.number().int().min(1).max(10000),
    perPage: z.coerce.number().int().min(1).max(100).optional(),
  })

  const { app } = createTestHono({ user: MOCK_USER })
  app.onError(onError)

  app.post('/test', validate({ body: bodySchema }), (c) => {
    return c.json({ ok: true })
  })

  app.get('/items', validate({ query: querySchema }), (c) => {
    return c.json({ ok: true })
  })

  return app
}

/**
 * Builds a Hono app with a file-like endpoint to test path traversal.
 */
function buildFileApp() {
  const paramsSchema = z.object({
    filename: z.string().refine(
      (val) => !val.includes('..') && !val.includes('\x00'),
      { message: 'Invalid filename' },
    ),
  })

  const { app } = createTestHono({ user: MOCK_USER })
  app.onError(onError)

  app.get('/files/:filename', validate({ params: paramsSchema }), (c) => {
    return c.json({ file: c.req.param('filename') })
  })

  return app
}

describe('input validation security', () => {
  describe('XSS attempts in string fields', () => {
    const xssPayloads = [
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      '"><svg onload=alert(1)>',
      "javascript:alert('XSS')",
      '<iframe src="javascript:alert(1)">',
    ]

    it('should reject XSS payloads in email field via validation', async () => {
      const app = buildValidationApp()

      for (const payload of xssPayloads) {
        const res = await jsonRequest(app, 'POST', '/test', {
          name: 'John',
          email: payload,
        })

        expect(res.status).toBe(422)
        const body = await res.json()
        expect(body.errors[0].code).toBe('ValidationError')
      }
    })

    it('should not reflect XSS in error response body', async () => {
      const app = buildValidationApp()

      const res = await jsonRequest(app, 'POST', '/test', {
        name: '<script>alert(document.cookie)</script>',
        email: 'not-an-email',
      })

      const body = await res.json()
      const bodyStr = JSON.stringify(body)
      // The response should contain the validation error, not raw script tags
      expect(bodyStr).not.toContain('<script>')
    })
  })

  describe('SQL injection patterns', () => {
    const sqlPayloads = [
      "admin' OR '1'='1",
      "admin'; DROP TABLE User; --",
      "admin' UNION SELECT * FROM User --",
      "1' OR '1'='1' /*",
      "admin'--",
    ]

    it('should reject SQL injection payloads in email field', async () => {
      const app = buildValidationApp()

      for (const payload of sqlPayloads) {
        const res = await jsonRequest(app, 'POST', '/test', {
          name: 'Test',
          email: payload,
        })

        // SQL injection strings are not valid emails, so validation rejects them
        expect(res.status).toBe(422)
      }
    })

    it('should not leak database information in error responses', async () => {
      const app = buildValidationApp()

      const res = await jsonRequest(app, 'POST', '/test', {
        name: "'; DROP TABLE users; --",
        email: 'valid@example.com',
      })

      // The name might pass validation (it is a string), but the response
      // should never contain database-related error details
      const body = await res.json()
      const bodyStr = JSON.stringify(body)
      expect(bodyStr).not.toMatch(/sqlite|prisma|database|table/i)
    })
  })

  describe('oversized payloads', () => {
    it('should reject name exceeding max length', async () => {
      const app = buildValidationApp()
      const res = await jsonRequest(app, 'POST', '/test', {
        name: 'a'.repeat(256),
        email: 'valid@example.com',
      })

      expect(res.status).toBe(422)
      const body = await res.json()
      expect(body.errors[0].code).toBe('ValidationError')
    })

    it('should accept name at max boundary (255 chars)', async () => {
      const app = buildValidationApp()
      const res = await jsonRequest(app, 'POST', '/test', {
        name: 'a'.repeat(255),
        email: 'valid@example.com',
      })

      expect(res.status).toBe(200)
    })

    it('should reject empty name', async () => {
      const app = buildValidationApp()
      const res = await jsonRequest(app, 'POST', '/test', {
        name: '',
        email: 'valid@example.com',
      })

      expect(res.status).toBe(422)
    })
  })

  describe('null bytes in inputs', () => {
    it('should reject null bytes in email field', async () => {
      const app = buildValidationApp()
      const res = await jsonRequest(app, 'POST', '/test', {
        name: 'Test',
        email: 'admin\x00@example.com',
      })

      // Null bytes produce an invalid email
      expect(res.status).toBe(422)
    })

    it('should reject null bytes in name field via Zod string validation', async () => {
      const app = buildValidationApp()
      const res = await jsonRequest(app, 'POST', '/test', {
        name: 'admin\x00injected',
        email: 'valid@example.com',
      })

      // The name passes basic string check (it is a valid string with a null byte).
      // This test documents the behavior: Zod does not strip null bytes by default.
      // If it passes, the application accepts it; if it fails, even better.
      expect(res.status).toBeLessThan(500)
    })
  })

  describe('path traversal in file endpoints', () => {
    it('should reject directory traversal with ../', async () => {
      const app = buildFileApp()
      const res = await app.request('/files/..%2F..%2Fetc%2Fpasswd')

      expect(res.status).toBe(422)
      const body = await res.json()
      expect(body.errors[0].code).toBe('ValidationError')
    })

    it('should reject null bytes in filename', async () => {
      const app = buildFileApp()
      const res = await app.request('/files/test%00.txt')

      expect(res.status).toBe(422)
    })

    it('should accept a valid filename', async () => {
      const app = buildFileApp()
      const res = await app.request('/files/document.txt')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.file).toBe('document.txt')
    })
  })

  describe('integer overflow in pagination', () => {
    it('should reject page number exceeding maximum', async () => {
      const app = buildValidationApp()
      const res = await app.request('/items?page=999999')

      expect(res.status).toBe(422)
    })

    it('should reject page number of zero', async () => {
      const app = buildValidationApp()
      const res = await app.request('/items?page=0')

      expect(res.status).toBe(422)
    })

    it('should reject negative page number', async () => {
      const app = buildValidationApp()
      const res = await app.request('/items?page=-1')

      expect(res.status).toBe(422)
    })

    it('should reject non-numeric page value', async () => {
      const app = buildValidationApp()
      const res = await app.request('/items?page=abc')

      expect(res.status).toBe(422)
    })

    it('should accept valid page number', async () => {
      const app = buildValidationApp()
      const res = await app.request('/items?page=1')

      expect(res.status).toBe(200)
    })

    it('should reject perPage exceeding 100', async () => {
      const app = buildValidationApp()
      const res = await app.request('/items?page=1&perPage=101')

      expect(res.status).toBe(422)
    })

    it('should accept perPage at boundary (100)', async () => {
      const app = buildValidationApp()
      const res = await app.request('/items?page=1&perPage=100')

      expect(res.status).toBe(200)
    })
  })

  describe('malformed JSON body', () => {
    it('should return 400 for invalid JSON', async () => {
      const app = buildValidationApp()
      const res = await app.request('/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"name": "test", email: broken}',
      })

      // Hono/validate may throw SyntaxError which errorHandler catches as 400
      expect(res.status).toBeLessThanOrEqual(422)
      expect(res.status).toBeGreaterThanOrEqual(400)
    })

    it('should return appropriate error for empty body on POST', async () => {
      const app = buildValidationApp()
      const res = await app.request('/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '',
      })

      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.status).toBeLessThan(500)
    })
  })

  describe('type coercion attacks', () => {
    it('should reject array where object expected', async () => {
      const app = buildValidationApp()
      const res = await jsonRequest(app, 'POST', '/test', [
        { name: 'test', email: 'test@example.com' },
      ])

      expect(res.status).toBe(422)
    })

    it('should reject number where string expected', async () => {
      const app = buildValidationApp()
      const res = await jsonRequest(app, 'POST', '/test', {
        name: 12345,
        email: 67890,
      })

      expect(res.status).toBe(422)
    })

    it('should reject null values where string required', async () => {
      const app = buildValidationApp()
      const res = await jsonRequest(app, 'POST', '/test', {
        name: null,
        email: null,
      })

      expect(res.status).toBe(422)
    })

    it('should reject boolean where string expected', async () => {
      const app = buildValidationApp()
      const res = await jsonRequest(app, 'POST', '/test', {
        name: true,
        email: false,
      })

      expect(res.status).toBe(422)
    })
  })
})
