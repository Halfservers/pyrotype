import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { NotFoundError } from '../../utils/errors'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function suspend(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const server = await prisma.server.findUnique({ where: { id } })
  if (!server) throw new NotFoundError('Server not found')

  await prisma.server.update({
    where: { id },
    data: { status: 'suspended' },
  })

  // TODO: notify daemon to suspend the server

  return c.body(null, 204)
}

export async function unsuspend(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const server = await prisma.server.findUnique({ where: { id } })
  if (!server) throw new NotFoundError('Server not found')

  await prisma.server.update({
    where: { id },
    data: { status: null },
  })

  // TODO: notify daemon to unsuspend the server

  return c.body(null, 204)
}

export async function reinstall(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const server = await prisma.server.findUnique({
    where: { id },
    include: { node: true },
  })
  if (!server) throw new NotFoundError('Server not found')

  await prisma.server.update({
    where: { id },
    data: { status: 'installing', installedAt: null },
  })

  // TODO: call daemon reinstall endpoint

  return c.body(null, 204)
}
