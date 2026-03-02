import { z } from 'zod';

export const createUserSchema = z.object({
  external_id: z.string().max(191).optional().nullable(),
  username: z.string().min(1).max(191),
  email: z.string().email().max(191),
  name_first: z.string().min(1).max(191),
  name_last: z.string().max(191).optional().nullable(),
  password: z.string().min(8).optional(),
  root_admin: z.boolean().default(false),
  language: z.string().default('en'),
});

export const updateUserSchema = createUserSchema.partial();

export const createNodeSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[\w .\-]+$/),
  description: z.string().optional().nullable(),
  location_id: z.number().int(),
  fqdn: z.string(),
  internal_fqdn: z.string().optional().nullable(),
  use_separate_fqdns: z.boolean().default(false),
  scheme: z.enum(['http', 'https']),
  behind_proxy: z.boolean().default(false),
  public: z.boolean().default(true),
  trust_alias: z.boolean().default(false),
  memory: z.number().int().min(1),
  memory_overallocate: z.number().int().min(-1),
  disk: z.number().int().min(1),
  disk_overallocate: z.number().int().min(-1),
  daemon_base: z.string().default('/var/lib/pterodactyl/volumes'),
  daemon_sftp: z.number().int().min(1).max(65535).default(2022),
  daemon_listen: z.number().int().min(1).max(65535).default(8080),
  upload_size: z.number().int().min(1).max(1024).default(100),
  maintenance_mode: z.boolean().default(false),
  daemon_type: z.string().default('elytra'),
  backup_disk: z.string().default('local'),
});

export const updateNodeSchema = createNodeSchema.partial();

export const createServerSchema = z.object({
  external_id: z.string().max(191).optional().nullable(),
  name: z.string().min(1).max(191),
  description: z.string().optional(),
  owner_id: z.number().int(),
  node_id: z.number().int(),
  allocation_id: z.number().int(),
  nest_id: z.number().int(),
  egg_id: z.number().int(),
  startup: z.string(),
  image: z.string().max(191),
  memory: z.number().int().min(0),
  swap: z.number().int().min(-1),
  disk: z.number().int().min(0),
  io: z.number().int().min(10).max(1000),
  cpu: z.number().int().min(0),
  threads: z.string().optional().nullable(),
  oom_disabled: z.boolean().default(true),
  database_limit: z.number().int().min(0).optional().nullable(),
  allocation_limit: z.number().int().min(0).optional().nullable(),
  backup_limit: z.number().int().min(0).optional().nullable(),
  backup_storage_limit: z.number().int().min(0).optional().nullable(),
  skip_scripts: z.boolean().default(false),
});

export const createLocationSchema = z.object({
  short: z.string().min(1).max(60),
  long: z.string().optional().nullable(),
});

export const updateLocationSchema = createLocationSchema.partial();

export const createAllocationSchema = z.object({
  ip: z.string(),
  ports: z.array(z.string()),
  alias: z.string().optional(),
});
