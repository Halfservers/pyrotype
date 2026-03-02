import { useQuery } from '@tanstack/react-query';

import { getAccountActivity, type ActivityLogFilters } from '@/lib/api/account/activity';
import { getSSHKeys } from '@/lib/api/account/ssh-keys';
import getServers from '@/lib/api/get-servers';
import {
  createServerBackup as _createBackup,
  deleteServerBackup as _deleteBackup,
} from '@/lib/api/server/backups';
import { loadDirectory } from '@/lib/api/server/files';
import { getServerSchedules } from '@/lib/api/server/schedules';
import { getServerStartup } from '@/lib/api/server/startup';
import { getServerSubusers } from '@/lib/api/server/users';
import { queryKeys } from '@/lib/queries/keys';

import http, { getPaginationSet } from '@/lib/api/http';
import { getGlobalDaemonType } from '@/lib/api/server/get-server';
import { rawDataToServerAllocation, rawDataToServerBackup } from '@/lib/api/transformers';

export const useServerListQuery = (params?: {
  query?: string;
  page?: number;
  type?: string;
}) =>
  useQuery({
    queryKey: queryKeys.servers.list(params),
    queryFn: () => getServers(params ?? {}),
  });

export const useServerBackupsQuery = (serverId: string, page = 1) =>
  useQuery({
    queryKey: [...queryKeys.servers.backups(serverId), page],
    queryFn: async () => {
      const daemonType = getGlobalDaemonType();
      const { data } = await http.get(
        `/api/client/servers/${daemonType}/${serverId}/backups`,
        { params: { page } },
      );
      return {
        items: (data.data || []).map(rawDataToServerBackup),
        pagination: getPaginationSet(data.meta.pagination),
        backupCount: data.meta.backup_count,
        storage: data.meta.storage,
        limits: data.meta.limits,
      };
    },
    enabled: !!serverId,
  });

export const useServerStartupQuery = (serverId: string) =>
  useQuery({
    queryKey: queryKeys.servers.startup(serverId),
    queryFn: () => getServerStartup(serverId),
    enabled: !!serverId,
  });

export const useServerAllocationsQuery = (serverId: string) =>
  useQuery({
    queryKey: queryKeys.servers.allocations(serverId),
    queryFn: async () => {
      const daemonType = getGlobalDaemonType();
      const { data } = await http.get(
        `/api/client/servers/${daemonType}/${serverId}/network/allocations`,
      );
      return (data.data || []).map(rawDataToServerAllocation);
    },
    enabled: !!serverId,
  });

export const useFileManagerQuery = (serverId: string, directory: string) =>
  useQuery({
    queryKey: queryKeys.servers.files(serverId, directory),
    queryFn: () => loadDirectory(serverId, directory),
    enabled: !!serverId,
  });

export const useServerActivityQuery = (
  serverId: string,
  filters?: ActivityLogFilters,
) =>
  useQuery({
    queryKey: [...queryKeys.servers.activity(serverId), filters],
    queryFn: async () => {
      const daemonType = getGlobalDaemonType();
      const { data } = await http.get(
        `/api/client/servers/${daemonType}/${serverId}/activity`,
        {
          params: {
            include: ['actor'],
            ...(filters?.page ? { page: filters.page } : {}),
          },
        },
      );
      return {
        items: (data.data || []).map((item: any) => ({
          id: item.attributes.id,
          batch: item.attributes.batch,
          event: item.attributes.event,
          isApi: item.attributes.is_api,
          ip: item.attributes.ip,
          description: item.attributes.description,
          properties: item.attributes.properties || {},
          hasAdditionalMetadata: item.attributes.has_additional_metadata,
          timestamp: new Date(item.attributes.timestamp),
        })),
        pagination: getPaginationSet(data.meta.pagination),
      };
    },
    enabled: !!serverId,
  });

export const useAccountActivityQuery = (filters?: ActivityLogFilters) =>
  useQuery({
    queryKey: [...queryKeys.account.activity(), filters],
    queryFn: () => getAccountActivity(filters),
  });

export const useSSHKeysQuery = () =>
  useQuery({
    queryKey: queryKeys.account.sshKeys(),
    queryFn: getSSHKeys,
  });

export const useServerSchedulesQuery = (serverId: string) =>
  useQuery({
    queryKey: queryKeys.servers.schedules(serverId),
    queryFn: () => getServerSchedules(serverId),
    enabled: !!serverId,
  });

export const useServerSubusersQuery = (serverId: string) =>
  useQuery({
    queryKey: queryKeys.servers.subusers(serverId),
    queryFn: () => getServerSubusers(serverId),
    enabled: !!serverId,
  });

export const useServerDatabasesQuery = (serverId: string) =>
  useQuery({
    queryKey: queryKeys.servers.databases(serverId),
    queryFn: async () => {
      const { getServerDatabases } = await import('@/lib/api/server/databases');
      return getServerDatabases(serverId);
    },
    enabled: !!serverId,
  });
