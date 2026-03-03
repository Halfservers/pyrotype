import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { fractalItem } from '../../../../utils/response'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function getServer(c: AppContext) {
  const server = c.var.server!
  const user = c.var.user!

  const isOwner = user.id === server.ownerId

  return c.json(fractalItem('server', {
    ...server,
    meta: {
      is_server_owner: isOwner,
      user_permissions: c.var.serverPermissions ?? [],
    },
  }))
}
