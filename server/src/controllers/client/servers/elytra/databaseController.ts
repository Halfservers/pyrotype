import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { NotFoundError, AppError } from '../../../../utils/errors'
import { fractalItem, fractalList } from '../../../../utils/response'

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
  const prisma = c.var.prisma
  const { database: dbName, remote } = await c.req.json()

  if (!dbName) {
    throw new AppError('A database name must be provided.', 422, 'ValidationError')
  }

  // In production, this would deploy the database through the DatabaseManagementService.
  // Placeholder: the actual creation logic requires database host selection.
  const database = await prisma.database.create({
    data: {
      serverId: server.id,
      databaseHostId: 1, // placeholder
      database: `s${server.id}_${dbName}`,
      username: `u${server.id}_${dbName.substring(0, 8)}`,
      remote: remote ?? '%',
      password: '', // would be generated and encrypted
    },
  })

  // TODO: Activity log: server:database.create

  return c.json(fractalItem('database', database))
}

export async function rotatePassword(c: AppContext) {
  const server = c.var.server!
  const prisma = c.var.prisma
  const databaseId = c.req.param('database')

  const database = await prisma.database.findFirst({
    where: { id: parseInt(String(databaseId)), serverId: server.id },
  })

  if (!database) {
    throw new NotFoundError('Database not found.')
  }

  // In production, this rotates the password through DatabasePasswordService.
  // TODO: Activity log: server:database.rotate-password

  return c.json(fractalItem('database', database))
}

export async function deleteDatabase(c: AppContext) {
  const server = c.var.server!
  const prisma = c.var.prisma
  const databaseId = c.req.param('database')

  const database = await prisma.database.findFirst({
    where: { id: parseInt(String(databaseId)), serverId: server.id },
  })

  if (!database) {
    throw new NotFoundError('Database not found.')
  }

  // In production, this deletes through DatabaseManagementService.
  await prisma.database.delete({ where: { id: database.id } })

  // TODO: Activity log: server:database.delete

  return c.body(null, 204)
}
