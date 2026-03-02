import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../config/database';
import { NotFoundError, AppError } from '../../../../utils/errors';
import { fractalItem, fractalList } from '../../../../utils/response';

export async function listSchedules(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;

    const schedules = await prisma.schedule.findMany({
      where: { serverId: server.id },
      include: { tasks: true },
    });

    res.json(fractalList('schedule', schedules));
  } catch (err) {
    next(err);
  }
}

export async function createSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const {
      name,
      day_of_week,
      month,
      day_of_month,
      hour,
      minute,
      is_active,
      only_when_online,
    } = req.body;

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
    });

    // TODO: Activity log: server:schedule.create

    res.json(fractalItem('schedule', schedule));
  } catch (err) {
    next(err);
  }
}

export async function viewSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const { schedule: scheduleId } = req.params;

    const schedule = await prisma.schedule.findFirst({
      where: { id: parseInt(String(scheduleId)), serverId: server.id },
      include: { tasks: true },
    });

    if (!schedule) {
      throw new NotFoundError('Schedule not found.');
    }

    res.json(fractalItem('schedule', schedule));
  } catch (err) {
    next(err);
  }
}

export async function updateSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const { schedule: scheduleId } = req.params;

    const schedule = await prisma.schedule.findFirst({
      where: { id: parseInt(String(scheduleId)), serverId: server.id },
    });

    if (!schedule) {
      throw new NotFoundError('Schedule not found.');
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
    } = req.body;

    const active = is_active ?? schedule.isActive;
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
    };

    // Reset processing state when toggling active status
    if (schedule.isActive !== active) {
      data.isProcessing = false;
    }

    const updated = await prisma.schedule.update({
      where: { id: schedule.id },
      data,
      include: { tasks: true },
    });

    // TODO: Activity log: server:schedule.update

    res.json(fractalItem('schedule', updated));
  } catch (err) {
    next(err);
  }
}

export async function executeSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const { schedule: scheduleId } = req.params;

    const schedule = await prisma.schedule.findFirst({
      where: { id: parseInt(String(scheduleId)), serverId: server.id },
    });

    if (!schedule) {
      throw new NotFoundError('Schedule not found.');
    }

    // In production, dispatch the schedule for immediate processing
    // TODO: Activity log: server:schedule.execute

    res.status(202).json({});
  } catch (err) {
    next(err);
  }
}

export async function deleteSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const { schedule: scheduleId } = req.params;

    const schedule = await prisma.schedule.findFirst({
      where: { id: parseInt(String(scheduleId)), serverId: server.id },
    });

    if (!schedule) {
      throw new NotFoundError('Schedule not found.');
    }

    await prisma.schedule.delete({ where: { id: schedule.id } });

    // TODO: Activity log: server:schedule.delete

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
