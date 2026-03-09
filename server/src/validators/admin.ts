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

export const createNestSchema = z.object({
  name: z.string().min(1).max(191),
  description: z.string().optional().nullable(),
});

export const updateNestSchema = z.object({
  name: z.string().min(1).max(191).optional(),
  description: z.string().optional().nullable(),
});

export const createEggSchema = z.object({
  name: z.string().min(1).max(191),
  description: z.string().optional().nullable(),
  docker_images: z.string().optional(),
  startup: z.string().optional().nullable(),
  config_files: z.string().optional().nullable(),
  script_install: z.string().optional().nullable(),
  script_container: z.string().optional().default('alpine:3.4'),
  script_entry: z.string().optional().default('ash'),
});

export const updateEggSchema = z.object({
  name: z.string().min(1).max(191).optional(),
  description: z.string().optional().nullable(),
  docker_images: z.string().optional(),
  startup: z.string().optional().nullable(),
  config_files: z.string().optional().nullable(),
  script_install: z.string().optional().nullable(),
  script_container: z.string().optional(),
  script_entry: z.string().optional(),
});

export const createEggVariableSchema = z.object({
  name: z.string().min(1).max(191),
  description: z.string().optional().default(''),
  env_variable: z.string().min(1).regex(/^[A-Z_]+$/, 'Environment variable must be uppercase letters and underscores only'),
  default_value: z.string().optional().default(''),
  user_viewable: z.boolean().optional().default(false),
  user_editable: z.boolean().optional().default(false),
  rules: z.string().optional().default(''),
});

export const updateEggVariableSchema = z.object({
  name: z.string().min(1).max(191).optional(),
  description: z.string().optional(),
  env_variable: z.string().min(1).regex(/^[A-Z_]+$/, 'Environment variable must be uppercase letters and underscores only').optional(),
  default_value: z.string().optional(),
  user_viewable: z.boolean().optional(),
  user_editable: z.boolean().optional(),
  rules: z.string().optional(),
});

export const createDatabaseHostSchema = z.object({
  name: z.string().min(1).max(191),
  host: z.string().min(1).max(191),
  port: z.number().int().min(1).max(65535).default(3306),
  username: z.string().min(1).max(191),
  password: z.string().min(1),
  max_databases: z.number().int().min(0).optional().nullable(),
  node_id: z.number().int().optional().nullable(),
});

export const updateDatabaseHostSchema = createDatabaseHostSchema.partial();

export const createMountSchema = z.object({
  name: z.string().min(1).max(191),
  description: z.string().optional().default(''),
  source: z.string().min(1).max(191),
  target: z.string().min(1).max(191),
  read_only: z.boolean().optional().default(false),
  user_mountable: z.boolean().optional().default(false),
})

export const updateMountSchema = createMountSchema.partial()

export const attachEggsSchema = z.object({ eggs: z.array(z.number().int()) })

export const attachNodesSchema = z.object({ nodes: z.array(z.number().int()) })

export const createDomainSchema = z.object({
  name: z.string().min(1).max(191),
  dns_provider: z.string().min(1).max(50).default('cloudflare'),
  dns_config: z.record(z.string(), z.unknown()).optional().default({}),
  is_active: z.boolean().optional().default(true),
  is_default: z.boolean().optional().default(false),
})

export const updateDomainSchema = createDomainSchema.partial()
