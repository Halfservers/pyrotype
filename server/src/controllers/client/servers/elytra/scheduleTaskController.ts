import type { Context } from 'hono'
import type { Env, HonoVariables } from '../../../../types/env'
import { NotFoundError, ForbiddenError, AppError } from '../../../../utils/errors'
import { fractalItem } from '../../../../utils/response'
import { logActivity } from '../../../../services/activity'

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>

const TASK_LIMIT = 10

export async function createTask(c: AppContext) {
  const server = c.var.server!
  const prisma = c.var.prisma
  const scheduleId = c.req.param('schedule')

  const schedule = await prisma.schedule.findFirst({
    where: { id: parseInt(String(scheduleId)), serverId: server.id },
    include: { tasks: { orderBy: { sequenceId: 'desc' } } },
  })

  if (!schedule) {
    throw new NotFoundError('Schedule not found.')
  }

  if (schedule.tasks.length >= TASK_LIMIT) {
    throw new AppError(
      `Schedules may not have more than ${TASK_LIMIT} tasks associated with them.`,
      400,
      'ServiceLimitExceeded',
    )
  }

  const { action, payload, time_offset, continue_on_failure, sequence_id } = await c.req.json()

  if (action === 'backup' && server.backupLimit === 0) {
    throw new ForbiddenError('A backup task cannot be created when the server backup limit is 0.')
  }

  const lastSequenceId = schedule.tasks[0]?.sequenceId ?? 0
  let sequenceId = sequence_id ?? lastSequenceId + 1
  if (sequenceId < 1) sequenceId = 1

  // If inserting at a position before the end, shift existing tasks
  if (sequenceId <= lastSequenceId) {
    await prisma.task.updateMany({
      where: {
        scheduleId: schedule.id,
        sequenceId: { gte: sequenceId },
      },
      data: { sequenceId: { increment: 1 } },
    })
  }

  const task = await prisma.task.create({
    data: {
      scheduleId: schedule.id,
      sequenceId,
      action,
      payload: payload ?? '',
      timeOffset: time_offset ?? 0,
      continueOnFailure: continue_on_failure ?? false,
    },
  })

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:task.create',
    ip,
    serverId: server.id,
    properties: { schedule_id: schedule.id, task_id: task.id, action: task.action },
  })

  return c.json(fractalItem('task', task))
}

export async function updateTask(c: AppContext) {
  const server = c.var.server!
  const prisma = c.var.prisma
  const scheduleId = c.req.param('schedule')
  const taskId = c.req.param('task')

  const schedule = await prisma.schedule.findFirst({
    where: { id: parseInt(String(scheduleId)), serverId: server.id },
  })

  if (!schedule) {
    throw new NotFoundError('Schedule not found.')
  }

  const task = await prisma.task.findFirst({
    where: { id: parseInt(String(taskId)), scheduleId: schedule.id },
  })

  if (!task) {
    throw new NotFoundError('Task not found.')
  }

  const { action, payload, time_offset, continue_on_failure, sequence_id } = await c.req.json()

  let newSequenceId = sequence_id ?? task.sequenceId
  if (newSequenceId < 1) newSequenceId = 1

  // Handle sequence reordering
  if (newSequenceId < task.sequenceId) {
    await prisma.task.updateMany({
      where: {
        scheduleId: schedule.id,
        sequenceId: { gte: newSequenceId, lt: task.sequenceId },
      },
      data: { sequenceId: { increment: 1 } },
    })
  } else if (newSequenceId > task.sequenceId) {
    await prisma.task.updateMany({
      where: {
        scheduleId: schedule.id,
        sequenceId: { gt: task.sequenceId, lte: newSequenceId },
      },
      data: { sequenceId: { decrement: 1 } },
    })
  }

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: {
      sequenceId: newSequenceId,
      action: action ?? task.action,
      payload: payload ?? task.payload,
      timeOffset: time_offset ?? task.timeOffset,
      continueOnFailure: continue_on_failure ?? task.continueOnFailure,
    },
  })

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:task.update',
    ip,
    serverId: server.id,
    properties: { schedule_id: schedule.id, task_id: updated.id, action: updated.action },
  })

  return c.json(fractalItem('task', updated))
}

export async function deleteTask(c: AppContext) {
  const server = c.var.server!
  const user = c.var.user!
  const permissions = c.var.serverPermissions ?? []
  const prisma = c.var.prisma
  const scheduleId = c.req.param('schedule')
  const taskId = c.req.param('task')

  if (!user.rootAdmin && !permissions.includes('schedule.update')) {
    throw new ForbiddenError('You do not have permission to perform this action.')
  }

  const schedule = await prisma.schedule.findFirst({
    where: { id: parseInt(String(scheduleId)), serverId: server.id },
  })

  if (!schedule) {
    throw new NotFoundError('Schedule not found.')
  }

  const task = await prisma.task.findFirst({
    where: { id: parseInt(String(taskId)), scheduleId: schedule.id },
  })

  if (!task) {
    throw new NotFoundError('Task not found.')
  }

  // Shift remaining tasks down
  await prisma.task.updateMany({
    where: {
      scheduleId: schedule.id,
      sequenceId: { gt: task.sequenceId },
    },
    data: { sequenceId: { decrement: 1 } },
  })

  await prisma.task.delete({ where: { id: task.id } })

  const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? '127.0.0.1'
  await logActivity(prisma, {
    event: 'server:task.delete',
    ip,
    serverId: server.id,
    properties: { schedule_id: schedule.id, task_id: task.id, action: task.action },
  })

  return c.body(null, 204)
}
