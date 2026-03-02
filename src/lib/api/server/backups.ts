import http from '@/lib/api/http';
import { getGlobalDaemonType } from '@/lib/api/server/get-server';
import { type ServerBackup, rawDataToServerBackup } from '@/lib/api/transformers';

interface CreateBackupParams {
  name?: string;
  ignored?: string;
  isLocked: boolean;
}

interface CreateBackupResult {
  backup: ServerBackup;
  jobId: string;
  status: string;
  progress: number;
  message?: string;
}

export const createServerBackup = async (
  uuid: string,
  params: CreateBackupParams,
): Promise<CreateBackupResult> => {
  const daemonType = getGlobalDaemonType();
  const response = await http.post(`/api/client/servers/${daemonType}/${uuid}/backups`, {
    name: params.name,
    ignored: params.ignored,
    is_locked: params.isLocked,
  });

  if (!response.data) {
    throw new Error('Invalid response: missing data');
  }

  if (response.data.data && response.data.meta) {
    const backupData = rawDataToServerBackup(response.data.data);
    return {
      backup: backupData,
      jobId: response.data.meta.job_id,
      status: response.data.meta.status,
      progress: response.data.meta.progress,
      message: response.data.meta.message,
    };
  }

  if (response.data.job_id && response.data.status) {
    const tempBackup: ServerBackup = {
      uuid: '',
      name: params.name || 'Pending...',
      isSuccessful: false,
      isLocked: params.isLocked,
      isAutomatic: false,
      ignoredFiles: params.ignored || '',
      checksum: '',
      bytes: 0,
      sizeGb: 0,
      adapter: '',
      isRustic: false,
      snapshotId: null,
      createdAt: new Date(),
      completedAt: null,
      canRetry: false,
      jobStatus: response.data.status,
      jobProgress: 0,
      jobMessage: response.data.message || '',
      jobId: response.data.job_id,
      jobError: null,
      jobStartedAt: null,
      jobLastUpdatedAt: null,
      isInProgress: true,
    };

    return {
      backup: tempBackup,
      jobId: response.data.job_id,
      status: response.data.status,
      progress: 0,
      message: response.data.message || '',
    };
  }

  if (response.data.uuid || response.data.object === 'backup') {
    const backupData = rawDataToServerBackup(response.data);
    return {
      backup: backupData,
      jobId: backupData.jobId || '',
      status: backupData.jobStatus || 'pending',
      progress: backupData.jobProgress || 0,
      message: backupData.jobMessage || '',
    };
  }

  throw new Error('Invalid response: unknown structure');
};

export const deleteServerBackup = async (
  uuid: string,
  backup: string,
): Promise<{ jobId: string; status: string; message: string }> => {
  const response = await http.delete(`/api/client/servers/${uuid}/backups/${backup}`);
  return {
    jobId: response.data.job_id,
    status: response.data.status,
    message: response.data.message,
  };
};

export const deleteAllServerBackups = async (
  uuid: string,
  password: string,
  twoFactor: boolean,
  totpCode?: string,
): Promise<number> => {
  const daemonType = getGlobalDaemonType();
  const response = await http.delete(
    `/api/client/servers/${daemonType}/${uuid}/backups/delete-all`,
    {
      data: {
        password,
        ...(twoFactor ? { totp_code: totpCode } : {}),
      },
    },
  );
  return response.status;
};

export const getServerBackupDownloadUrl = async (
  uuid: string,
  backup: string,
): Promise<string> => {
  const { data } = await http.get(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/backups/${backup}/download`,
  );
  return data.attributes.url;
};

export const renameServerBackup = async (
  uuid: string,
  backup: string,
  name: string,
): Promise<ServerBackup> => {
  const { data } = await http.post(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/backups/${backup}/rename`,
    { name },
  );
  return rawDataToServerBackup(data);
};

export interface BackupJobStatus {
  job_id: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message?: string;
  error?: string;
  is_successful: boolean;
  can_cancel: boolean;
  can_retry: boolean;
  started_at?: string;
  last_updated_at?: string;
  completed_at?: string;
}

export const getBackupStatus = async (
  uuid: string,
  backupUuid: string,
): Promise<BackupJobStatus> => {
  const daemonType = getGlobalDaemonType();
  const { data } = await http.get(
    `/api/client/servers/${daemonType}/${uuid}/backups/${backupUuid}/status`,
  );
  return data;
};

export const retryBackup = async (
  uuid: string,
  backupUuid: string,
): Promise<{ message: string; job_id: string; status: string; progress: number }> => {
  const daemonType = getGlobalDaemonType();
  const { data } = await http.post(
    `/api/client/servers/${daemonType}/${uuid}/backups/${backupUuid}/retry`,
  );
  return data;
};

export const restoreServerBackup = async (
  uuid: string,
  backup: string,
): Promise<{ jobId: string; status: string; message: string }> => {
  const daemonType = getGlobalDaemonType();
  const response = await http.post(
    `/api/client/servers/${daemonType}/${uuid}/backups/${backup}/restore`,
    {
      adapter: 'rustic_s3',
      truncate_directory: true,
      download_url: '',
    },
  );
  return {
    jobId: response.data.job_id,
    status: response.data.status,
    message: response.data.message,
  };
};
