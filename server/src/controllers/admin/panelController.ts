import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function status(c: AppContext) {
  const prisma = c.var.prisma

  const [serverCount, userCount, nodeCount, nestCount] = await Promise.all([
    prisma.server.count(),
    prisma.user.count(),
    prisma.node.count(),
    prisma.nest.count(),
  ])

  return c.json({
    object: 'panel_status',
    attributes: {
      version: '1.0.0',
      servers: serverCount,
      users: userCount,
      nodes: nodeCount,
      nests: nestCount,
    },
  })
}
