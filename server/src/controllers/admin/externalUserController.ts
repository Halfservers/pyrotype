import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { fractalItem } from '../../utils/response'
import { NotFoundError } from '../../utils/errors'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

function transformUser(user: any) {
  return {
    id: user.id,
    external_id: user.externalId,
    uuid: user.uuid,
    username: user.username,
    email: user.email,
    first_name: user.nameFirst,
    last_name: user.nameLast,
    language: user.language,
    root_admin: user.rootAdmin,
    '2fa_enabled': user.useTotp,
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString(),
  }
}

export async function index(c: AppContext) {
  const prisma = c.var.prisma
  const externalId = c.req.param('externalId')
  const user = await prisma.user.findFirst({ where: { externalId } })
  if (!user) throw new NotFoundError('User not found')

  return c.json(fractalItem('user', transformUser(user)))
}
