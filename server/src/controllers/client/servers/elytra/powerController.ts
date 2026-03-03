import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { AppError } from '../../../../utils/errors'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

const VALID_SIGNALS = ['start', 'stop', 'restart', 'kill'] as const

export async function sendPower(c: AppContext) {
  const server = c.var.server!
  const body = await c.req.json()
  const signal = body.signal as string

  if (!signal || !VALID_SIGNALS.includes(signal as typeof VALID_SIGNALS[number])) {
    throw new AppError('An invalid power signal was provided.', 422, 'ValidationError')
  }

  // In production, this sends the power action to the Elytra daemon.
  // TODO: Activity log: server:power.{signal}

  return c.body(null, 204)
}
