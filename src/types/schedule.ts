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
