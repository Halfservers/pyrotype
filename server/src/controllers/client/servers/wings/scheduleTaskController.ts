import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../../../config/database';
import { fractalItem } from '../../../../utils/response';
import { NotFoundError, ForbiddenError, AppError } from '../../../../utils/errors';

const taskSchema = z.object({
  action: z.enum(['command', 'power', 'backup']),
  payload: z.string().optional().default(''),
  time_offset: z.number().int().min(0).default(0),
  sequence_id: z.number().int().optional(),
  continue_on_failure: z.boolean().optional().default(false),
});

function transformTask(task: any) {
  return {
    id: task.id,
    sequence_id: task.sequenceId,
    action: task.action,
    payload: task.payload,
    time_offset: task.timeOffset,
    is_queued: task.isQueued,
    continue_on_failure: task.continueOnFailure,
    created_at: task.createdAt.toISOString(),
    updated_at: task.updatedAt.toISOString(),
  };
}

async function resolveServerAndSchedule(serverId: string, scheduleId: string) {
  const server = await prisma.server.findFirst({
    where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
  });
  if (!server) throw new NotFoundError('Server not found');

  const schedule = await prisma.schedule.findFirst({
    where: { id: parseInt(scheduleId, 10), serverId: server.id },
    include: { tasks: { orderBy: { sequenceId: 'desc' }, take: 1 } },
  });
  if (!schedule) throw new NotFoundError('Schedule not found');

  return { server, schedule };
}

export async function store(req: Request, res: Response, next: NextFunction) {
  try {
    const body = taskSchema.parse(req.body);
    const { server, schedule } = await resolveServerAndSchedule(String(req.params.server), String(req.params.schedule));

    const taskLimit = 10;
    const taskCount = await prisma.task.count({ where: { scheduleId: schedule.id } });
    if (taskCount >= taskLimit) {
      throw new AppError(`Schedules may not have more than ${taskLimit} tasks.`, 400, 'ServiceLimitExceeded');
    }

    if (server.backupLimit === 0 && body.action === 'backup') {
      throw new ForbiddenError('A backup task cannot be created when the server backup limit is 0.');
    }

    const lastSequence = schedule.tasks[0]?.sequenceId ?? 0;
    let sequenceId = body.sequence_id ?? lastSequence + 1;
    if (sequenceId < 1) sequenceId = 1;

    if (sequenceId <= lastSequence) {
      await prisma.task.updateMany({
        where: { scheduleId: schedule.id, sequenceId: { gte: sequenceId } },
        data: { sequenceId: { increment: 1 } },
      });
    } else {
      sequenceId = lastSequence + 1;
    }

    const task = await prisma.task.create({
      data: {
        scheduleId: schedule.id,
        sequenceId,
        action: body.action,
        payload: body.payload,
        timeOffset: body.time_offset,
        continueOnFailure: body.continue_on_failure,
      },
    });

    res.json(fractalItem('schedule_task', transformTask(task)));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const body = taskSchema.parse(req.body);
    const { server, schedule } = await resolveServerAndSchedule(String(req.params.server), String(req.params.schedule));
    const taskId = parseInt(req.params.task as string, 10);

    const task = await prisma.task.findFirst({
      where: { id: taskId, scheduleId: schedule.id },
    });

    if (!task) throw new NotFoundError('Task not found');

    if (server.backupLimit === 0 && body.action === 'backup') {
      throw new ForbiddenError('A backup task cannot be created when the server backup limit is 0.');
    }

    let sequenceId = body.sequence_id ?? task.sequenceId;
    if (sequenceId < 1) sequenceId = 1;

    if (sequenceId < task.sequenceId) {
      await prisma.task.updateMany({
        where: {
          scheduleId: schedule.id,
          sequenceId: { gte: sequenceId, lt: task.sequenceId },
        },
        data: { sequenceId: { increment: 1 } },
      });
    } else if (sequenceId > task.sequenceId) {
      await prisma.task.updateMany({
        where: {
          scheduleId: schedule.id,
          sequenceId: { gt: task.sequenceId, lte: sequenceId },
        },
        data: { sequenceId: { decrement: 1 } },
      });
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        sequenceId,
        action: body.action,
        payload: body.payload,
        timeOffset: body.time_offset,
        continueOnFailure: body.continue_on_failure,
      },
    });

    res.json(fractalItem('schedule_task', transformTask(updated)));
  } catch (err) {
    next(err);
  }
}

export async function deleteFn(req: Request, res: Response, next: NextFunction) {
  try {
    const { schedule } = await resolveServerAndSchedule(String(req.params.server), String(req.params.schedule));
    const taskId = parseInt(req.params.task as string, 10);

    const task = await prisma.task.findFirst({
      where: { id: taskId, scheduleId: schedule.id },
    });

    if (!task) throw new NotFoundError('Task not found');

    await prisma.task.updateMany({
      where: { scheduleId: schedule.id, sequenceId: { gt: task.sequenceId } },
      data: { sequenceId: { decrement: 1 } },
    });

    await prisma.task.delete({ where: { id: taskId } });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
