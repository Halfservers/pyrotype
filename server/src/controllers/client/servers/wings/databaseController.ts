import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { z } from 'zod'
import { fractalList, fractalItem } from '../../../../utils/response'
import { NotFoundError, AppError } from '../../../../utils/errors'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

const storeDatabaseSchema = z.object({
  database: z.string().min(1).max(48),
  remote: z.string().default('%'),
})

function transformDatabase(db: any & { host?: any }) {
  return {
    id: db.id,
    host: {
      address: db.host?.host ?? '',
      port: db.host?.port ?? 3306,
    },
    name: db.database,
    username: db.username,
    connections_from: db.remote,
    max_connections: db.maxConnections ?? 0,
  }
}

export async function index(c: AppContext) {
  const serverId = c.req.param('server')
  const prisma = c.var.prisma

  const server: any = await prisma.server.findFirst({
    where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
    include: { databases: { include: { host: true } } },
  })

  if (!server) throw new NotFoundError('Server not found')

  const data = server.databases.map(transformDatabase)
  return c.json(fractalList('database', data))
}

export async function store(c: AppContext) {
  const serverId = c.req.param('server')
  const prisma = c.var.prisma
  const body = storeDatabaseSchema.parse(await c.req.json())

  const server: any = await prisma.server.findFirst({
    where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
    include: { databases: true, node: { include: { databaseHosts: true } } },
  })

  if (!server) throw new NotFoundError('Server not found')

  if (server.databaseLimit !== null && server.databases.length >= server.databaseLimit) {
    throw new AppError('Server database limit reached', 400, 'TooManyDatabases')
  }

  const host = server.node?.databaseHosts?.[0]
  if (!host) {
    throw new AppError('No database host available for this node', 500, 'NoDatabaseHost')
  }

  const username = `u${server.id}_${crypto.randomUUID().slice(0, 8)}`.slice(0, 100)
  const password = crypto.randomUUID()

  const database = await prisma.database.create({
    data: {
      serverId: server.id,
      databaseHostId: host.id,
      database: `s${server.id}_${body.database}`.slice(0, 48),
      username,
      remote: body.remote,
      password,
    },
    include: { host: true },
  })

  return c.json({
    ...fractalItem('database', transformDatabase(database)),
  })
}

export async function rotatePassword(c: AppContext) {
  const databaseId = parseInt(c.req.param('database'), 10)
  const prisma = c.var.prisma

  const database = await prisma.database.findUnique({
    where: { id: databaseId },
    include: { host: true },
  })

  if (!database) throw new NotFoundError('Database not found')

  const newPassword = crypto.randomUUID()

  const updated = await prisma.database.update({
    where: { id: databaseId },
    data: { password: newPassword },
    include: { host: true },
  })

  return c.json(fractalItem('database', {
    ...transformDatabase(updated),
    password: newPassword,
  }))
}

export async function deleteFn(c: AppContext) {
  const databaseId = parseInt(c.req.param('database'), 10)
  const prisma = c.var.prisma

  const database = await prisma.database.findUnique({ where: { id: databaseId } })
  if (!database) throw new NotFoundError('Database not found')

  await prisma.database.delete({ where: { id: databaseId } })

  return c.body(null, 204)
}
