import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../config/database';
import { NotFoundError, ForbiddenError, AppError } from '../../../../utils/errors';
import { fractalItem } from '../../../../utils/response';

const TASK_LIMIT = 10;

export async function createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const { schedule: scheduleId } = req.params;

    const schedule = await prisma.schedule.findFirst({
      where: { id: parseInt(String(scheduleId)), serverId: server.id },
      include: { tasks: { orderBy: { sequenceId: 'desc' } } },
    });

    if (!schedule) {
      throw new NotFoundError('Schedule not found.');
    }

    if (schedule.tasks.length >= TASK_LIMIT) {
      throw new AppError(
        `Schedules may not have more than ${TASK_LIMIT} tasks associated with them.`,
        400,
        'ServiceLimitExceeded',
      );
    }

    const { action, payload, time_offset, continue_on_failure, sequence_id } = req.body;

    const lastSequenceId = schedule.tasks[0]?.sequenceId ?? 0;
    let sequenceId = sequence_id ?? lastSequenceId + 1;
    if (sequenceId < 1) sequenceId = 1;

    // If inserting at a position before the end, shift existing tasks
    if (sequenceId <= lastSequenceId) {
      await prisma.task.updateMany({
        where: {
          scheduleId: schedule.id,
          sequenceId: { gte: sequenceId },
        },
        data: { sequenceId: { increment: 1 } },
      });
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
    });

    // TODO: Activity log: server:task.create

    res.json(fractalItem('task', task));
  } catch (err) {
    next(err);
  }
}

export async function updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const { schedule: scheduleId, task: taskId } = req.params;

    const schedule = await prisma.schedule.findFirst({
      where: { id: parseInt(String(scheduleId)), serverId: server.id },
    });

    if (!schedule) {
      throw new NotFoundError('Schedule not found.');
    }

    const task = await prisma.task.findFirst({
      where: { id: parseInt(String(taskId)), scheduleId: schedule.id },
    });

    if (!task) {
      throw new NotFoundError('Task not found.');
    }

    const { action, payload, time_offset, continue_on_failure, sequence_id } = req.body;

    let newSequenceId = sequence_id ?? task.sequenceId;
    if (newSequenceId < 1) newSequenceId = 1;

    // Handle sequence reordering
    if (newSequenceId < task.sequenceId) {
      await prisma.task.updateMany({
        where: {
          scheduleId: schedule.id,
          sequenceId: { gte: newSequenceId, lt: task.sequenceId },
        },
        data: { sequenceId: { increment: 1 } },
      });
    } else if (newSequenceId > task.sequenceId) {
      await prisma.task.updateMany({
        where: {
          scheduleId: schedule.id,
          sequenceId: { gt: task.sequenceId, lte: newSequenceId },
        },
        data: { sequenceId: { decrement: 1 } },
      });
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
    });

    // TODO: Activity log: server:task.update

    res.json(fractalItem('task', updated));
  } catch (err) {
    next(err);
  }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const user = req.user!;
    const permissions = req.serverPermissions ?? [];
    const { schedule: scheduleId, task: taskId } = req.params;

    if (!user.rootAdmin && !permissions.includes('schedule.update')) {
      throw new ForbiddenError('You do not have permission to perform this action.');
    }

    const schedule = await prisma.schedule.findFirst({
      where: { id: parseInt(String(scheduleId)), serverId: server.id },
    });

    if (!schedule) {
      throw new NotFoundError('Schedule not found.');
    }

    const task = await prisma.task.findFirst({
      where: { id: parseInt(String(taskId)), scheduleId: schedule.id },
    });

    if (!task) {
      throw new NotFoundError('Task not found.');
    }

    // Shift remaining tasks down
    await prisma.task.updateMany({
      where: {
        scheduleId: schedule.id,
        sequenceId: { gt: task.sequenceId },
      },
      data: { sequenceId: { decrement: 1 } },
    });

    await prisma.task.delete({ where: { id: task.id } });

    // TODO: Activity log: server:task.delete

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
