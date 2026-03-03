import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { NotFoundError } from '../../../../utils/errors'
import { fractalItem, fractalList } from '../../../../utils/response'

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
      nextRunAt: new Date(), // In production, calculate from cron expression
    },
    include: { tasks: true },
  })

  // TODO: Activity log: server:schedule.create

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
  const data: Record<string, unknown> = {
    name: name ?? schedule.name,
    cronDayOfWeek: day_of_week ?? schedule.cronDayOfWeek,
    cronMonth: month ?? schedule.cronMonth,
    cronDayOfMonth: day_of_month ?? schedule.cronDayOfMonth,
    cronHour: hour ?? schedule.cronHour,
    cronMinute: minute ?? schedule.cronMinute,
    isActive: active,
    onlyWhenOnline: only_when_online ?? schedule.onlyWhenOnline,
    nextRunAt: new Date(), // In production, recalculate from cron expression
  }

  // Reset processing state when toggling active status
  if (schedule.isActive !== active) {
    data.isProcessing = false
  }

  const updated = await prisma.schedule.update({
    where: { id: schedule.id },
    data,
    include: { tasks: true },
  })

  // TODO: Activity log: server:schedule.update

  return c.json(fractalItem('schedule', updated))
}

export async function executeSchedule(c: AppContext) {
  const server = c.var.server!
  const prisma = c.var.prisma
  const scheduleId = c.req.param('schedule')

  const schedule = await prisma.schedule.findFirst({
    where: { id: parseInt(String(scheduleId)), serverId: server.id },
  })

  if (!schedule) {
    throw new NotFoundError('Schedule not found.')
  }

  // In production, dispatch the schedule for immediate processing
  // TODO: Activity log: server:schedule.execute

  return c.json({}, 202)
}

export async function deleteSchedule(c: AppContext) {
  const server = c.var.server!
  const prisma = c.var.prisma
  const scheduleId = c.req.param('schedule')

  const schedule = await prisma.schedule.findFirst({
    where: { id: parseInt(String(scheduleId)), serverId: server.id },
  })

  if (!schedule) {
    throw new NotFoundError('Schedule not found.')
  }

  await prisma.schedule.delete({ where: { id: schedule.id } })

  // TODO: Activity log: server:schedule.delete

  return c.body(null, 204)
}
