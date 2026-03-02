export type ServerStatus =
  | 'installing'
  | 'install_failed'
  | 'reinstall_failed'
  | 'suspended'
  | 'restoring_backup'
  | null;

export interface SftpDetails {
  ip: string;
  port: number;
}

export interface ServerLimits {
  memory: number;
  swap: number;
  disk: number;
  io: number;
  cpu: number;
  threads: string;
}

export interface ServerFeatureLimits {
  databases: number;
  allocations: number;
  backups: number;
  backupStorageMb: number | null;
}

export interface Allocation {
  id: number;
  ip: string;
  alias: string | null;
  port: number;
  notes: string | null;
  isDefault: boolean;
}

export interface ServerEggVariable {
  name: string;
  description: string;
  envVariable: string;
  defaultValue: string;
  serverValue: string | null;
  isEditable: boolean;
  rules: string[];
}

export interface Server {
  id: string;
  internalId: number | string;
  uuid: string;
  name: string;
  node: string;
  isNodeUnderMaintenance: boolean;
  status: ServerStatus;
  sftpDetails: SftpDetails;
  invocation: string;
  dockerImage: string;
  description: string;
  limits: ServerLimits;
  eggFeatures: string[];
  featureLimits: ServerFeatureLimits;
  isTransferring: boolean;
  variables: ServerEggVariable[];
  allocations: Allocation[];
  egg: string;
  daemonType: string;
}
