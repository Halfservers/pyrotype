import { z } from 'zod';

export const createDatabaseSchema = z.object({
  databaseName: z
    .string()
    .min(3, 'Database name must be at least 3 characters.')
    .max(48, 'Database name must not exceed 48 characters.')
    .regex(
      /^[\w\-.]{3,48}$/,
      'Database name should only contain alphanumeric characters, underscores, dashes, and/or periods.',
    ),
  connectionsFrom: z
    .string()
    .regex(/^[\w\-/.%:]*$/, 'A valid host address must be provided.')
    .default('%'),
});

export type CreateDatabaseData = z.infer<typeof createDatabaseSchema>;

export const createScheduleSchema = z.object({
  name: z.string().min(1, 'A schedule name is required.'),
  minute: z.string(),
  hour: z.string(),
  dayOfMonth: z.string(),
  month: z.string(),
  dayOfWeek: z.string(),
  enabled: z.boolean(),
  onlyWhenOnline: z.boolean(),
});

export type CreateScheduleData = z.infer<typeof createScheduleSchema>;

export const createScheduleTaskSchema = z.object({
  action: z.string().min(1, 'An action is required.'),
  payload: z.string(),
  timeOffset: z
    .number()
    .min(0, 'The time offset must be at least 0 seconds.')
    .max(900, 'The time offset must be less than 900 seconds.'),
});

export type CreateScheduleTaskData = z.infer<typeof createScheduleTaskSchema>;

export const renameServerSchema = z.object({
  name: z.string().min(1, 'A server name is required.').max(191, 'Server name must not exceed 191 characters.'),
  description: z.string().nullable(),
});

export type RenameServerData = z.infer<typeof renameServerSchema>;

export const chmodSchema = z.object({
  file: z.string(),
  mode: z.string().regex(/^[0-7]{3,4}$/, 'Invalid chmod mode.'),
});

export type ChmodData = z.infer<typeof chmodSchema>;
