import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { NotFoundError } from '../../utils/errors'
import { paginationSchema, getPaginationOffset } from '../../utils/pagination'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function index(c: AppContext) {
  const prisma = c.var.prisma
  const user = c.var.user!
  const query = c.req.query()
  const pagination = paginationSchema.parse({
    ...query,
    per_page: query.per_page ?? '15',
  })
  const { skip, take } = getPaginationOffset(pagination)

  const where = {
    notifiableType: 'user',
    notifiableId: BigInt(user.id),
  }

  const [notifications, total, unread] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { ...where, readAt: null } }),
  ])

  return c.json({
    object: 'list',
    data: notifications.map((n: any) => ({
      id: n.id,
      type: n.type,
      data: n.data,
      read_at: n.readAt?.toISOString() ?? null,
      created_at: n.createdAt.toISOString(),
    })),
    meta: {
      pagination: {
        total,
        count: notifications.length,
        per_page: pagination.per_page,
        current_page: pagination.page,
        total_pages: Math.ceil(total / pagination.per_page),
      },
      unread_count: unread,
    },
  })
}

export async function markRead(c: AppContext) {
  const prisma = c.var.prisma
  const user = c.var.user!
  const body = await c.req.json()
  const ids = body?.ids

  if (!Array.isArray(ids) || ids.length === 0) {
    return c.json({ error: 'ids array is required' }, 422)
  }

  await prisma.notification.updateMany({
    where: {
      id: { in: ids },
      notifiableType: 'user',
      notifiableId: BigInt(user.id),
      readAt: null,
    },
    data: { readAt: new Date() },
  })

  return c.body(null, 204)
}

export async function markAllRead(c: AppContext) {
  const prisma = c.var.prisma
  const user = c.var.user!

  await prisma.notification.updateMany({
    where: {
      notifiableType: 'user',
      notifiableId: BigInt(user.id),
      readAt: null,
    },
    data: { readAt: new Date() },
  })

  return c.body(null, 204)
}

export async function deleteFn(c: AppContext) {
  const prisma = c.var.prisma
  const user = c.var.user!
  const id = c.req.param('id')

  const notification = await prisma.notification.findFirst({
    where: {
      id,
      notifiableType: 'user',
      notifiableId: BigInt(user.id),
    },
  })

  if (!notification) throw new NotFoundError('Notification not found')

  await prisma.notification.delete({ where: { id } })
  return c.body(null, 204)
}
