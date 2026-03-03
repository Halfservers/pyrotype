import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { hmacSign } from '../../../../utils/crypto'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function getUploadUrl(c: AppContext) {
  const server = c.var.server!
  const user = c.var.user!

  // Generate a signed upload token for the daemon.
  // In production, this creates a JWT with server_uuid claim
  // that the daemon validates before accepting the upload.
  const payload = {
    user_id: user.id,
    server_uuid: server.uuid,
    exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes
  }

  const token = await hmacSign(c.env.APP_KEY, JSON.stringify(payload))

  // In production, the URL would come from the node's connection address.
  const url = `/upload/file?token=${token}`

  return c.json({
    object: 'signed_url',
    attributes: { url },
  })
}
