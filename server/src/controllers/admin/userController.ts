import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { fractalItem, fractalPaginated } from '../../utils/response'
import { paginationSchema, getPaginationOffset } from '../../utils/pagination'
import { NotFoundError } from '../../utils/errors'
import { hashPassword, generateUuid } from '../../utils/crypto'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

interface UserAttributes {
  id: number
  external_id: string | null
  uuid: string
  username: string
  email: string
  first_name: string | null
  last_name: string | null
  language: string
  root_admin: boolean
  '2fa_enabled': boolean
  created_at: string
  updated_at: string
}

function transformUser(user: any): UserAttributes {
  return {
    id: user.id,
    external_id: user.externalId,
    uuid: user.uuid,
    username: user.username,
    email: user.email,
    first_name: user.nameFirst,
    last_name: user.nameLast,
    language: user.language,
    root_admin: user.rootAdmin,
    '2fa_enabled': user.useTotp,
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString(),
  }
}

export async function index(c: AppContext) {
  const prisma = c.var.prisma
  const pagination = paginationSchema.parse({
    page: c.req.query('page'),
    per_page: c.req.query('per_page'),
  })
  const { skip, take } = getPaginationOffset(pagination)

  const filterEmail = c.req.query('filter[email]')
  const filterUuid = c.req.query('filter[uuid]')
  const filterUsername = c.req.query('filter[username]')
  const filterExternalId = c.req.query('filter[external_id]')

  const where: any = {}
  if (filterEmail) where.email = { contains: filterEmail }
  if (filterUuid) where.uuid = { contains: filterUuid }
  if (filterUsername) where.username = { contains: filterUsername }
  if (filterExternalId) where.externalId = filterExternalId

  const sort = c.req.query('sort')
  const orderBy: any = {}
  if (sort === 'id' || sort === '-id') {
    orderBy.id = sort.startsWith('-') ? 'desc' : 'asc'
  } else if (sort === 'uuid' || sort === '-uuid') {
    orderBy.uuid = sort.startsWith('-') ? 'desc' : 'asc'
  } else {
    orderBy.id = 'asc'
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, skip, take, orderBy }),
    prisma.user.count({ where }),
  ])

  return c.json(
    fractalPaginated('user', users.map(transformUser), total, pagination.page, pagination.per_page),
  )
}

export async function view(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) throw new NotFoundError('User not found')

  return c.json(fractalItem('user', transformUser(user)))
}

export async function store(c: AppContext) {
  const prisma = c.var.prisma
  const { external_id, username, email, name_first, name_last, password, root_admin, language } = await c.req.json()

  const hashedPassword = password ? await hashPassword(password) : await hashPassword(generateUuid())

  const user = await prisma.user.create({
    data: {
      uuid: generateUuid(),
      externalId: external_id || null,
      username,
      email,
      nameFirst: name_first,
      nameLast: name_last || null,
      password: hashedPassword,
      rootAdmin: root_admin ?? false,
      language: language ?? 'en',
    },
  })

  return c.json({
    ...fractalItem('user', transformUser(user)),
    meta: {
      resource: `/api/application/users/${user.id}`,
    },
  }, 201)
}

export async function update(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('User not found')

  const { external_id, username, email, name_first, name_last, password, root_admin, language } = await c.req.json()

  const data: any = {}
  if (external_id !== undefined) data.externalId = external_id || null
  if (username !== undefined) data.username = username
  if (email !== undefined) data.email = email
  if (name_first !== undefined) data.nameFirst = name_first
  if (name_last !== undefined) data.nameLast = name_last || null
  if (root_admin !== undefined) data.rootAdmin = root_admin
  if (language !== undefined) data.language = language
  if (password) data.password = await hashPassword(password)

  const user = await prisma.user.update({ where: { id }, data })

  return c.json(fractalItem('user', transformUser(user)))
}

export async function deleteUser(c: AppContext) {
  const prisma = c.var.prisma
  const id = parseInt(c.req.param('id'), 10)
  const user = await prisma.user.findUnique({
    where: { id },
    include: { servers: { select: { id: true } } },
  })
  if (!user) throw new NotFoundError('User not found')

  if (user.servers.length > 0) {
    return c.json({
      errors: [{
        code: 'ConflictError',
        status: '409',
        detail: 'Cannot delete a user that has active servers attached.',
      }],
    }, 409)
  }

  await prisma.user.delete({ where: { id } })
  return c.body(null, 204)
}
