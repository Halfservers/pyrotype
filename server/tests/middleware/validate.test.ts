import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { z } from 'zod'
import { validate } from '../../src/middleware/validate'
import { onError } from '../../src/middleware/errorHandler'
import type { Env, HonoVariables } from '../../src/types/env'

type AppEnv = { Bindings: Env; Variables: HonoVariables }

function buildApp(
  schemas: Parameters<typeof validate>[0],
  method: 'get' | 'post' = 'post',
) {
  const app = new Hono<AppEnv>()

  if (method === 'post') {
    app.post('/test', validate(schemas), (c) =>
      c.json({ ok: true, body: c.req.valid?.('json') }),
    )
  }

  if (method === 'get') {
    app.get('/test', validate(schemas), (c) =>
      c.json({ ok: true, query: c.req.query() }),
    )
  }

  // Route with params
  app.get('/items/:id', validate(schemas), (c) =>
    c.json({ ok: true, params: c.req.param() }),
  )

  app.onError(onError)
  return app
}

describe('validate middleware', () => {
  describe('body validation', () => {
    const bodySchema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().int().min(0).optional(),
    })

    it('should pass with valid body', async () => {
      const app = buildApp({ body: bodySchema })
      const res = await app.request('/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'John', email: 'john@example.com' }),
      })

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.ok).toBe(true)
    })

    it('should reject invalid body (422 with Zod details)', async () => {
      const app = buildApp({ body: bodySchema })
      const res = await app.request('/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '', email: 'not-an-email' }),
      })

      expect(res.status).toBe(422)
      const body = await res.json() as any
      expect(body.errors[0].code).toBe('ValidationError')
      expect(body.errors[0].detail).toBe('Validation failed')
    })

    it('should reject when required fields are missing', async () => {
      const app = buildApp({ body: bodySchema })
      const res = await app.request('/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(422)
    })

    it('should reject unknown fields with strict schema', async () => {
      const strictSchema = z.object({ name: z.string() }).strict()
      const app = buildApp({ body: strictSchema })
      const res = await app.request('/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'John', extraField: 'hack' }),
      })

      expect(res.status).toBe(422)
    })
  })

  describe('query validation', () => {
    const querySchema = z
      .object({
        page: z.string().regex(/^\d+$/),
        limit: z.string().regex(/^\d+$/).optional(),
      })
      .passthrough()

    it('should pass with valid query params', async () => {
      const app = buildApp({ query: querySchema }, 'get')
      const res = await app.request('/test?page=1&limit=10')

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.query).toMatchObject({ page: '1', limit: '10' })
    })

    it('should reject invalid query params', async () => {
      const app = buildApp({ query: querySchema }, 'get')
      const res = await app.request('/test?page=abc')

      expect(res.status).toBe(422)
    })
  })

  describe('params validation', () => {
    const paramsSchema = z.object({
      id: z.string().regex(/^\d+$/),
    })

    it('should pass with valid route params', async () => {
      const app = buildApp({ params: paramsSchema })
      const res = await app.request('/items/123')

      expect(res.status).toBe(200)
      const body = await res.json() as any
      expect(body.params).toMatchObject({ id: '123' })
    })

    it('should reject invalid route params', async () => {
      const app = buildApp({ params: paramsSchema })
      const res = await app.request('/items/abc')

      expect(res.status).toBe(422)
    })
  })

  describe('combined validation', () => {
    it('should validate body and query together', async () => {
      const bodySchema = z.object({ name: z.string() })
      const querySchema = z.object({ sort: z.string().optional() }).passthrough()

      const app = new Hono<AppEnv>()
      app.post('/test', validate({ body: bodySchema, query: querySchema }), (c) =>
        c.json({ ok: true }),
      )
      app.onError(onError)

      const res = await app.request('/test?sort=name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Alice' }),
      })

      expect(res.status).toBe(200)
    })
  })
})
