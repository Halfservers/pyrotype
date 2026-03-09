import type { ErrorHandler } from 'hono'
import type { Env, HonoVariables } from '../types/env'
import { AppError } from '../utils/errors'
import { logger } from '../config/logger'

type AppEnv = { Bindings: Env; Variables: HonoVariables }

export const onError: ErrorHandler<AppEnv> = (err, c) => {
  logger.error(err.message, { stack: err.stack })

  if (err instanceof SyntaxError && err.message.includes('JSON')) {
    return c.json(
      { errors: [{ code: 'ParseError', status: '400', detail: 'Invalid JSON body' }] },
      400,
    )
  }

  if (err instanceof AppError) {
    return c.json(
      { errors: [{ code: err.code, status: String(err.statusCode), detail: err.message }] },
      err.statusCode as 400,
    )
  }

  return c.json(
    { errors: [{ code: 'InternalServerError', status: '500', detail: 'An unexpected error occurred.' }] },
    500,
  )
}
