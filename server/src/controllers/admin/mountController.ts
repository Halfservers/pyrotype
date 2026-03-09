import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { fractalItem, fractalPaginated } from '../../utils/response'
import { paginationSchema, getPaginationOffset } from '../../utils/pagination'
import { NotFoundError, ConflictError } from '../../utils/errors'
import { generateUuid } from '../../utils/crypto'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

function transformMount(mount: any) {
  return {
    id: mount.id,
    uuid: mount.uuid,
    name: mount.name,
    description: mount.description,
    source: mount.source,
    target: mount.target,
    read_only: mount.readOnly,
    user_mountable: mount.userMountable,
    eggs: mount.eggMounts ? mount.eggMounts.map((e: any) => e.eggId) : undefined,
    nodes: mount.mountNodes ? mount.mountNodes.map((n: any) => n.nodeId) : undefined,
    servers: mount.mountServers ? mount.mountServers.map((s: any) => s.serverId) : undefined,
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

  const [mounts, total] = await Promise.all([
    prisma.mount.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'asc' },
      include: {
        _count: { select: { eggMounts: true, mountNodes: true, mountServers: true } },
      },
    }),
    prisma.mount.count({ where }),
  ])

  const transformed = mounts.map((mount: any) => ({
    ...transformMount(mount),
    eggs_count: mount._count?.eggMounts ?? 0,
    nodes_count: mount._count?.mountNodes ?? 0,
    servers_count: mount._count?.mountServers ?? 0,
  }))

  return c.json(fractalPaginated('mount', transformed, total, pagination.page, pagination.per_page))
}

export async function view(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)

  const mount = await prisma.mount.findUnique({
    where: { id },
    include: {
      eggMounts: true,
      mountNodes: true,
      mountServers: true,
    },
  })
  if (!mount) throw new NotFoundError('Mount not found')

  return c.json(fractalItem('mount', transformMount(mount)))
}

export async function store(c: AppContext) {
  const prisma = c.var.prisma
  const body = await c.req.json()

  const mount = await prisma.mount.create({
    data: {
      uuid: generateUuid(),
      name: body.name,
      description: body.description ?? null,
      source: body.source,
      target: body.target,
      readOnly: body.read_only ?? false,
      userMountable: body.user_mountable ?? false,
    },
    include: {
      eggMounts: true,
      mountNodes: true,
      mountServers: true,
    },
  })

  return c.json({
    ...fractalItem('mount', transformMount(mount)),
    meta: {
      resource: `/api/application/mounts/${mount.id}`,
    },
  }, 201)
}

export async function update(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)

  const existing = await prisma.mount.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('Mount not found')

  const body = await c.req.json()
  const data: any = {}

  if (body.name !== undefined) data.name = body.name
  if (body.description !== undefined) data.description = body.description
  if (body.source !== undefined) data.source = body.source
  if (body.target !== undefined) data.target = body.target
  if (body.read_only !== undefined) data.readOnly = body.read_only
  if (body.user_mountable !== undefined) data.userMountable = body.user_mountable

  const mount = await prisma.mount.update({
    where: { id },
    data,
    include: {
      eggMounts: true,
      mountNodes: true,
      mountServers: true,
    },
  })

  return c.json(fractalItem('mount', transformMount(mount)))
}

export async function deleteMount(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)

  const mount = await prisma.mount.findUnique({
    where: { id },
    include: { mountServers: { select: { serverId: true } } },
  })
  if (!mount) throw new NotFoundError('Mount not found')

  if (mount.mountServers.length > 0) {
    throw new ConflictError('Cannot delete a mount that is attached to servers.')
  }

  await prisma.mount.delete({ where: { id } })
  return c.body(null, 204)
}

export async function addEggs(c: AppContext) {
  const prisma = c.var.prisma
  const mountId = parseInt(c.req.param('id'), 10)

  const mount = await prisma.mount.findUnique({ where: { id: mountId } })
  if (!mount) throw new NotFoundError('Mount not found')

  const body = await c.req.json()
  const eggs: number[] = body.eggs ?? []

  const existing = await prisma.eggMount.findMany({
    where: { mountId, eggId: { in: eggs } },
    select: { eggId: true },
  })
  const existingIds = new Set(existing.map((e: any) => e.eggId))
  const newEggs = eggs.filter((id) => !existingIds.has(id))

  if (newEggs.length > 0) {
    await prisma.eggMount.createMany({
      data: newEggs.map((eggId: number) => ({ eggId, mountId })),
    })
  }

  const updated = await prisma.mount.findUnique({
    where: { id: mountId },
    include: { eggMounts: true, mountNodes: true, mountServers: true },
  })

  return c.json(fractalItem('mount', transformMount(updated)))
}

export async function addNodes(c: AppContext) {
  const prisma = c.var.prisma
  const mountId = parseInt(c.req.param('id'), 10)

  const mount = await prisma.mount.findUnique({ where: { id: mountId } })
  if (!mount) throw new NotFoundError('Mount not found')

  const body = await c.req.json()
  const nodes: number[] = body.nodes ?? []

  const existing = await prisma.mountNode.findMany({
    where: { mountId, nodeId: { in: nodes } },
    select: { nodeId: true },
  })
  const existingIds = new Set(existing.map((n: any) => n.nodeId))
  const newNodes = nodes.filter((id) => !existingIds.has(id))

  if (newNodes.length > 0) {
    await prisma.mountNode.createMany({
      data: newNodes.map((nodeId: number) => ({ nodeId, mountId })),
    })
  }

  const updated = await prisma.mount.findUnique({
    where: { id: mountId },
    include: { eggMounts: true, mountNodes: true, mountServers: true },
  })

  return c.json(fractalItem('mount', transformMount(updated)))
}

export async function deleteEgg(c: AppContext) {
  const prisma = c.var.prisma
  const mountId = parseInt(c.req.param('id'), 10)
  const eggId = parseInt(c.req.param('eggId'), 10)

  const record = await prisma.eggMount.findUnique({
    where: { eggId_mountId: { eggId, mountId } },
  })
  if (!record) throw new NotFoundError('Egg mount association not found')

  await prisma.eggMount.delete({
    where: { eggId_mountId: { eggId, mountId } },
  })

  return c.body(null, 204)
}

export async function deleteNode(c: AppContext) {
  const prisma = c.var.prisma
  const mountId = parseInt(c.req.param('id'), 10)
  const nodeId = parseInt(c.req.param('nodeId'), 10)

  const record = await prisma.mountNode.findUnique({
    where: { nodeId_mountId: { nodeId, mountId } },
  })
  if (!record) throw new NotFoundError('Node mount association not found')

  await prisma.mountNode.delete({
    where: { nodeId_mountId: { nodeId, mountId } },
  })

  return c.body(null, 204)
}
