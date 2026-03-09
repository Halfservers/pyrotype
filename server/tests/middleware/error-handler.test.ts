import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { onError } from '../../src/middleware/errorHandler'
import {
  AppError,
  NotFoundError,
  AuthenticationError,
  ForbiddenError,
  ValidationError,
  ConflictError,
  ServerStateConflictError,
  TooManyRequestsError,
} from '../../src/utils/errors'
import { createTestHono, jsonRequest } from '../helpers/test-app'
import type { Env, HonoVariables } from '../../src/types/env'

type AppType = { Bindings: Env; Variables: HonoVariables }

/**
 * Creates a minimal Hono app that throws the given error on GET /test,
 * with the onError handler attached.
 */
function createErrorApp(errorToThrow: Error) {
  const { app } = createTestHono()
  app.onError(onError)
  app.get('/test', () => {
    throw errorToThrow
  })
  return app
}

describe('error handler middleware (onError)', () => {
  describe('AppError handling', () => {
    it('should return correct statusCode and error shape for AppError', async () => {
      const app = createErrorApp(new AppError('Custom error', 418, 'TeapotError'))
      const res = await app.request('/test')

      expect(res.status).toBe(418)
      const body = await res.json()
      expect(body).toEqual({
        errors: [{ code: 'TeapotError', status: '418', detail: 'Custom error' }],
      })
    })

    it('should return default 500 for AppError without explicit statusCode', async () => {
      const app = createErrorApp(new AppError('Internal issue'))
      const res = await app.request('/test')

      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.errors[0].code).toBe('InternalServerError')
      expect(body.errors[0].status).toBe('500')
    })
  })

  describe('NotFoundError handling', () => {
    it('should return 404 with custom message', async () => {
      const app = createErrorApp(new NotFoundError('User not found'))
      const res = await app.request('/test')

      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body.errors[0]).toEqual({
        code: 'NotFoundError',
        status: '404',
        detail: 'User not found',
      })
    })

    it('should return 404 with default message', async () => {
      const app = createErrorApp(new NotFoundError())
      const res = await app.request('/test')

      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body.errors[0].detail).toBe('Resource not found')
    })
  })

  describe('ForbiddenError handling', () => {
    it('should return 403 with custom message', async () => {
      const app = createErrorApp(new ForbiddenError('No access'))
      const res = await app.request('/test')

      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.errors[0]).toEqual({
        code: 'ForbiddenError',
        status: '403',
        detail: 'No access',
      })
    })

    it('should return 403 with default message', async () => {
      const app = createErrorApp(new ForbiddenError())
      const res = await app.request('/test')

      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.errors[0].detail).toBe('Access denied')
    })
  })

  describe('ValidationError handling', () => {
    it('should return 422 with detail message', async () => {
      const app = createErrorApp(new ValidationError('Invalid input', [{ field: 'email' }]))
      const res = await app.request('/test')

      expect(res.status).toBe(422)
      const body = await res.json()
      expect(body.errors[0]).toEqual({
        code: 'ValidationError',
        status: '422',
        detail: 'Invalid input',
      })
    })

    it('should return 422 with default message', async () => {
      const app = createErrorApp(new ValidationError())
      const res = await app.request('/test')

      expect(res.status).toBe(422)
      const body = await res.json()
      expect(body.errors[0].detail).toBe('Validation failed')
    })
  })

  describe('unknown errors return 500 without leaking details', () => {
    it('should return 500 with generic message for non-AppError', async () => {
      const app = createErrorApp(new Error('Something broke internally'))
      const res = await app.request('/test')

      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body).toEqual({
        errors: [
          { code: 'InternalServerError', status: '500', detail: 'An unexpected error occurred.' },
        ],
      })
    })

    it('should not leak internal error message for non-AppError', async () => {
      const app = createErrorApp(new Error('Database connection string: secret@host'))
      const res = await app.request('/test')

      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.errors[0].detail).toBe('An unexpected error occurred.')
      expect(JSON.stringify(body)).not.toContain('secret@host')
    })

    it('should not leak stack trace in response', async () => {
      const err = new Error('internal details')
      err.stack = 'Error: internal details\n    at /app/src/secret/path.ts:42:10'
      const app = createErrorApp(err)
      const res = await app.request('/test')

      expect(res.status).toBe(500)
      const body = await res.json()
      expect(JSON.stringify(body)).not.toContain('secret/path')
      expect(JSON.stringify(body)).not.toContain('stack')
    })

    it('should handle TypeError gracefully', async () => {
      const app = createErrorApp(new TypeError('Cannot read properties of undefined'))
      const res = await app.request('/test')

      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.errors[0].detail).toBe('An unexpected error occurred.')
    })
  })

  describe('ZodError-like SyntaxError handling', () => {
    it('should return 400 for JSON parse errors', async () => {
      const err = new SyntaxError('Unexpected token } in JSON at position 5')
      const app = createErrorApp(err)
      const res = await app.request('/test')

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.errors[0]).toEqual({
        code: 'ParseError',
        status: '400',
        detail: 'Invalid JSON body',
      })
    })

    it('should not treat non-JSON SyntaxError as parse error', async () => {
      const err = new SyntaxError('Unexpected identifier')
      const app = createErrorApp(err)
      const res = await app.request('/test')

      // This SyntaxError does not include "JSON" in the message,
      // so it falls through to the generic 500 handler
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.errors[0].code).toBe('InternalServerError')
    })
  })

  describe('other AppError subtypes', () => {
    it('AuthenticationError should return 401', async () => {
      const app = createErrorApp(new AuthenticationError('Invalid token'))
      const res = await app.request('/test')

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.errors[0]).toEqual({
        code: 'AuthenticationError',
        status: '401',
        detail: 'Invalid token',
      })
    })

    it('ConflictError should return 409', async () => {
      const app = createErrorApp(new ConflictError('Username taken'))
      const res = await app.request('/test')

      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.errors[0]).toEqual({
        code: 'ConflictError',
        status: '409',
        detail: 'Username taken',
      })
    })

    it('ServerStateConflictError should return 409', async () => {
      const app = createErrorApp(new ServerStateConflictError())
      const res = await app.request('/test')

      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.errors[0]).toEqual({
        code: 'ServerStateConflictError',
        status: '409',
        detail: 'Server is in a conflicting state',
      })
    })

    it('TooManyRequestsError should return 429', async () => {
      const app = createErrorApp(new TooManyRequestsError())
      const res = await app.request('/test')

      expect(res.status).toBe(429)
      const body = await res.json()
      expect(body.errors[0]).toEqual({
        code: 'TooManyRequestsError',
        status: '429',
        detail: 'Too many requests',
      })
    })
  })
})
