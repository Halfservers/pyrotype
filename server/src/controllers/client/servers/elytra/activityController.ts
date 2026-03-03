import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { ForbiddenError } from '../../../../utils/errors'
import { fractalPaginated } from '../../../../utils/response'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function getActivity(c: AppContext) {
  const server = c.var.server!
  const user = c.var.user!
  const permissions = c.var.serverPermissions ?? []

  if (!user.rootAdmin && !permissions.includes('activity.read')) {
    throw new ForbiddenError('Missing permission: activity.read')
  }

  const prisma = c.var.prisma
  const page = Math.max(1, parseInt(c.req.query('page') ?? '') || 1)
  const perPage = Math.min(100, Math.max(1, parseInt(c.req.query('per_page') ?? '') || 25))
  const skip = (page - 1) * perPage

  const eventFilter = c.req.query('filter[event]')

  const where: Record<string, unknown> = {
    subjects: { some: { subjectId: server.id, subjectType: 'server' } },
  }

  if (eventFilter) {
    where.event = { contains: eventFilter }
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip,
      take: perPage,
    }),
    prisma.activityLog.count({ where }),
  ])

  return c.json(fractalPaginated('activity_log', logs, total, page, perPage))
}
