import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { NotFoundError } from '../../utils/errors'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function getInstallation(c: AppContext) {
  const prisma = c.var.prisma
  const node = c.var.node!
  const uuid = c.req.param('uuid')

  const server: any = await prisma.server.findFirst({
    where: { uuid, nodeId: node.id },
    include: { egg: true },
  })

  if (!server) {
    throw new NotFoundError('Server not found.')
  }

  const egg = server.egg

  return c.json({
    container_image: egg.scriptContainer,
    entrypoint: egg.scriptEntry,
    script: egg.scriptInstall,
  })
}

export async function reportInstallation(c: AppContext) {
  const prisma = c.var.prisma
  const node = c.var.node!
  const uuid = c.req.param('uuid')

  const server = await prisma.server.findFirst({
    where: { uuid, nodeId: node.id },
  })

  if (!server) {
    throw new NotFoundError('Server not found.')
  }

  const body = await c.req.json()
  const successful = body.successful ?? false
  const reinstall = body.reinstall ?? false

  let status: string | null = null

  if (!successful) {
    status = reinstall ? 'reinstall_failed' : 'install_failed'
  }

  // Keep the server suspended if it was already suspended
  if (server.status === 'suspended') {
    status = 'suspended'
  }

  await prisma.server.update({
    where: { id: server.id },
    data: {
      status,
      installedAt: new Date(),
    },
  })

  return c.body(null, 204)
}
