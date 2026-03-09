import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { fractalItem, fractalPaginated } from '../../utils/response'
import { paginationSchema, getPaginationOffset } from '../../utils/pagination'
import { NotFoundError, ConflictError } from '../../utils/errors'
import { generateUuid } from '../../utils/crypto'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

function transformNest(nest: any) {
  return {
    id: nest.id,
    uuid: nest.uuid,
    author: nest.author,
    name: nest.name,
    description: nest.description,
    created_at: nest.createdAt.toISOString(),
    updated_at: nest.updatedAt.toISOString(),
  }
}

export async function index(c: AppContext) {
  const prisma = c.var.prisma
  const pagination = paginationSchema.parse({
    page: c.req.query('page'),
    per_page: c.req.query('per_page'),
  })
  const { skip, take } = getPaginationOffset(pagination)

  const [nests, total] = await Promise.all([
    prisma.nest.findMany({ skip, take, orderBy: { id: 'asc' } }),
    prisma.nest.count(),
  ])

  return c.json(fractalPaginated('nest', nests.map(transformNest), total, pagination.page, pagination.per_page))
}

export async function store(c: AppContext) {
  const prisma = c.var.prisma
  const { name, description } = await c.req.json()

  const nest = await prisma.nest.create({
    data: {
      uuid: generateUuid(),
      author: 'custom@local',
      name,
      description: description || null,
    },
  })

  return c.json(fractalItem('nest', transformNest(nest)), 201)
}

export async function view(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const nest = await prisma.nest.findUnique({ where: { id } })
  if (!nest) throw new NotFoundError('Nest not found')

  return c.json(fractalItem('nest', transformNest(nest)))
}

export async function update(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const existing = await prisma.nest.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('Nest not found')

  const { name, description } = await c.req.json()
  const data: any = {}
  if (name !== undefined) data.name = name
  if (description !== undefined) data.description = description

  const nest = await prisma.nest.update({ where: { id }, data })
  return c.json(fractalItem('nest', transformNest(nest)))
}

export async function deleteNest(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const nest = await prisma.nest.findUnique({
    where: { id },
    include: { eggs: { select: { id: true } } },
  })
  if (!nest) throw new NotFoundError('Nest not found')

  if (nest.eggs.length > 0) {
    throw new ConflictError('Cannot delete a nest that has eggs.')
  }

  const serverCount = await prisma.server.count({ where: { nestId: id } })
  if (serverCount > 0) {
    throw new ConflictError('Cannot delete a nest with active servers.')
  }

  await prisma.nest.delete({ where: { id } })
  return c.body(null, 204)
}
