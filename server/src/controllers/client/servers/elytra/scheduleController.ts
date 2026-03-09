import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { NotFoundError } from '../../../../utils/errors'
import { fractalItem, fractalList } from '../../../../utils/response'
import { logActivity } from '../../../../services/activity'
import { enqueueJob } from '../../../../jobs'
import { getNextCronDate } from '../../../../services/schedules'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

export async function listSchedules(c: AppContext) {
  const server = c.var.server!
  const prisma = c.var.prisma

  const schedules = await prisma.schedule.findMany({
    where: { serverId: server.id },
    include: { tasks: true },
  })

  return c.json(fractalList('schedule', schedules))
}

export async function createSchedule(c: AppContext) {
  const server = c.var.server!
  const user = c.var.user!
  const prisma = c.var.prisma
  const {
    name,
    day_of_week,
    month,
    day_of_month,
    hour,
    minute,
    is_active,
    only_when_online,
  } = await c.req.json()

  const nextRunAt = getNextCronDate(
    minute ?? '*',
    hour ?? '*',
    day_of_month ?? '*',
    month ?? '*',
    day_of_week ?? '*',
  )

  const schedule = await prisma.schedule.create({
    data: {
      serverId: server.id,
      name,
      cronDayOfWeek: day_of_week,
      cronMonth: month,
      cronDayOfMonth: day_of_month,
      cronHour: hour,
      cronMinute: minute,
      isActive: is_active ?? true,
      onlyWhenOnline: only_when_online ?? false,
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
    properties: { schedule_id: schedule.id, name: schedule.name },
  })

  return c.json(fractalItem('schedule', schedule))
}

export async function viewSchedule(c: AppContext) {
  const server = c.var.server!
  const prisma = c.var.prisma
  const scheduleId = c.req.param('schedule')

  const schedule = await prisma.schedule.findFirst({
    where: { id: parseInt(String(scheduleId)), serverId: server.id },
    include: { tasks: true },
  })

  if (!schedule) {
    throw new NotFoundError('Schedule not found.')
  }

  return c.json(fractalItem('schedule', schedule))
}

export async function updateSchedule(c: AppContext) {
  const server = c.var.server!
  const user = c.var.user!
  const prisma = c.var.prisma
  const scheduleId = c.req.param('schedule')

  const schedule = await prisma.schedule.findFirst({
    where: { id: parseInt(String(scheduleId)), serverId: server.id },
  })

  if (!schedule) {
    throw new NotFoundError('Schedule not found.')
  }

  const {
    name,
    day_of_week,
    month,
    day_of_month,
    hour,
    minute,
    is_active,
    only_when_online,
  } = await c.req.json()

  const active = is_active ?? schedule.isActive
  const newMinute = minute ?? schedule.cronMinute
  const newHour = hour ?? schedule.cronHour
  const newDayOfMonth = day_of_month ?? schedule.cronDayOfMonth
  const newMonth = month ?? schedule.cronMonth
  const newDayOfWeek = day_of_week ?? schedule.cronDayOfWeek

  const nextRunAt = getNextCronDate(newMinute, newHour, newDayOfMonth, newMonth, newDayOfWeek)

  const data: Record<string, unknown> = {
    name: name ?? schedule.name,
    cronDayOfWeek: newDayOfWeek,
    cronMonth: newMonth,
    cronDayOfMonth: newDayOfMonth,
    cronHour: newHour,
    cronMinute: newMinute,
    isActive: active,
    onlyWhenOnline: only_when_online ?? schedule.onlyWhenOnline,
    nextRunAt,
  }

  if (schedule.isActive !== active) {
    data.isProcessing = false
  }

  const updated = await prisma.schedule.update({
    where: { id: schedule.id },
    data,
    include: { tasks: true },
  })

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:schedule.update',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { schedule_id: schedule.id },
  })

  return c.json(fractalItem('schedule', updated))
}

export async function executeSchedule(c: AppContext) {
  const server = c.var.server!
  const user = c.var.user!
  const prisma = c.var.prisma
  const scheduleId = c.req.param('schedule')

  const schedule = await prisma.schedule.findFirst({
    where: { id: parseInt(String(scheduleId)), serverId: server.id },
  })

  if (!schedule) {
    throw new NotFoundError('Schedule not found.')
  }

  await prisma.schedule.update({
    where: { id: schedule.id },
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
    properties: { schedule_id: schedule.id },
  })

  return c.json({}, 202)
}

export async function deleteSchedule(c: AppContext) {
  const server = c.var.server!
  const user = c.var.user!
  const prisma = c.var.prisma
  const scheduleId = c.req.param('schedule')

  const schedule = await prisma.schedule.findFirst({
    where: { id: parseInt(String(scheduleId)), serverId: server.id },
  })

  if (!schedule) {
    throw new NotFoundError('Schedule not found.')
  }

  await prisma.schedule.delete({ where: { id: schedule.id } })

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:schedule.delete',
    ip,
    userId: user.id,
    serverId: server.id,
    properties: { schedule_id: schedule.id },
  })

  return c.body(null, 204)
}
