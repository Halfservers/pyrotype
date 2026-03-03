import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { fractalItem, fractalPaginated } from '../../utils/response'
import { paginationSchema, getPaginationOffset } from '../../utils/pagination'
import { NotFoundError, ConflictError } from '../../utils/errors'
import { generateUuid } from '../../utils/crypto'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

function transformNode(node: any) {
  return {
    id: node.id,
    uuid: node.uuid,
    public: node.public,
    name: node.name,
    description: node.description,
    location_id: node.locationId,
    fqdn: node.fqdn,
    internal_fqdn: node.internalFqdn,
    use_separate_fqdns: node.useSeparateFqdns,
    scheme: node.scheme,
    behind_proxy: node.behindProxy,
    maintenance_mode: node.maintenanceMode,
    memory: node.memory,
    memory_overallocate: node.memoryOverallocate,
    disk: node.disk,
    disk_overallocate: node.diskOverallocate,
    upload_size: node.uploadSize,
    daemon_listen: node.daemonListen,
    daemon_sftp: node.daemonSFTP,
    daemon_base: node.daemonBase,
    daemon_type: node.daemonType,
    backup_disk: node.backupDisk,
    created_at: node.createdAt.toISOString(),
    updated_at: node.updatedAt.toISOString(),
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
  const filterFqdn = c.req.query('filter[fqdn]')
  const filterUuid = c.req.query('filter[uuid]')

  const where: any = {}
  if (filterName) where.name = { contains: filterName }
  if (filterFqdn) where.fqdn = { contains: filterFqdn }
  if (filterUuid) where.uuid = { contains: filterUuid }

  const sort = c.req.query('sort')
  const orderBy: any = {}
  if (sort === 'memory' || sort === '-memory') {
    orderBy.memory = sort.startsWith('-') ? 'desc' : 'asc'
  } else if (sort === 'disk' || sort === '-disk') {
    orderBy.disk = sort.startsWith('-') ? 'desc' : 'asc'
  } else {
    orderBy.id = 'asc'
  }

  const [nodes, total] = await Promise.all([
    prisma.node.findMany({ where, skip, take, orderBy }),
    prisma.node.count({ where }),
  ])

  return c.json(fractalPaginated('node', nodes.map(transformNode), total, pagination.page, pagination.per_page))
}

export async function view(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const node = await prisma.node.findUnique({ where: { id } })
  if (!node) throw new NotFoundError('Node not found')

  return c.json(fractalItem('node', transformNode(node)))
}

export async function store(c: AppContext) {
  const prisma = c.var.prisma
  const body = await c.req.json()

  const tokenBytes = new Uint8Array(8)
  const secretBytes = new Uint8Array(32)
  crypto.getRandomValues(tokenBytes)
  crypto.getRandomValues(secretBytes)
  const daemonTokenId = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('')
  const daemonToken = Array.from(secretBytes).map(b => b.toString(16).padStart(2, '0')).join('')

  const node = await prisma.node.create({
    data: {
      uuid: generateUuid(),
      name: body.name,
      description: body.description || null,
      locationId: body.location_id,
      fqdn: body.fqdn,
      internalFqdn: body.internal_fqdn || null,
      useSeparateFqdns: body.use_separate_fqdns ?? false,
      scheme: body.scheme ?? 'https',
      behindProxy: body.behind_proxy ?? false,
      public: body.public ?? true,
      trustAlias: body.trust_alias ?? false,
      memory: body.memory,
      memoryOverallocate: body.memory_overallocate ?? 0,
      disk: body.disk,
      diskOverallocate: body.disk_overallocate ?? 0,
      daemonBase: body.daemon_base ?? '/var/lib/pterodactyl/volumes',
      daemonSFTP: body.daemon_sftp ?? 2022,
      daemonListen: body.daemon_listen ?? 8080,
      uploadSize: body.upload_size ?? 100,
      maintenanceMode: body.maintenance_mode ?? false,
      daemonType: body.daemon_type ?? 'elytra',
      backupDisk: body.backup_disk ?? 'local',
      daemonTokenId,
      daemonToken,
    },
  })

  return c.json({
    ...fractalItem('node', transformNode(node)),
    meta: {
      resource: `/api/application/nodes/${node.id}`,
    },
  }, 201)
}

export async function update(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const existing = await prisma.node.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('Node not found')

  const body = await c.req.json()
  const data: any = {}

  if (body.name !== undefined) data.name = body.name
  if (body.description !== undefined) data.description = body.description
  if (body.location_id !== undefined) data.locationId = body.location_id
  if (body.fqdn !== undefined) data.fqdn = body.fqdn
  if (body.internal_fqdn !== undefined) data.internalFqdn = body.internal_fqdn
  if (body.use_separate_fqdns !== undefined) data.useSeparateFqdns = body.use_separate_fqdns
  if (body.scheme !== undefined) data.scheme = body.scheme
  if (body.behind_proxy !== undefined) data.behindProxy = body.behind_proxy
  if (body.public !== undefined) data.public = body.public
  if (body.trust_alias !== undefined) data.trustAlias = body.trust_alias
  if (body.memory !== undefined) data.memory = body.memory
  if (body.memory_overallocate !== undefined) data.memoryOverallocate = body.memory_overallocate
  if (body.disk !== undefined) data.disk = body.disk
  if (body.disk_overallocate !== undefined) data.diskOverallocate = body.disk_overallocate
  if (body.daemon_base !== undefined) data.daemonBase = body.daemon_base
  if (body.daemon_sftp !== undefined) data.daemonSFTP = body.daemon_sftp
  if (body.daemon_listen !== undefined) data.daemonListen = body.daemon_listen
  if (body.upload_size !== undefined) data.uploadSize = body.upload_size
  if (body.maintenance_mode !== undefined) data.maintenanceMode = body.maintenance_mode
  if (body.daemon_type !== undefined) data.daemonType = body.daemon_type
  if (body.backup_disk !== undefined) data.backupDisk = body.backup_disk

  if (body.reset_secret === true) {
    const tokenBytes = new Uint8Array(8)
    const secretBytes = new Uint8Array(32)
    crypto.getRandomValues(tokenBytes)
    crypto.getRandomValues(secretBytes)
    data.daemonTokenId = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('')
    data.daemonToken = Array.from(secretBytes).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const node = await prisma.node.update({ where: { id }, data })
  return c.json(fractalItem('node', transformNode(node)))
}

export async function deleteNode(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const node = await prisma.node.findUnique({
    where: { id },
    include: { servers: { select: { id: true } } },
  })
  if (!node) throw new NotFoundError('Node not found')

  if (node.servers.length > 0) {
    throw new ConflictError('Cannot delete a node that has active servers attached.')
  }

  await prisma.node.delete({ where: { id } })
  return c.body(null, 204)
}
