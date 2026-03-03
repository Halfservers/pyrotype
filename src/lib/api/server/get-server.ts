import { api } from '@/lib/http';
import type { FractalResponseData, FractalResponseList } from '@/types/api';
import {
  type Allocation,
  type ServerEggVariable,
  rawDataToServerAllocation,
  rawDataToServerEggVariable,
} from '@/lib/api/transformers';

export type ServerStatus =
  | 'installing'
  | 'install_failed'
  | 'reinstall_failed'
  | 'suspended'
  | 'restoring_backup'
  | null;

export interface Server {
  id: string;
  internalId: number | string;
  uuid: string;
  name: string;
  node: string;
  isNodeUnderMaintenance: boolean;
  status: ServerStatus;
  sftpDetails: {
    ip: string;
    port: number;
  };
  invocation: string;
  dockerImage: string;
  description: string | null;
  limits: {
    memory: number;
    swap: number;
    disk: number;
    io: number;
    cpu: number;
    threads: string;
  };
  eggFeatures: string[];
  featureLimits: {
    databases: number;
    allocations: number;
    backups: number;
    backupStorageMb: number | null;
  };
  isTransferring: boolean;
  variables: ServerEggVariable[];
  allocations: Allocation[];
  egg: string;
  daemonType: string;
}

export const rawDataToServerObject = ({ attributes: data }: FractalResponseData): Server => ({
  id: data.identifier,
  internalId: data.internal_id,
  uuid: data.uuid,
  name: data.name,
  node: data.node,
  isNodeUnderMaintenance: data.is_node_under_maintenance,
  status: data.status,
  invocation: data.invocation,
  dockerImage: data.docker_image,
  sftpDetails: {
    ip: data.sftp_details.ip,
    port: data.sftp_details.port,
  },
  description: data.description ? (data.description.length > 0 ? data.description : null) : null,
  limits: { ...data.limits },
  eggFeatures: data.egg_features || [],
  featureLimits: { ...data.feature_limits },
  isTransferring: data.is_transferring,
  variables: (
    (data.relationships?.variables as FractalResponseList | undefined)?.data || []
  ).map(rawDataToServerEggVariable),
  allocations: (
    (data.relationships?.allocations as FractalResponseList | undefined)?.data || []
  ).map(rawDataToServerAllocation),
  egg: data.egg,
  daemonType: data.daemonType,
});

let globalDaemonType: string | null = null;

export const getGlobalDaemonType = (): string | null => globalDaemonType;
export const setGlobalDaemonType = (type: string): void => {
  globalDaemonType = type;
};

export default async (uuid: string): Promise<[Server, string[]]> => {
  let daemonTypeApi = 'elytra';

  const firstResponse: any = await api.get(`/api/client/servers/${uuid}`);
  daemonTypeApi = firstResponse?.meta.daemonType;
  const daemonType: string = firstResponse?.meta.daemonType;

  if (daemonType) {
    globalDaemonType = daemonType;
  }

  const payload: any = await api.get(`/api/client/servers/${daemonType}/${uuid}`);

  const server = rawDataToServerObject(payload);
  server.daemonType = daemonTypeApi;

  const permissions = payload.meta?.is_server_owner
    ? ['*']
    : (payload.meta?.user_permissions as string[] | undefined) || [];

  return [server, permissions];
};
