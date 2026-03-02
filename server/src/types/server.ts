export interface ServerAttributes {
  id: number;
  externalId: string | null;
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
    oomDisabled: boolean;
  };
  featureLimits: {
    databases: number;
    allocations: number;
    backups: number;
  };
  userId: number;
  nodeId: number;
  allocationId: number;
  nestId: number;
  eggId: number;
}

export type ServerStatus = 'installing' | 'install_failed' | 'suspended' | 'restoring_backup' | null;
