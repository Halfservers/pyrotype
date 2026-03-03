import type { MiddlewareHandler } from 'hono'
import type { ZodSchema } from 'zod'
import type { Env, HonoVariables } from '../types/env'
import { ValidationError } from '../utils/errors'

type AppEnv = { Bindings: Env; Variables: HonoVariables }

interface ValidateOptions {
  body?: ZodSchema
  query?: ZodSchema
  params?: ZodSchema
}

/**
 * Returns a single Hono middleware that validates body, query, and/or params
 * using Zod schemas. Throws ValidationError on failure.
 */
export function validate(schemas: ValidateOptions): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    if (schemas.params) {
      const result = schemas.params.safeParse(c.req.param())
      if (!result.success) {
        throw new ValidationError('Validation failed', result.error.issues)
      }
    }
    if (schemas.query) {
      const result = schemas.query.safeParse(c.req.query())
      if (!result.success) {
        throw new ValidationError('Validation failed', result.error.issues)
      }
    }
    if (schemas.body) {
      const body = await c.req.json()
      const result = schemas.body.safeParse(body)
      if (!result.success) {
        throw new ValidationError('Validation failed', result.error.issues)
      }
    }
    await next()
  }
}
