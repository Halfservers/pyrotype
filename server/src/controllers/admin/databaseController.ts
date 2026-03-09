import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { fractalItem, fractalPaginated } from '../../utils/response'
import { NotFoundError, ValidationError } from '../../utils/errors'
import { createRemoteDatabase, deleteRemoteDatabase, resetRemoteDatabasePassword } from '../../services/databases'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

function transformDatabase(db: any) {
  return {
    id: db.id,
    server: db.serverId,
    host: db.databaseHostId,
    database: db.database,
    username: db.username,
    remote: db.remote,
    max_connections: db.maxConnections,
    created_at: db.createdAt.toISOString(),
    updated_at: db.updatedAt.toISOString(),
  }
}

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function index(c: AppContext) {
  const prisma = c.var.prisma
  const serverId = parseInt(c.req.param('id'), 10)
  const server = await prisma.server.findUnique({ where: { id: serverId } })
  if (!server) throw new NotFoundError('Server not found')

  const databases = await prisma.database.findMany({
    where: { serverId },
    orderBy: { id: 'asc' },
  })

  return c.json(fractalPaginated(
    'server_database',
    databases.map(transformDatabase),
    databases.length,
    1,
    databases.length || 50,
  ))
}

export async function view(c: AppContext) {
  const prisma = c.var.prisma
  const serverId = parseInt(c.req.param('id'), 10)
  const dbId = parseInt(c.req.param('dbId'), 10)

  const database = await prisma.database.findFirst({
    where: { id: dbId, serverId },
  })
  if (!database) throw new NotFoundError('Database not found')

  return c.json(fractalItem('server_database', transformDatabase(database)))
}

export async function store(c: AppContext) {
  const prisma = c.var.prisma
  const serverId = parseInt(c.req.param('id'), 10)
  const server = await prisma.server.findUnique({ where: { id: serverId } })
  if (!server) throw new NotFoundError('Server not found')

  // Check database limit
  if (server.databaseLimit !== null) {
    const currentCount = await prisma.database.count({ where: { serverId } })
    if (currentCount >= server.databaseLimit) {
      throw new ValidationError('Server has reached its database limit')
    }
  }

  const { database, remote, host } = await c.req.json()

  if (!host) {
    throw new ValidationError('A database host must be specified')
  }

  const dbHost = await prisma.databaseHost.findUnique({ where: { id: host } })
  if (!dbHost) throw new NotFoundError('Database host not found')

  const dbName = `s${serverId}_${database}`
  const username = `u${serverId}_${randomHex(4)}`
  const password = randomHex(16)

  const created = await prisma.database.create({
    data: {
      serverId,
      databaseHostId: host,
      database: dbName,
      username,
      remote: remote ?? '%',
      password,
      maxConnections: 0,
    },
  })

  // Create the actual database and user on the remote MySQL host
  await createRemoteDatabase(dbHost, dbName, username, password, remote ?? '%', 0)

  return c.json({
    ...fractalItem('server_database', transformDatabase(created)),
    meta: {
      resource: `/api/application/servers/${serverId}/databases/${created.id}`,
    },
  }, 201)
}

export async function resetPassword(c: AppContext) {
  const prisma = c.var.prisma
  const serverId = parseInt(c.req.param('id'), 10)
  const dbId = parseInt(c.req.param('dbId'), 10)

  const database = await prisma.database.findFirst({
    where: { id: dbId, serverId },
  })
  if (!database) throw new NotFoundError('Database not found')

  const newPassword = randomHex(16)

  await prisma.database.update({
    where: { id: dbId },
    data: { password: newPassword },
  })

  // Update the password on the remote MySQL host
  const dbHost = await prisma.databaseHost.findUnique({ where: { id: database.databaseHostId } })
  if (dbHost) {
    await resetRemoteDatabasePassword(dbHost, database.database, database.username, newPassword, database.remote, database.maxConnections ?? 0)
  }

  return c.body(null, 204)
}

export async function deleteDatabase(c: AppContext) {
  const prisma = c.var.prisma
  const serverId = parseInt(c.req.param('id'), 10)
  const dbId = parseInt(c.req.param('dbId'), 10)

  const database = await prisma.database.findFirst({
    where: { id: dbId, serverId },
  })
  if (!database) throw new NotFoundError('Database not found')

  // Drop the database and user on the remote MySQL host
  const dbHost = await prisma.databaseHost.findUnique({ where: { id: database.databaseHostId } })
  if (dbHost) {
    await deleteRemoteDatabase(dbHost, database.database, database.username, database.remote)
  }

  await prisma.database.delete({ where: { id: dbId } })
  return c.body(null, 204)
}
