import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../types/env'
import { fractalPaginated } from '../../utils/response'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

function transformLog(log: any) {
  return {
    id: Number(log.id),
    batch: log.batch,
    event: log.event,
    ip: log.ip,
    description: log.description,
    actor_type: log.actorType,
    actor_id: log.actorId ? Number(log.actorId) : null,
    api_key_id: log.apiKeyId,
    properties: log.properties,
    timestamp: log.timestamp?.toISOString(),
    subjects: (log.subjects ?? []).map((s: any) => ({
      id: Number(s.id),
      subject_type: s.subjectType,
      subject_id: Number(s.subjectId),
    })),
  }
}

export async function index(c: AppContext) {
  const prisma = c.var.prisma
  const page = parseInt(c.req.query('page') || '1', 10)
  const perPage = 50
  const skip = (page - 1) * perPage

  const event = c.req.query('filter[event]')
  const ip = c.req.query('filter[ip]')
  const actorId = c.req.query('filter[actor_id]')

  const where: any = {}
  if (event) where.event = { contains: event }
  if (ip) where.ip = ip
  if (actorId) where.actorId = BigInt(actorId)

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: { subjects: true },
      orderBy: { timestamp: 'desc' },
      skip,
      take: perPage,
    }),
    prisma.activityLog.count({ where }),
  ])

  return c.json(fractalPaginated('activity_log', logs.map(transformLog), total, page, perPage))
}

export async function clear(c: AppContext) {
  const prisma = c.var.prisma
  const body = await c.req.json()
  const days = parseInt(body.older_than_days, 10) || 90

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  const oldLogs = await prisma.activityLog.findMany({
    where: { timestamp: { lt: cutoff } },
    select: { id: true },
  })

  if (oldLogs.length > 0) {
    const logIds = oldLogs.map((l: any) => l.id)
    await prisma.activityLogSubject.deleteMany({
      where: { activityLogId: { in: logIds } },
    })
    const result = await prisma.activityLog.deleteMany({
      where: { id: { in: logIds } },
    })
    return c.json({ deleted: result.count })
  }

  return c.json({ deleted: 0 })
}
