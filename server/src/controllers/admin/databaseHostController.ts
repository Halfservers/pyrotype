import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { fractalItem, fractalPaginated } from '../../utils/response'
import { paginationSchema, getPaginationOffset } from '../../utils/pagination'
import { NotFoundError, ConflictError } from '../../utils/errors'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

function transformDatabaseHost(host: any) {
  return {
    id: host.id,
    name: host.name,
    host: host.host,
    port: host.port,
    username: host.username,
    max_databases: host.maxDatabases,
    node_id: host.nodeId,
    created_at: host.createdAt.toISOString(),
    updated_at: host.updatedAt.toISOString(),
    databases_count: host._count?.databases ?? 0,
  }
}

export async function index(c: AppContext) {
  const prisma = c.var.prisma
  const pagination = paginationSchema.parse({
    page: c.req.query('page'),
    per_page: c.req.query('per_page'),
  })
  const { skip, take } = getPaginationOffset(pagination)

  const filterName = c.req.query('filter[name]')

  const where: any = {}
  if (filterName) where.name = { contains: filterName }

  const [hosts, total] = await Promise.all([
    prisma.databaseHost.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'asc' },
      include: { _count: { select: { databases: true } } },
    }),
    prisma.databaseHost.count({ where }),
  ])

  return c.json(fractalPaginated('database_host', hosts.map(transformDatabaseHost), total, pagination.page, pagination.per_page))
}

export async function view(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const host = await prisma.databaseHost.findUnique({
    where: { id },
    include: { _count: { select: { databases: true } } },
  })
  if (!host) throw new NotFoundError('Database host not found')

  return c.json(fractalItem('database_host', transformDatabaseHost(host)))
}

export async function store(c: AppContext) {
  const prisma = c.var.prisma
  const body = await c.req.json()

  const host = await prisma.databaseHost.create({
    data: {
      name: body.name,
      host: body.host,
      port: body.port ?? 3306,
      username: body.username,
      password: body.password,
      maxDatabases: body.max_databases ?? null,
      nodeId: body.node_id ?? null,
    },
    include: { _count: { select: { databases: true } } },
  })

  return c.json({
    ...fractalItem('database_host', transformDatabaseHost(host)),
    meta: {
      resource: `/api/application/database-hosts/${host.id}`,
    },
  }, 201)
}

export async function update(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const existing = await prisma.databaseHost.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('Database host not found')

  const body = await c.req.json()
  const data: any = {}

  if (body.name !== undefined) data.name = body.name
  if (body.host !== undefined) data.host = body.host
  if (body.port !== undefined) data.port = body.port
  if (body.username !== undefined) data.username = body.username
  if (body.password !== undefined) data.password = body.password
  if (body.max_databases !== undefined) data.maxDatabases = body.max_databases
  if (body.node_id !== undefined) data.nodeId = body.node_id

  const host = await prisma.databaseHost.update({
    where: { id },
    data,
    include: { _count: { select: { databases: true } } },
  })

  return c.json(fractalItem('database_host', transformDatabaseHost(host)))
}

export async function deleteHost(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const host = await prisma.databaseHost.findUnique({
    where: { id },
    include: { databases: { select: { id: true } } },
  })
  if (!host) throw new NotFoundError('Database host not found')

  if (host.databases.length > 0) {
    throw new ConflictError('Cannot delete a database host that has databases.')
  }

  await prisma.databaseHost.delete({ where: { id } })
  return c.body(null, 204)
}
