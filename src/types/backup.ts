export interface ServerBackup {
  uuid: string;
  isSuccessful: boolean;
  isLocked: boolean;
  isAutomatic: boolean;
  name: string;
  ignoredFiles: string;
  checksum: string;
  bytes: number;
  sizeGb: number;
  adapter: string;
  isRustic: boolean;
  snapshotId: string | null;
  createdAt: Date;
  completedAt: Date | null;
  jobId: string | null;
  jobStatus: 'pending' | 'running' | 'completed' | 'failed';
  jobProgress: number;
  jobMessage: string | null;
  jobError: string | null;
  jobStartedAt: Date | null;
  jobLastUpdatedAt: Date | null;
  canRetry: boolean;
  isInProgress: boolean;
}
