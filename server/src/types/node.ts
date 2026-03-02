export interface NodeAttributes {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  locationId: number;
  fqdn: string;
  scheme: 'http' | 'https';
  behindProxy: boolean;
  maintenanceMode: boolean;
  memory: number;
  memoryOverallocate: number;
  disk: number;
  diskOverallocate: number;
  daemonListen: number;
  daemonSftp: number;
  daemonBase: string;
  daemonType: 'wings' | 'elytra';
  uploadSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface AllocationAttributes {
  id: number;
  ip: string;
  alias: string | null;
  port: number;
  serverId: number | null;
  nodeId: number;
  assigned: boolean;
}
