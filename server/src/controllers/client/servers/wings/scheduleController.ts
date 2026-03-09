import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { z } from 'zod'
import { fractalList, fractalItem } from '../../../../utils/response'
import { NotFoundError } from '../../../../utils/errors'
import { logActivity } from '../../../../services/activity'
import { enqueueJob } from '../../../../jobs'
import { getNextCronDate } from '../../../../services/schedules'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

const scheduleSchema = z.object({
  name: z.string().min(1).max(191),
  minute: z.string().min(1),
  hour: z.string().min(1),
  day_of_month: z.string().min(1),
  month: z.string().min(1),
  day_of_week: z.string().min(1),
  is_active: z.boolean().optional().default(true),
  only_when_online: z.boolean().optional().default(false),
})

function transformSchedule(schedule: any) {
  return {
    id: schedule.id,
    name: schedule.name,
    cron: {
      day_of_week: schedule.cronDayOfWeek,
      month: schedule.cronMonth,
      day_of_month: schedule.cronDayOfMonth,
      hour: schedule.cronHour,
      minute: schedule.cronMinute,
    },
    is_active: schedule.isActive,
    is_processing: schedule.isProcessing,
    only_when_online: schedule.onlyWhenOnline,
    last_run_at: schedule.lastRunAt?.toISOString() ?? null,
    next_run_at: schedule.nextRunAt?.toISOString() ?? null,
    created_at: schedule.createdAt.toISOString(),
    updated_at: schedule.updatedAt.toISOString(),
    relationships: {
      tasks: {
        object: 'list',
        data: (schedule.tasks ?? []).map((task: any) => ({
          object: 'schedule_task',
          attributes: {
            id: task.id,
            sequence_id: task.sequenceId,
            action: task.action,
            payload: task.payload,
            time_offset: task.timeOffset,
            is_queued: task.isQueued,
            continue_on_failure: task.continueOnFailure,
            created_at: task.createdAt.toISOString(),
            updated_at: task.updatedAt.toISOString(),
          },
        })),
      },
    },
  }
}

async function resolveServer(c: AppContext) {
  const serverId = c.req.param('server')
  const prisma = c.var.prisma
  const server = await prisma.server.findFirst({
    where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
  })
  if (!server) throw new NotFoundError('Server not found')
  return server
}

export async function index(c: AppContext) {
  const server = await resolveServer(c)
  const prisma = c.var.prisma

  const schedules = await prisma.schedule.findMany({
    where: { serverId: server.id },
    include: { tasks: { orderBy: { sequenceId: 'asc' } } },
  })

  return c.json(fractalList('schedule', schedules.map(transformSchedule)))
}

export async function store(c: AppContext) {
  const server = await resolveServer(c)
  const prisma = c.var.prisma
  const user = c.var.user!
  const body = scheduleSchema.parse(await c.req.json())

  const nextRunAt = getNextCronDate(body.minute, body.hour, body.day_of_month, body.month, body.day_of_week)

  const schedule = await prisma.schedule.create({
    data: {
      serverId: server.id,
      name: body.name,
      cronMinute: body.minute,
      cronHour: body.hour,
      cronDayOfMonth: body.day_of_month,
      cronMonth: body.month,
      cronDayOfWeek: body.day_of_week,
      isActive: body.is_active,
      onlyWhenOnline: body.only_when_online,
      nextRunAt,
    },
    include: { tasks: true },
  })

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:schedule.create',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { name: body.name },
  })

  return c.json(fractalItem('schedule', transformSchedule(schedule)))
}

export async function view(c: AppContext) {
  const server = await resolveServer(c)
  const prisma = c.var.prisma
  const scheduleId = parseInt(c.req.param('schedule'), 10)

  const schedule = await prisma.schedule.findFirst({
    where: { id: scheduleId, serverId: server.id },
    include: { tasks: { orderBy: { sequenceId: 'asc' } } },
  })

  if (!schedule) throw new NotFoundError('Schedule not found')

  return c.json(fractalItem('schedule', transformSchedule(schedule)))
}

export async function update(c: AppContext) {
  const server = await resolveServer(c)
  const prisma = c.var.prisma
  const user = c.var.user!
  const scheduleId = parseInt(c.req.param('schedule'), 10)
  const body = scheduleSchema.parse(await c.req.json())

  const existing = await prisma.schedule.findFirst({
    where: { id: scheduleId, serverId: server.id },
  })

  if (!existing) throw new NotFoundError('Schedule not found')

  const nextRunAt = getNextCronDate(body.minute, body.hour, body.day_of_month, body.month, body.day_of_week)

  const data: any = {
    name: body.name,
    cronMinute: body.minute,
    cronHour: body.hour,
    cronDayOfMonth: body.day_of_month,
    cronMonth: body.month,
    cronDayOfWeek: body.day_of_week,
    isActive: body.is_active,
    onlyWhenOnline: body.only_when_online,
    nextRunAt,
  }

  if (existing.isActive !== body.is_active) {
    data.isProcessing = false
  }

  const schedule = await prisma.schedule.update({
    where: { id: scheduleId },
    data,
    include: { tasks: { orderBy: { sequenceId: 'asc' } } },
  })

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:schedule.update',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { name: body.name },
  })

  return c.json(fractalItem('schedule', transformSchedule(schedule)))
}

export async function execute(c: AppContext) {
  const server = await resolveServer(c)
  const prisma = c.var.prisma
  const user = c.var.user!
  const scheduleId = parseInt(c.req.param('schedule'), 10)

  const schedule = await prisma.schedule.findFirst({
    where: { id: scheduleId, serverId: server.id },
  })

  if (!schedule) throw new NotFoundError('Schedule not found')

  await prisma.schedule.update({
    where: { id: scheduleId },
    data: { isProcessing: true },
  })

  await enqueueJob(c.var.queue, {
    type: 'schedule',
    data: { scheduleId: schedule.id },
  })

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:schedule.execute',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { schedule: schedule.name },
  })

  return c.json([], 202)
}

export async function deleteFn(c: AppContext) {
  const server = await resolveServer(c)
  const prisma = c.var.prisma
  const user = c.var.user!
  const scheduleId = parseInt(c.req.param('schedule'), 10)

  const schedule = await prisma.schedule.findFirst({
    where: { id: scheduleId, serverId: server.id },
  })

  if (!schedule) throw new NotFoundError('Schedule not found')

  await prisma.schedule.delete({ where: { id: scheduleId } })

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:schedule.delete',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { name: schedule.name },
  })

  return c.body(null, 204)
}
