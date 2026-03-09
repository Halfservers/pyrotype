import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { NotFoundError, AppError } from '../../../../utils/errors'
import { fractalItem, fractalList } from '../../../../utils/response'
import { generateToken } from '../../../../utils/crypto'
import { logActivity } from '../../../../services/activity'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function listDatabases(c: AppContext) {
  const server = c.var.server!
  const prisma = c.var.prisma

  const databases = await prisma.database.findMany({
    where: { serverId: server.id },
  })

  return c.json(fractalList('database', databases))
}

export async function createDatabase(c: AppContext) {
  const server = c.var.server!
  const user = c.var.user!
  const prisma = c.var.prisma
  const { database: dbName, remote } = await c.req.json()

  if (!dbName) {
    throw new AppError('A database name must be provided.', 422, 'ValidationError')
  }

  // Check database limit
  if (server.databaseLimit !== null) {
    const currentCount = await prisma.database.count({ where: { serverId: server.id } })
    if (currentCount >= (server.databaseLimit ?? 0)) {
      throw new AppError('This server has reached its database limit.', 400, 'BadRequest')
    }
  }

  // Find the best database host on this node
  const dbHost = await prisma.databaseHost.findFirst({
    where: { nodeId: server.nodeId },
    include: { _count: { select: { databases: true } } },
    orderBy: { id: 'asc' },
  })

  if (!dbHost) {
    throw new AppError('No database host is available for this node.', 500, 'InternalError')
  }

  if (dbHost.maxDatabases !== null && dbHost._count.databases >= dbHost.maxDatabases) {
    throw new AppError('The database host has reached its maximum capacity.', 500, 'InternalError')
  }

  const password = generateToken(24)

  const database = await prisma.database.create({
    data: {
      serverId: server.id,
      databaseHostId: dbHost.id,
      database: `s${server.id}_${dbName}`,
      username: `u${server.id}_${dbName.substring(0, 8)}`,
      remote: remote ?? '%',
      password,
    },
  })

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:database.create',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { database: database.database },
  })

  return c.json(fractalItem('database', database))
}

export async function rotatePassword(c: AppContext) {
  const server = c.var.server!
  const user = c.var.user!
  const prisma = c.var.prisma
  const databaseId = c.req.param('database')

  const database = await prisma.database.findFirst({
    where: { id: parseInt(String(databaseId)), serverId: server.id },
  })

  if (!database) {
    throw new NotFoundError('Database not found.')
  }

  const newPassword = generateToken(24)

  const updated = await prisma.database.update({
    where: { id: database.id },
    data: { password: newPassword },
  })

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:database.rotate-password',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { database: database.database },
  })

  return c.json(fractalItem('database', updated))
}

export async function deleteDatabase(c: AppContext) {
  const server = c.var.server!
  const user = c.var.user!
  const prisma = c.var.prisma
  const databaseId = c.req.param('database')

  const database = await prisma.database.findFirst({
    where: { id: parseInt(String(databaseId)), serverId: server.id },
  })

  if (!database) {
    throw new NotFoundError('Database not found.')
  }

  await prisma.database.delete({ where: { id: database.id } })

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:database.delete',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { database: database.database },
  })

  return c.body(null, 204)
}
