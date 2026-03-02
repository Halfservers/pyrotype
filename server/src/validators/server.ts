import { z } from 'zod';

export const createDatabaseSchema = z.object({
  database: z.string().min(1).max(48).regex(/^[a-zA-Z0-9_]+$/),
  remote: z.string().default('%'),
});

export const createScheduleSchema = z.object({
  name: z.string().min(1).max(191),
  cron_minute: z.string(),
  cron_hour: z.string(),
  cron_day_of_month: z.string(),
  cron_month: z.string(),
  cron_day_of_week: z.string(),
  is_active: z.boolean().default(true),
  only_when_online: z.boolean().default(false),
});

export const createScheduleTaskSchema = z.object({
  action: z.enum(['command', 'power', 'backup']),
  payload: z.string(),
  time_offset: z.number().int().min(0).max(900).default(0),
  continue_on_failure: z.boolean().default(false),
});

export const renameServerSchema = z.object({
  name: z.string().min(1).max(191),
  description: z.string().max(1000).optional(),
});

export const chmodSchema = z.object({
  root: z.string(),
  files: z.array(z.object({
    file: z.string(),
    mode: z.number().int(),
  })),
});

export const fileDeleteSchema = z.object({
  root: z.string(),
  files: z.array(z.string()),
});

export const fileRenameSchema = z.object({
  root: z.string(),
  files: z.array(z.object({
    from: z.string(),
    to: z.string(),
  })),
});

export const fileCopySchema = z.object({
  location: z.string(),
});

export const fileWriteSchema = z.object({
  file: z.string(),
  content: z.string(),
});

export const fileCompressSchema = z.object({
  root: z.string(),
  files: z.array(z.string()),
});

export const fileDecompressSchema = z.object({
  root: z.string(),
  file: z.string(),
});

export const createFolderSchema = z.object({
  root: z.string(),
  name: z.string(),
});

export const filePullSchema = z.object({
  url: z.string().url(),
  directory: z.string().optional(),
  filename: z.string().optional(),
  use_header: z.boolean().optional(),
  foreground: z.boolean().optional(),
});

export const powerActionSchema = z.object({
  signal: z.enum(['start', 'stop', 'restart', 'kill']),
});

export const commandSchema = z.object({
  command: z.string().min(1),
});

export const updateAllocationSchema = z.object({
  notes: z.string().max(255).optional().nullable(),
});

export const updateSubuserSchema = z.object({
  permissions: z.array(z.string()),
});

export const createSubuserSchema = z.object({
  email: z.string().email(),
  permissions: z.array(z.string()),
});

export const updateStartupVariableSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export const updateStartupCommandSchema = z.object({
  startup: z.string(),
});

export const updateDockerImageSchema = z.object({
  docker_image: z.string(),
});

export const changeEggSchema = z.object({
  egg_id: z.number().int(),
});

export const createBackupSchema = z.object({
  name: z.string().max(191).optional(),
  ignored: z.string().optional(),
  is_locked: z.boolean().optional().default(false),
});

export const renameBackupSchema = z.object({
  name: z.string().min(1).max(191),
});
