import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { z } from 'zod'
import { NotFoundError } from '../../../../utils/errors'
import { getWingsClient } from '../../../../services/wings/client'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

const sendCommandSchema = z.object({
  command: z.string().min(1),
})

export async function index(c: AppContext) {
  const serverId = c.req.param('server')
  const prisma = c.var.prisma
  const { command } = sendCommandSchema.parse(await c.req.json())

  const server: any = await prisma.server.findFirst({
    where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
    include: { node: true },
  })

  if (!server) throw new NotFoundError('Server not found')

  const wings = getWingsClient(server.node!)
  await wings.sendCommand(server.uuid, command)

  return c.body(null, 204)
}
