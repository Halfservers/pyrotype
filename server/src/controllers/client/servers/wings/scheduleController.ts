import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../../../config/database';
import { fractalList, fractalItem } from '../../../../utils/response';
import { NotFoundError } from '../../../../utils/errors';

const scheduleSchema = z.object({
  name: z.string().min(1).max(191),
  minute: z.string().min(1),
  hour: z.string().min(1),
  day_of_month: z.string().min(1),
  month: z.string().min(1),
  day_of_week: z.string().min(1),
  is_active: z.boolean().optional().default(true),
  only_when_online: z.boolean().optional().default(false),
});

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
  };
}

async function resolveServer(serverId: string) {
  const server = await prisma.server.findFirst({
    where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
  });
  if (!server) throw new NotFoundError('Server not found');
  return server;
}

export async function index(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(String(req.params.server));

    const schedules = await prisma.schedule.findMany({
      where: { serverId: server.id },
      include: { tasks: { orderBy: { sequenceId: 'asc' } } },
    });

    res.json(fractalList('schedule', schedules.map(transformSchedule)));
  } catch (err) {
    next(err);
  }
}

export async function store(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(String(req.params.server));
    const body = scheduleSchema.parse(req.body);

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
      },
      include: { tasks: true },
    });

    res.json(fractalItem('schedule', transformSchedule(schedule)));
  } catch (err) {
    next(err);
  }
}

export async function view(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(String(req.params.server));
    const scheduleId = parseInt(String(req.params.schedule), 10);

    const schedule = await prisma.schedule.findFirst({
      where: { id: scheduleId, serverId: server.id },
      include: { tasks: { orderBy: { sequenceId: 'asc' } } },
    });

    if (!schedule) throw new NotFoundError('Schedule not found');

    res.json(fractalItem('schedule', transformSchedule(schedule)));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(String(req.params.server));
    const scheduleId = parseInt(String(req.params.schedule), 10);
    const body = scheduleSchema.parse(req.body);

    const existing = await prisma.schedule.findFirst({
      where: { id: scheduleId, serverId: server.id },
    });

    if (!existing) throw new NotFoundError('Schedule not found');

    const data: any = {
      name: body.name,
      cronMinute: body.minute,
      cronHour: body.hour,
      cronDayOfMonth: body.day_of_month,
      cronMonth: body.month,
      cronDayOfWeek: body.day_of_week,
      isActive: body.is_active,
      onlyWhenOnline: body.only_when_online,
    };

    if (existing.isActive !== body.is_active) {
      data.isProcessing = false;
    }

    const schedule = await prisma.schedule.update({
      where: { id: scheduleId },
      data,
      include: { tasks: { orderBy: { sequenceId: 'asc' } } },
    });

    res.json(fractalItem('schedule', transformSchedule(schedule)));
  } catch (err) {
    next(err);
  }
}

export async function execute(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(String(req.params.server));
    const scheduleId = parseInt(String(req.params.schedule), 10);

    const schedule = await prisma.schedule.findFirst({
      where: { id: scheduleId, serverId: server.id },
    });

    if (!schedule) throw new NotFoundError('Schedule not found');

    // TODO: Dispatch schedule execution to the task processing service
    await prisma.schedule.update({
      where: { id: scheduleId },
      data: { isProcessing: true },
    });

    res.status(202).json([]);
  } catch (err) {
    next(err);
  }
}

export async function deleteFn(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(String(req.params.server));
    const scheduleId = parseInt(String(req.params.schedule), 10);

    const schedule = await prisma.schedule.findFirst({
      where: { id: scheduleId, serverId: server.id },
    });

    if (!schedule) throw new NotFoundError('Schedule not found');

    await prisma.schedule.delete({ where: { id: scheduleId } });

    res.status(204).json([]);
  } catch (err) {
    next(err);
  }
}
