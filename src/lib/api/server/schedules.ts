import { api } from '@/lib/http';
import { getGlobalDaemonType } from '@/lib/api/server/get-server';

export interface Schedule {
  id: number;
  name: string;
  cron: {
    dayOfWeek: string;
    month: string;
    dayOfMonth: string;
    hour: string;
    minute: string;
  };
  isActive: boolean;
  isProcessing: boolean;
  onlyWhenOnline: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  tasks: ScheduleTask[];
}

export interface ScheduleTask {
  id: number;
  sequenceId: number;
  action: string;
  payload: string;
  timeOffset: number;
  isQueued: boolean;
  continueOnFailure: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const rawDataToServerTask = (data: any): ScheduleTask => ({
  id: data.id,
  sequenceId: data.sequence_id,
  action: data.action,
  payload: data.payload,
  timeOffset: data.time_offset,
  isQueued: data.is_queued,
  continueOnFailure: data.continue_on_failure,
  createdAt: new Date(data.created_at),
  updatedAt: new Date(data.updated_at),
});

const rawDataToServerSchedule = (data: any): Schedule => ({
  id: data.id,
  name: data.name,
  cron: {
    dayOfWeek: data.cron.day_of_week,
    month: data.cron.month,
    dayOfMonth: data.cron.day_of_month,
    hour: data.cron.hour,
    minute: data.cron.minute,
  },
  isActive: data.is_active,
  isProcessing: data.is_processing,
  onlyWhenOnline: data.only_when_online,
  lastRunAt: data.last_run_at ? new Date(data.last_run_at) : null,
  nextRunAt: data.next_run_at ? new Date(data.next_run_at) : null,
  createdAt: new Date(data.created_at),
  updatedAt: new Date(data.updated_at),
  tasks: (data.relationships?.tasks?.data || []).map((row: any) =>
    rawDataToServerTask(row.attributes),
  ),
});

export const getServerSchedules = async (uuid: string): Promise<Schedule[]> => {
  const data: any = await api.get(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/schedules`,
    { include: 'tasks' },
  );
  return (data.data || []).map((row: any) => rawDataToServerSchedule(row.attributes));
};

export const getServerSchedule = async (uuid: string, schedule: number): Promise<Schedule> => {
  const data: any = await api.get(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/schedules/${schedule}`,
    { include: 'tasks' },
  );
  return rawDataToServerSchedule(data.attributes);
};

type ScheduleData = Pick<Schedule, 'cron' | 'name' | 'onlyWhenOnline' | 'isActive'> & {
  id?: number;
};

export const createOrUpdateSchedule = async (
  uuid: string,
  schedule: ScheduleData,
): Promise<Schedule> => {
  const data: any = await api.post(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/schedules${schedule.id ? `/${schedule.id}` : ''}`,
    {
      is_active: schedule.isActive,
      only_when_online: schedule.onlyWhenOnline,
      name: schedule.name,
      minute: schedule.cron.minute,
      hour: schedule.cron.hour,
      day_of_month: schedule.cron.dayOfMonth,
      month: schedule.cron.month,
      day_of_week: schedule.cron.dayOfWeek,
    },
  );
  return rawDataToServerSchedule(data.attributes);
};

interface TaskData {
  action: string;
  payload: string;
  timeOffset: string | number;
  continueOnFailure: boolean;
}

export const createOrUpdateScheduleTask = async (
  uuid: string,
  schedule: number,
  task: number | undefined,
  taskData: TaskData,
): Promise<ScheduleTask> => {
  const data: any = await api.post(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/schedules/${schedule}/tasks${task ? `/${task}` : ''}`,
    {
      action: taskData.action,
      payload: taskData.payload,
      continue_on_failure: taskData.continueOnFailure,
      time_offset: taskData.timeOffset,
    },
  );
  return rawDataToServerTask(data.attributes);
};

export const deleteSchedule = async (uuid: string, schedule: number): Promise<void> => {
  await api.delete(`/api/client/servers/${getGlobalDaemonType()}/${uuid}/schedules/${schedule}`);
};

export const deleteScheduleTask = async (
  uuid: string,
  scheduleId: number,
  taskId: number,
): Promise<void> => {
  await api.delete(
    `/api/client/${getGlobalDaemonType()}/servers/${uuid}/schedules/${scheduleId}/tasks/${taskId}`,
  );
};

export const triggerScheduleExecution = async (
  server: string,
  schedule: number,
): Promise<void> => {
  await api.post(
    `/api/client/servers/${getGlobalDaemonType()}/${server}/schedules/${schedule}/execute`,
  );
};
