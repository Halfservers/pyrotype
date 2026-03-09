import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { fractalItem, fractalPaginated } from '../../utils/response'
import { paginationSchema, getPaginationOffset } from '../../utils/pagination'
import { NotFoundError, ConflictError } from '../../utils/errors'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

function transformLocation(loc: any) {
  return {
    id: loc.id,
    short: loc.short,
    long: loc.long,
    created_at: loc.createdAt.toISOString(),
    updated_at: loc.updatedAt.toISOString(),
  }
}

export async function index(c: AppContext) {
  const prisma = c.var.prisma
  const pagination = paginationSchema.parse({
    page: c.req.query('page'),
    per_page: c.req.query('per_page'),
  })
  const { skip, take } = getPaginationOffset(pagination)

  const filterShort = c.req.query('filter[short]')
  const filterLong = c.req.query('filter[long]')

  const where: any = {}
  if (filterShort) where.short = { contains: filterShort }
  if (filterLong) where.long = { contains: filterLong }

  const [locations, total] = await Promise.all([
    prisma.location.findMany({ where, skip, take, orderBy: { id: 'asc' } }),
    prisma.location.count({ where }),
  ])

  return c.json(fractalPaginated('location', locations.map(transformLocation), total, pagination.page, pagination.per_page))
}

export async function view(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const location = await prisma.location.findUnique({ where: { id } })
  if (!location) throw new NotFoundError('Location not found')

  return c.json(fractalItem('location', transformLocation(location)))
}

export async function store(c: AppContext) {
  const prisma = c.var.prisma
  const { short, long } = await c.req.json()

  const location = await prisma.location.create({
    data: { short, long: long || null },
  })

  return c.json({
    ...fractalItem('location', transformLocation(location)),
    meta: {
      resource: `/api/application/locations/${location.id}`,
    },
  }, 201)
}

export async function update(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const existing = await prisma.location.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('Location not found')

  const { short, long } = await c.req.json()
  const data: any = {}
  if (short !== undefined) data.short = short
  if (long !== undefined) data.long = long

  const location = await prisma.location.update({ where: { id }, data })
  return c.json(fractalItem('location', transformLocation(location)))
}

export async function deleteLocation(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const location = await prisma.location.findUnique({
    where: { id },
    include: { nodes: { select: { id: true } } },
  })
  if (!location) throw new NotFoundError('Location not found')

  if (location.nodes.length > 0) {
    throw new ConflictError('Cannot delete a location that has active nodes attached.')
  }

  await prisma.location.delete({ where: { id } })
  return c.body(null, 204)
}
