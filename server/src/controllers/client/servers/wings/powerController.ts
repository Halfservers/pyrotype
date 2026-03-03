import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { z } from 'zod'
import { NotFoundError } from '../../../../utils/errors'
import { getWingsClient } from '../../../../services/wings/client'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

const sendPowerSchema = z.object({
  signal: z.enum(['start', 'stop', 'restart', 'kill']),
})

export async function index(c: AppContext) {
  const serverId = c.req.param('server')
  const prisma = c.var.prisma
  const { signal } = sendPowerSchema.parse(await c.req.json())

  const server: any = await prisma.server.findFirst({
    where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
    include: { node: true },
  })

  if (!server) throw new NotFoundError('Server not found')

  const wings = getWingsClient(server.node!)
  await wings.sendPowerAction(server.uuid, signal)

  return c.body(null, 204)
}
