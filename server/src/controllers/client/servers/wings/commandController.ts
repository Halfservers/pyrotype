import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { z } from 'zod'
import { NotFoundError } from '../../../../utils/errors'
import { getWingsClient } from '../../../../services/wings/client'
import { logActivity } from '../../../../services/activity'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

const sendCommandSchema = z.object({
  command: z.string().min(1),
})

export async function index(c: AppContext) {
  const serverId = c.req.param('server')
  const prisma = c.var.prisma
  const user = c.var.user!
  const { command } = sendCommandSchema.parse(await c.req.json())

  const server: any = await prisma.server.findFirst({
    where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
    include: { node: true },
  })

  if (!server) throw new NotFoundError('Server not found')

  const wings = getWingsClient(server.node!)
  await wings.sendCommand(server.uuid, command)

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:console.command',
    ip,
    userId: user.id,
    serverId: server.id,
  })

  return c.body(null, 204)
}
