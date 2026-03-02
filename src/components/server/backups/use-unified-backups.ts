import { useCallback, useContext } from 'react';

import { useServerBackupsQuery } from '@/lib/queries/hooks';
import { useServerStore } from '@/store/server';

import { LiveProgressContext } from './backup-container';

export interface UnifiedBackup {
  uuid: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message: string;
  isSuccessful?: boolean;
  isLocked: boolean;
  isAutomatic: boolean;
  checksum?: string;
  bytes?: number;
  createdAt: Date;
  completedAt?: Date | null;
  canRetry: boolean;
  canDelete: boolean;
  canDownload: boolean;
  canRestore: boolean;
  isLiveOnly: boolean;
  isDeletion?: boolean;
}

export const useUnifiedBackups = () => {
  const uuid = useServerStore((state) => state.server?.uuid ?? '');
  const { data: backups, error, isLoading: isValidating, refetch } = useServerBackupsQuery(uuid);

  const liveProgress = useContext(LiveProgressContext);

  const createBackup = useCallback(
    async (name: string, ignored: string, isLocked: boolean) => {
      const { createServerBackup } = await import('@/lib/api/server/backups');
      const result = await createServerBackup(uuid, { name, ignored, isLocked });
      refetch();
      return result;
    },
    [uuid, refetch],
  );

  const deleteBackup = useCallback(
    async (backupUuid: string) => {
      const { deleteServerBackup } = await import('@/lib/api/server/backups');
      const result = await deleteServerBackup(uuid, backupUuid);
      refetch();
      return result;
    },
    [uuid, refetch],
  );

  const retryBackup = useCallback(
    async (backupUuid: string) => {
      const { retryBackup: retryBackupApi } = await import('@/lib/api/server/backups');
      await retryBackupApi(uuid, backupUuid);
      refetch();
    },
    [uuid, refetch],
  );

  const restoreBackup = useCallback(
    async (backupUuid: string) => {
      const { restoreServerBackup } = await import('@/lib/api/server/backups');
      const result = await restoreServerBackup(uuid, backupUuid);
      refetch();
      return result;
    },
    [uuid, refetch],
  );

  const renameBackup = useCallback(
    async (backupUuid: string, newName: string) => {
      const http = (await import('@/lib/api/http')).default;
      await http.post(`/api/client/servers/${uuid}/backups/${backupUuid}/rename`, { name: newName });
      refetch();
    },
    [uuid, refetch],
  );

  const toggleBackupLock = useCallback(
    async (backupUuid: string) => {
      const http = (await import('@/lib/api/http')).default;
      await http.post(`/api/client/servers/${uuid}/backups/${backupUuid}/lock`);
      refetch();
    },
    [uuid, refetch],
  );

  const unifiedBackups: UnifiedBackup[] = [];

  if (backups?.items) {
    for (const backup of backups.items) {
      const live = liveProgress[backup.uuid];

      unifiedBackups.push({
        uuid: backup.uuid,
        name: live?.backupName || backup.name,
        status: live ? (live.status as UnifiedBackup['status']) : backup.isSuccessful ? 'completed' : 'failed',
        progress: live ? live.progress : backup.isSuccessful ? 100 : 0,
        message: live ? live.message : backup.isSuccessful ? 'Completed' : 'Failed',
        isSuccessful: backup.isSuccessful,
        isLocked: backup.isLocked,
        isAutomatic: backup.isAutomatic,
        checksum: backup.checksum,
        bytes: backup.bytes,
        createdAt: backup.createdAt,
        completedAt: backup.completedAt,
        canRetry: live ? live.canRetry : backup.canRetry,
        canDelete: !live,
        canDownload: backup.isSuccessful && !live,
        canRestore: backup.isSuccessful && !live,
        isLiveOnly: false,
        isDeletion: live?.isDeletion || false,
      });
    }
  }

  for (const [backupUuid, live] of Object.entries(liveProgress)) {
    const existsInSwr = unifiedBackups.some((b) => b.uuid === backupUuid);

    if (!existsInSwr && !live.isDeletion) {
      unifiedBackups.push({
        uuid: backupUuid,
        name: live.backupName || live.message || 'Processing...',
        status: live.status as UnifiedBackup['status'],
        progress: live.progress,
        message: live.message,
        isSuccessful: false,
        isLocked: false,
        isAutomatic: false,
        checksum: undefined,
        bytes: undefined,
        createdAt: new Date(),
        completedAt: null,
        canRetry: live.canRetry,
        canDelete: false,
        canDownload: false,
        canRestore: false,
        isLiveOnly: true,
        isDeletion: false,
      });
    }
  }

  unifiedBackups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return {
    backups: unifiedBackups,
    backupCount: backups?.backupCount || 0,
    storage: backups?.storage,
    pagination: backups?.pagination,
    error,
    isValidating,
    createBackup,
    deleteBackup,
    retryBackup,
    restoreBackup,
    renameBackup,
    toggleBackupLock,
    refresh: () => refetch(),
  };
};
