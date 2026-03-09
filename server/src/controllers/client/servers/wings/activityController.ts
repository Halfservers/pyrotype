import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { fractalPaginated } from '../../../../utils/response'
import { paginationSchema, getPaginationOffset } from '../../../../utils/pagination'
import { NotFoundError } from '../../../../utils/errors'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function index(c: AppContext) {
  const serverId = c.req.param('server')
  const prisma = c.var.prisma
  const query = c.req.query()
  const pagination = paginationSchema.parse({
    ...query,
    per_page: query.per_page ?? '25',
  })
  const { skip, take } = getPaginationOffset(pagination)

  const server = await prisma.server.findFirst({
    where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
  })

  if (!server) throw new NotFoundError('Server not found')

  // Query activity logs that reference this server via the subjects pivot
  const where = {
    subjects: {
      some: {
        subjectType: 'Server',
        subjectId: server.id,
      },
    },
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip,
      take,
    }),
    prisma.activityLog.count({ where }),
  ])

  const data = logs.map((log) => ({
    batch: log.batch,
    event: log.event,
    is_api: log.apiKeyId !== null,
    ip: log.ip,
    description: log.description,
    properties: log.properties ?? {},
    has_additional_metadata: false,
    timestamp: log.timestamp.toISOString(),
  }))

  return c.json(fractalPaginated('activity_log', data, total, pagination.page, pagination.per_page))
}
