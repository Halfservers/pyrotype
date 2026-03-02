import http from '@/lib/api/http';

export interface FractalItem<T> {
  object: string;
  attributes: T;
}

export interface PaginatedResponse<T> {
  object: 'list';
  data: FractalItem<T>[];
  meta: {
    pagination: {
      total: number;
      count: number;
      per_page: number;
      current_page: number;
      total_pages: number;
    };
  };
}

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
  created_at: string;
  updated_at: string;
}

export interface AdminNode {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  fqdn: string;
  scheme: string;
  behind_proxy: boolean;
  maintenance_mode: boolean;
  memory: number;
  memory_overallocate: number;
  disk: number;
  disk_overallocate: number;
  daemon_listen: number;
  daemon_sftp: number;
  daemon_base: string;
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

const BASE = '/api/application';

// ── Users ─────────────────────────────────────────────────────────

export const getUsers = (page = 1) =>
  http.get<PaginatedResponse<AdminUser>>(`${BASE}/users`, { params: { page } }).then((r) => r.data);

export const getUser = (id: number) =>
  http.get<FractalItem<AdminUser>>(`${BASE}/users/${id}`).then((r) => r.data);

export const createUser = (data: {
  username: string;
  email: string;
  name_first: string;
  name_last?: string;
  password?: string;
  root_admin?: boolean;
}) => http.post<FractalItem<AdminUser>>(`${BASE}/users`, data).then((r) => r.data);

export const updateUser = (id: number, data: Record<string, unknown>) =>
  http.patch<FractalItem<AdminUser>>(`${BASE}/users/${id}`, data).then((r) => r.data);

export const deleteUser = (id: number) =>
  http.delete(`${BASE}/users/${id}`);

// ── Servers ───────────────────────────────────────────────────────

export const getServers = (page = 1) =>
  http.get<PaginatedResponse<AdminServer>>(`${BASE}/servers`, { params: { page } }).then((r) => r.data);

export const getServer = (id: number) =>
  http.get<FractalItem<AdminServer>>(`${BASE}/servers/${id}`).then((r) => r.data);

export const suspendServer = (id: number) =>
  http.post(`${BASE}/servers/${id}/suspend`);

export const unsuspendServer = (id: number) =>
  http.post(`${BASE}/servers/${id}/unsuspend`);

export const reinstallServer = (id: number) =>
  http.post(`${BASE}/servers/${id}/reinstall`);

export const deleteServer = (id: number, force = false) =>
  http.delete(`${BASE}/servers/${id}${force ? '/force' : ''}`);

// ── Nodes ─────────────────────────────────────────────────────────

export const getNodes = (page = 1) =>
  http.get<PaginatedResponse<AdminNode>>(`${BASE}/nodes`, { params: { page } }).then((r) => r.data);

export const getNode = (id: number) =>
  http.get<FractalItem<AdminNode>>(`${BASE}/nodes/${id}`).then((r) => r.data);

export const createNode = (data: Record<string, unknown>) =>
  http.post<FractalItem<AdminNode>>(`${BASE}/nodes`, data).then((r) => r.data);

export const updateNode = (id: number, data: Record<string, unknown>) =>
  http.patch<FractalItem<AdminNode>>(`${BASE}/nodes/${id}`, data).then((r) => r.data);

export const deleteNode = (id: number) =>
  http.delete(`${BASE}/nodes/${id}`);

// ── Locations ─────────────────────────────────────────────────────

export const getLocations = (page = 1) =>
  http.get<PaginatedResponse<AdminLocation>>(`${BASE}/locations`, { params: { page } }).then((r) => r.data);

export const createLocation = (data: { short: string; long?: string }) =>
  http.post<FractalItem<AdminLocation>>(`${BASE}/locations`, data).then((r) => r.data);

export const updateLocation = (id: number, data: { short?: string; long?: string }) =>
  http.patch<FractalItem<AdminLocation>>(`${BASE}/locations/${id}`, data).then((r) => r.data);

export const deleteLocation = (id: number) =>
  http.delete(`${BASE}/locations/${id}`);

// ── Nests ─────────────────────────────────────────────────────────

export const getNests = (page = 1) =>
  http.get<PaginatedResponse<AdminNest>>(`${BASE}/nests`, { params: { page } }).then((r) => r.data);

// ── Overview counts ───────────────────────────────────────────────

export async function getAdminOverview() {
  const [users, servers, nodes, locations] = await Promise.all([
    getUsers(1),
    getServers(1),
    getNodes(1),
    getLocations(1),
  ]);
  return {
    users: users.meta.pagination.total,
    servers: servers.meta.pagination.total,
    nodes: nodes.meta.pagination.total,
    locations: locations.meta.pagination.total,
  };
}
