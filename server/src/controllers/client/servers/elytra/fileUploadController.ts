import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { generateDaemonJWT } from '../../../../services/daemon/jwt'
import { getDaemonBaseUrl } from '../../../../services/daemon/proxy'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function getUploadUrl(c: AppContext) {
  const server = c.var.server!
  const node = server.node!
  const user = c.var.user!

  const token = await generateDaemonJWT(
    c.env.APP_KEY,
    { server_uuid: server.uuid, user_id: user.id },
    900,
  )

  const url = `${getDaemonBaseUrl(node)}/upload/file?token=${token}`

  return c.json({
    object: 'signed_url',
    attributes: { url },
  })
}
