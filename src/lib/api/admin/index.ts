import { api } from '@/lib/http';
import type { FractalItem, PaginatedResponse } from '@/types/api';

export type { FractalItem, PaginatedResponse } from '@/types/api';

export interface AdminUser {
  id: number;
  external_id: string | null;
  uuid: string;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  language: string;
  root_admin: boolean;
  '2fa_enabled': boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminServer {
  id: number;
  external_id: string | null;
  uuid: string;
  identifier: string;
  name: string;
  description: string;
  status: string | null;
  suspended: boolean;
  limits: {
    memory: number;
    swap: number;
    disk: number;
    io: number;
    cpu: number;
    threads: string | null;
    oom_disabled: boolean;
  };
  feature_limits: {
    databases: number;
    allocations: number;
    backups: number;
  };
  user: number;
  node: number;
  allocation: number;
  nest: number;
  egg: number;
  container?: {
    startup_command: string;
    image: string;
    installed_at: string | null;
  };
  created_at: string;
  updated_at: string;
}

export interface AdminNode {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  public: boolean;
  fqdn: string;
  internal_fqdn: string | null;
  scheme: string;
  behind_proxy: boolean;
  trust_alias: boolean;
  use_separate_fqdns: boolean;
  maintenance_mode: boolean;
  memory: number;
  memory_overallocate: number;
  disk: number;
  disk_overallocate: number;
  upload_size: number;
  daemon_listen: number;
  daemon_sftp: number;
  daemon_base: string;
  daemon_type: string;
  backup_disk: string;
  location_id: number;
  created_at: string;
  updated_at: string;
}

export interface AdminLocation {
  id: number;
  short: string;
  long: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminNest {
  id: number;
  uuid: string;
  author: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminEgg {
  id: number;
  uuid: string;
  name: string;
  nest: number;
  author: string;
  description: string | null;
  docker_image: string;
  docker_images: Record<string, string>;
  startup: string;
  script_install: string | null;
  script_container: string;
  script_entry: string;
  config_files: string | null;
  config_startup: string | null;
  config_stop: string | null;
  config_logs: string | null;
  config_from: number | null;
  copy_script_from: number | null;
  force_outgoing_ip: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminAllocation {
  id: number;
  ip: string;
  alias: string | null;
  port: number;
  notes: string | null;
  assigned: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminDatabase {
  id: number;
  server: number;
  host: number;
  database: string;
  username: string;
  remote: string;
  max_connections: number;
  created_at: string;
  updated_at: string;
}

const BASE = '/api/application';

// ── Users ─────────────────────────────────────────────────────────

export const getUsers = (page = 1) =>
  api.get<PaginatedResponse<AdminUser>>(`${BASE}/users`, { page });

export const searchUsers = (query: string) =>
  api.get<PaginatedResponse<AdminUser>>(`${BASE}/users`, {
    'filter[email]': query,
    'filter[username]': query,
  });

export const getUser = (id: number) =>
  api.get<FractalItem<AdminUser>>(`${BASE}/users/${id}`);

export const createUser = (data: {
  username: string;
  email: string;
  name_first: string;
  name_last?: string;
  password?: string;
  root_admin?: boolean;
}) => api.post<FractalItem<AdminUser>>(`${BASE}/users`, data);

export const updateUser = (id: number, data: Record<string, unknown>) =>
  api.patch<FractalItem<AdminUser>>(`${BASE}/users/${id}`, data);

export const deleteUser = (id: number) =>
  api.delete(`${BASE}/users/${id}`);

// ── Servers ───────────────────────────────────────────────────────

export const getServers = (page = 1) =>
  api.get<PaginatedResponse<AdminServer>>(`${BASE}/servers`, { page });

export const getServer = (id: number) =>
  api.get<FractalItem<AdminServer>>(`${BASE}/servers/${id}`);

export const suspendServer = (id: number) =>
  api.post(`${BASE}/servers/${id}/suspend`);

export const unsuspendServer = (id: number) =>
  api.post(`${BASE}/servers/${id}/unsuspend`);

export const reinstallServer = (id: number) =>
  api.post(`${BASE}/servers/${id}/reinstall`);

export const toggleServerInstall = (id: number) =>
  api.post(`${BASE}/servers/${id}/toggle-install`);

export const addServerMount = (serverId: number, mountId: number) =>
  api.post(`${BASE}/servers/${serverId}/mounts`, { mount_id: mountId });

export const removeServerMount = (serverId: number, mountId: number) =>
  api.delete(`${BASE}/servers/${serverId}/mounts/${mountId}`);

export const deleteServer = (id: number, force = false) =>
  api.delete(`${BASE}/servers/${id}${force ? '/force' : ''}`);

export const transferServer = (id: number, data: { node_id: number; allocation_id: number; allocation_additional?: number[] }) =>
  api.post<{ transfer_id: number }>(`${BASE}/servers/${id}/transfer`, data);

// ── Nodes ─────────────────────────────────────────────────────────

export const getNodes = (page = 1) =>
  api.get<PaginatedResponse<AdminNode>>(`${BASE}/nodes`, { page });

export const getNode = (id: number) =>
  api.get<FractalItem<AdminNode>>(`${BASE}/nodes/${id}`);

export const createNode = (data: Record<string, unknown>) =>
  api.post<FractalItem<AdminNode>>(`${BASE}/nodes`, data);

export const updateNode = (id: number, data: Record<string, unknown>) =>
  api.patch<FractalItem<AdminNode>>(`${BASE}/nodes/${id}`, data);

export const deleteNode = (id: number) =>
  api.delete(`${BASE}/nodes/${id}`);

export const getNodeConfiguration = (id: number) =>
  api.get<Record<string, any>>(`${BASE}/nodes/${id}/configuration`);

export const getNodeServers = (id: number, page = 1) =>
  api.get<PaginatedResponse<AdminServer>>(`${BASE}/servers`, {
    'filter[node_id]': String(id),
    page,
  });

// ── Locations ─────────────────────────────────────────────────────

export const getLocations = (page = 1) =>
  api.get<PaginatedResponse<AdminLocation>>(`${BASE}/locations`, { page });

export const createLocation = (data: { short: string; long?: string }) =>
  api.post<FractalItem<AdminLocation>>(`${BASE}/locations`, data);

export const updateLocation = (id: number, data: { short?: string; long?: string }) =>
  api.patch<FractalItem<AdminLocation>>(`${BASE}/locations/${id}`, data);

export const deleteLocation = (id: number) =>
  api.delete(`${BASE}/locations/${id}`);

// ── Servers (create / update) ─────────────────────────────────────

export const createServer = (data: {
  name: string;
  owner_id: number;
  node_id: number;
  allocation_id: number;
  nest_id: number;
  egg_id: number;
  startup: string;
  image: string;
  memory: number;
  swap: number;
  disk: number;
  io: number;
  cpu: number;
  database_limit?: number;
  allocation_limit?: number;
  backup_limit?: number;
  description?: string;
}) => api.post<FractalItem<AdminServer>>(`${BASE}/servers`, data);

export const updateServerDetails = (id: number, data: Record<string, unknown>) =>
  api.patch<FractalItem<AdminServer>>(`${BASE}/servers/${id}/details`, data);

export const updateServerBuild = (id: number, data: Record<string, unknown>) =>
  api.patch<FractalItem<AdminServer>>(`${BASE}/servers/${id}/build`, data);

export const updateServerStartup = (id: number, data: Record<string, unknown>) =>
  api.patch<FractalItem<AdminServer>>(`${BASE}/servers/${id}/startup`, data);

// ── Nests ─────────────────────────────────────────────────────────

export const getNests = (page = 1) =>
  api.get<PaginatedResponse<AdminNest>>(`${BASE}/nests`, { page });

export const getNest = (id: number) =>
  api.get<FractalItem<AdminNest>>(`${BASE}/nests/${id}`);

export const createNest = (data: { name: string; description?: string }) =>
  api.post<FractalItem<AdminNest>>(`${BASE}/nests`, data);

export const updateNest = (id: number, data: { name?: string; description?: string }) =>
  api.patch<FractalItem<AdminNest>>(`${BASE}/nests/${id}`, data);

export const deleteNest = (id: number) =>
  api.delete(`${BASE}/nests/${id}`);

// ── Eggs ──────────────────────────────────────────────────────────

export const getEggs = (nestId: number) =>
  api.get<PaginatedResponse<AdminEgg>>(`${BASE}/nests/${nestId}/eggs`);

export const getEgg = (nestId: number, eggId: number) =>
  api.get<FractalItem<AdminEgg>>(`${BASE}/nests/${nestId}/eggs/${eggId}`);

export const createEgg = (nestId: number, data: { name: string; description?: string; docker_images?: string; startup?: string; config_files?: string; script_install?: string; script_container?: string; script_entry?: string }) =>
  api.post<FractalItem<AdminEgg>>(`${BASE}/nests/${nestId}/eggs`, data);

export const updateEgg = (nestId: number, eggId: number, data: Record<string, any>) =>
  api.patch<FractalItem<AdminEgg>>(`${BASE}/nests/${nestId}/eggs/${eggId}`, data);

export const deleteEgg = (nestId: number, eggId: number) =>
  api.delete(`${BASE}/nests/${nestId}/eggs/${eggId}`);

export async function exportEgg(nestId: number, eggId: number): Promise<object> {
  const res = await fetch(`${BASE}/nests/${nestId}/eggs/${eggId}/export`, {
    credentials: 'include',
  });
  return res.json();
}

export const importEgg = (nestId: number, eggJson: object) =>
  api.post<FractalItem<AdminEgg>>(`${BASE}/nests/${nestId}/eggs/import`, eggJson);

// ── Egg Variables ─────────────────────────────────────────────────

export const getEggVariables = (nestId: number, eggId: number) =>
  api.get<{ object: string; data: FractalItem<any>[] }>(`${BASE}/nests/${nestId}/eggs/${eggId}/variables`);

export const createEggVariable = (nestId: number, eggId: number, data: Record<string, any>) =>
  api.post<FractalItem<any>>(`${BASE}/nests/${nestId}/eggs/${eggId}/variables`, data);

export const updateEggVariable = (nestId: number, eggId: number, variableId: number, data: Record<string, any>) =>
  api.patch<FractalItem<any>>(`${BASE}/nests/${nestId}/eggs/${eggId}/variables/${variableId}`, data);

export const deleteEggVariable = (nestId: number, eggId: number, variableId: number) =>
  api.delete(`${BASE}/nests/${nestId}/eggs/${eggId}/variables/${variableId}`);

// ── Allocations ───────────────────────────────────────────────────

export const getAllocations = (nodeId: number, page = 1) =>
  api.get<PaginatedResponse<AdminAllocation>>(`${BASE}/nodes/${nodeId}/allocations`, { page });

export const createAllocations = (nodeId: number, data: { ip: string; ports: string[]; alias?: string }) =>
  api.post(`${BASE}/nodes/${nodeId}/allocations`, data);

export const deleteAllocation = (nodeId: number, allocationId: number) =>
  api.delete(`${BASE}/nodes/${nodeId}/allocations/${allocationId}`);

export const removeAllocationBlock = (nodeId: number, ip: string) =>
  api.post(`${BASE}/nodes/${nodeId}/allocations/remove-block`, { ip });

export const removeMultipleAllocations = (nodeId: number, ids: number[]) =>
  api.post(`${BASE}/nodes/${nodeId}/allocations/remove-multiple`, { ids });

export const setAllocationAlias = (nodeId: number, allocationId: number, alias: string) =>
  api.post(`${BASE}/nodes/${nodeId}/allocations/alias`, { allocation_id: allocationId, alias });

export const getNodeSystemInfo = (nodeId: number) =>
  api.get<Record<string, unknown>>(`${BASE}/nodes/${nodeId}/system-information`);

export const getAutoDeployToken = (nodeId: number) =>
  api.post<{ node: number; token: string }>(`${BASE}/nodes/${nodeId}/configuration/token`);

// ── Databases ─────────────────────────────────────────────────────

export const getServerDatabases = (serverId: number) =>
  api.get<PaginatedResponse<AdminDatabase>>(`${BASE}/servers/${serverId}/databases`);

export const createServerDatabase = (serverId: number, data: { database: string; host: number; remote?: string }) =>
  api.post<FractalItem<AdminDatabase>>(`${BASE}/servers/${serverId}/databases`, data);

export const resetDatabasePassword = (serverId: number, dbId: number) =>
  api.post(`${BASE}/servers/${serverId}/databases/${dbId}/reset-password`);

export const deleteServerDatabase = (serverId: number, dbId: number) =>
  api.delete(`${BASE}/servers/${serverId}/databases/${dbId}`);

// ── Database Hosts ────────────────────────────────────────────────

export interface AdminDatabaseHost {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string;
  max_databases: number | null;
  node_id: number | null;
  created_at: string;
  updated_at: string;
}

export const getDatabaseHosts = (page?: number) =>
  api.get<PaginatedResponse<AdminDatabaseHost>>(`${BASE}/database-hosts`, { page: page || 1 });

export const getDatabaseHost = (id: number) =>
  api.get<FractalItem<AdminDatabaseHost>>(`${BASE}/database-hosts/${id}`);

export const getDatabaseHostDatabases = (hostId: number) =>
  api.get<PaginatedResponse<AdminDatabase>>(`${BASE}/database-hosts/${hostId}/databases`);

export const createDatabaseHost = (data: { name: string; host: string; port?: number; username: string; password: string; max_databases?: number; node_id?: number }) =>
  api.post<FractalItem<AdminDatabaseHost>>(`${BASE}/database-hosts`, data);

export const updateDatabaseHost = (id: number, data: Record<string, any>) =>
  api.patch<FractalItem<AdminDatabaseHost>>(`${BASE}/database-hosts/${id}`, data);

export const deleteDatabaseHost = (id: number) =>
  api.delete(`${BASE}/database-hosts/${id}`);

// ── Settings ─────────────────────────────────────────────────────

export interface AdminSetting {
  key: string;
  value: string;
}

export const getSettings = () =>
  api.get<FractalItem<AdminSetting>[]>(`${BASE}/settings`);

export const updateSettings = (data: Record<string, string>) =>
  api.patch<FractalItem<AdminSetting>[]>(`${BASE}/settings`, data);

export const sendTestMail = () =>
  api.post(`${BASE}/settings/mail/test`);

// ── API Keys ─────────────────────────────────────────────────────

export interface AdminApiKey {
  id: number;
  identifier: string;
  description: string;
  allowed_ips: string[];
  permissions: Record<string, number>;
  last_used_at: string | null;
  created_at: string;
}

export const getApiKeys = () =>
  api.get<PaginatedResponse<AdminApiKey>>(`${BASE}/api-keys`);

export const createApiKey = (data: { description: string; allowed_ips?: string[]; permissions?: Record<string, number> }) =>
  api.post<{ object: string; attributes: AdminApiKey; meta: { secret_token: string } }>(`${BASE}/api-keys`, data);

export const deleteApiKey = (id: number) =>
  api.delete(`${BASE}/api-keys/${id}`);

// ── Mounts ────────────────────────────────────────────────────────

export interface AdminMount {
  id: number;
  uuid: string;
  name: string;
  description: string;
  source: string;
  target: string;
  read_only: boolean;
  user_mountable: boolean;
  eggs?: { id: number; name: string }[];
  nodes?: { id: number; name: string }[];
  servers?: { id: number; name: string }[];
}

export const getMounts = (page = 1) =>
  api.get<PaginatedResponse<AdminMount>>(`${BASE}/mounts`, { page });

export const getMount = (id: number) =>
  api.get<FractalItem<AdminMount>>(`${BASE}/mounts/${id}`);

export const createMount = (data: Partial<AdminMount>) =>
  api.post<FractalItem<AdminMount>>(`${BASE}/mounts`, data);

export const updateMount = (id: number, data: Partial<AdminMount>) =>
  api.patch<FractalItem<AdminMount>>(`${BASE}/mounts/${id}`, data);

export const deleteMount = (id: number) =>
  api.delete(`${BASE}/mounts/${id}`);

export const attachMountEggs = (id: number, eggs: number[]) =>
  api.post(`${BASE}/mounts/${id}/eggs`, { eggs });

export const attachMountNodes = (id: number, nodes: number[]) =>
  api.post(`${BASE}/mounts/${id}/nodes`, { nodes });

export const detachMountEgg = (mountId: number, eggId: number) =>
  api.delete(`${BASE}/mounts/${mountId}/eggs/${eggId}`);

export const detachMountNode = (mountId: number, nodeId: number) =>
  api.delete(`${BASE}/mounts/${mountId}/nodes/${nodeId}`);

// ── Activity Logs ─────────────────────────────────────────────────

export interface ActivityLogSubject {
  id: number;
  subject_type: string;
  subject_id: number;
}

export interface ActivityLogEntry {
  id: number;
  batch: string | null;
  event: string;
  ip: string;
  description: string | null;
  actor_type: string | null;
  actor_id: number | null;
  api_key_id: number | null;
  properties: Record<string, unknown> | null;
  timestamp: string;
  subjects: ActivityLogSubject[];
}

export const getActivityLogs = (
  page = 1,
  filters?: { event?: string; ip?: string; actor_id?: string },
) => {
  const params: Record<string, string> = { page: String(page) };
  if (filters?.event) params['filter[event]'] = filters.event;
  if (filters?.ip) params['filter[ip]'] = filters.ip;
  if (filters?.actor_id) params['filter[actor_id]'] = filters.actor_id;
  return api.get<PaginatedResponse<ActivityLogEntry>>(`${BASE}/activity`, params);
};

export const clearActivityLogs = (olderThanDays: number) =>
  api.post<{ deleted: number }>(`${BASE}/activity/clear`, { older_than_days: olderThanDays });

// ── Domains ───────────────────────────────────────────────────────

export interface AdminDomain {
  id: number;
  name: string;
  dns_provider: string;
  dns_config: Record<string, unknown>;
  is_active: boolean;
  is_default: boolean;
  subdomain_count: number;
  created_at: string;
  updated_at: string;
}

export const getDomains = (page = 1) =>
  api.get<PaginatedResponse<AdminDomain>>(`${BASE}/domains`, { page });

export const getDomain = (id: number) =>
  api.get<FractalItem<AdminDomain>>(`${BASE}/domains/${id}`);

export const createDomain = (data: Partial<AdminDomain>) =>
  api.post<FractalItem<AdminDomain>>(`${BASE}/domains`, data);

export const updateDomain = (id: number, data: Partial<AdminDomain>) =>
  api.patch<FractalItem<AdminDomain>>(`${BASE}/domains/${id}`, data);

export const deleteDomain = (id: number) =>
  api.delete(`${BASE}/domains/${id}`);

export const testDnsConnection = (data: { dns_provider: string; dns_config: Record<string, unknown> }) =>
  api.post<{ success: boolean; message?: string; error?: string }>(`${BASE}/domains/test-connection`, data);

export const getDnsProviderSchema = (provider: string) =>
  api.get<{ fields: { key: string; label: string; type: string; required: boolean }[] }>(`${BASE}/domains/provider-schema/${provider}`);

// ── Overview counts ───────────────────────────────────────────────

export async function getAdminOverview() {
  const [users, servers, nodes, locations, nests] = await Promise.all([
    getUsers(1),
    getServers(1),
    getNodes(1),
    getLocations(1),
    getNests(1),
  ]);
  return {
    users: users.meta.pagination.total,
    servers: servers.meta.pagination.total,
    nodes: nodes.meta.pagination.total,
    locations: locations.meta.pagination.total,
    nests: nests.meta.pagination.total,
  };
}
