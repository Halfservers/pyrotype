import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { fractalItem, fractalPaginated } from '../../utils/response'
import { paginationSchema, getPaginationOffset } from '../../utils/pagination'
import { NotFoundError } from '../../utils/errors'

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

export async function view(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const nest = await prisma.nest.findUnique({ where: { id } })
  if (!nest) throw new NotFoundError('Nest not found')

  return c.json(fractalItem('nest', transformNest(nest)))
}
