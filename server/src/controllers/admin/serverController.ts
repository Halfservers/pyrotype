import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { fractalItem, fractalPaginated } from '../../utils/response'
import { paginationSchema, getPaginationOffset } from '../../utils/pagination'
import { NotFoundError } from '../../utils/errors'
import { generateUuid } from '../../utils/crypto'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

function transformServer(server: any) {
  const attrs: any = {
    id: server.id,
    external_id: server.externalId,
    uuid: server.uuid,
    identifier: server.uuidShort,
    name: server.name,
    description: server.description,
    status: server.status,
    suspended: server.status === 'suspended',
    limits: {
      memory: server.memory,
      swap: server.swap,
      disk: server.disk,
      io: server.io,
      cpu: server.cpu,
      threads: server.threads,
      oom_disabled: server.oomDisabled,
    },
    feature_limits: {
      databases: server.databaseLimit ?? 0,
      allocations: server.allocationLimit ?? 0,
      backups: server.backupLimit ?? 0,
      backup_storage: server.backupStorageLimit ?? 0,
    },
    user: server.ownerId,
    node: server.nodeId,
    allocation: server.allocationId,
    nest: server.nestId,
    egg: server.eggId,
    container: {
      startup_command: server.startup,
      image: server.image,
      installed_at: server.installedAt?.toISOString() ?? null,
    },
    created_at: server.createdAt.toISOString(),
    updated_at: server.updatedAt.toISOString(),
  }

  return attrs
}

export async function index(c: AppContext) {
  const prisma = c.var.prisma
  const pagination = paginationSchema.parse({
    page: c.req.query('page'),
    per_page: c.req.query('per_page'),
  })
  const { skip, take } = getPaginationOffset(pagination)

  const filterName = c.req.query('filter[name]')
  const filterUuid = c.req.query('filter[uuid]')
  const filterExternalId = c.req.query('filter[external_id]')
  const filterImage = c.req.query('filter[image]')

  const where: any = {}
  if (filterName) where.name = { contains: filterName }
  if (filterUuid) where.uuid = { contains: filterUuid }
  if (filterExternalId) where.externalId = filterExternalId
  if (filterImage) where.image = { contains: filterImage }

  const sort = c.req.query('sort')
  const orderBy: any = {}
  if (sort === 'id' || sort === '-id') {
    orderBy.id = sort.startsWith('-') ? 'desc' : 'asc'
  } else if (sort === 'uuid' || sort === '-uuid') {
    orderBy.uuid = sort.startsWith('-') ? 'desc' : 'asc'
  } else {
    orderBy.id = 'asc'
  }

  const [servers, total] = await Promise.all([
    prisma.server.findMany({ where, skip, take, orderBy }),
    prisma.server.count({ where }),
  ])

  return c.json(fractalPaginated('server', servers.map(transformServer), total, pagination.page, pagination.per_page))
}

export async function view(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const server = await prisma.server.findUnique({ where: { id } })
  if (!server) throw new NotFoundError('Server not found')

  return c.json(fractalItem('server', transformServer(server)))
}

export async function store(c: AppContext) {
  const prisma = c.var.prisma
  const body = await c.req.json()

  const uuid = generateUuid()
  const uuidShort = uuid.slice(0, 8)

  const server = await prisma.server.create({
    data: {
      uuid,
      uuidShort,
      externalId: body.external_id || null,
      name: body.name,
      description: body.description || '',
      ownerId: body.owner_id,
      nodeId: body.node_id,
      allocationId: body.allocation_id,
      nestId: body.nest_id,
      eggId: body.egg_id,
      startup: body.startup,
      image: body.image,
      memory: body.memory ?? 0,
      swap: body.swap ?? 0,
      disk: body.disk ?? 0,
      io: body.io ?? 500,
      cpu: body.cpu ?? 0,
      threads: body.threads || null,
      oomDisabled: body.oom_disabled ?? true,
      databaseLimit: body.database_limit ?? null,
      allocationLimit: body.allocation_limit ?? null,
      backupLimit: body.backup_limit ?? null,
      backupStorageLimit: body.backup_storage_limit ?? null,
      skipScripts: body.skip_scripts ?? false,
    },
  })

  return c.json(fractalItem('server', transformServer(server)), 201)
}

export async function deleteServer(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const force = c.req.param('force') === 'force'

  const server = await prisma.server.findUnique({ where: { id } })
  if (!server) throw new NotFoundError('Server not found')

  // TODO: call daemon to delete the server files if not force
  // For now just delete from database
  if (force) {
    await prisma.server.delete({ where: { id } })
  } else {
    await prisma.server.delete({ where: { id } })
  }

  return c.body(null, 204)
}
