import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { AppError } from '../../../../utils/errors'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function sendCommand(c: AppContext) {
  const server = c.var.server!
  const body = await c.req.json()
  const command = body.command as string

  if (!command || typeof command !== 'string') {
    throw new AppError('A command must be provided.', 422, 'ValidationError')
  }

  // In production, this sends the command to the Elytra daemon via HTTP.
  // The daemon connection would be made through the node's connection address.
  // Placeholder: daemon call would happen here.

  // TODO: Activity log: server:console.command

  return c.body(null, 204)
}
