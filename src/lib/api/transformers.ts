import type { FractalResponseData } from '@/types/api';

export interface Allocation {
  id: number;
  ip: string;
  alias: string | null;
  port: number;
  notes: string | null;
  isDefault: boolean;
}

export interface FileObject {
  key: string;
  name: string;
  mode: string;
  modeBits: string;
  size: number;
  isFile: boolean;
  isSymlink: boolean;
  mimetype: string;
  createdAt: Date;
  modifiedAt: Date;
  isArchiveType: () => boolean;
  isEditable: () => boolean;
}

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

export interface ServerEggVariable {
  name: string;
  description: string;
  envVariable: string;
  defaultValue: string;
  serverValue: string | null;
  isEditable: boolean;
  rules: string[];
}

export const rawDataToServerAllocation = (data: FractalResponseData): Allocation => ({
  id: data.attributes.id,
  ip: data.attributes.ip,
  alias: data.attributes.ip_alias,
  port: data.attributes.port,
  notes: data.attributes.notes,
  isDefault: data.attributes.is_default,
});

const ARCHIVE_MIMETYPES = [
  'application/vnd.rar',
  'application/x-rar-compressed',
  'application/x-tar',
  'application/x-br',
  'application/x-bzip2',
  'application/gzip',
  'application/x-gzip',
  'application/x-lzip',
  'application/x-sz',
  'application/x-xz',
  'application/zstd',
  'application/zip',
  'application/x-7z-compressed',
];

export const rawDataToFileObject = (data: FractalResponseData): FileObject => ({
  key: `${data.attributes.is_file ? 'file' : 'dir'}_${data.attributes.name}`,
  name: data.attributes.name,
  mode: data.attributes.mode,
  modeBits: data.attributes.mode_bits,
  size: Number(data.attributes.size),
  isFile: data.attributes.is_file,
  isSymlink: data.attributes.is_symlink,
  mimetype: data.attributes.mimetype,
  createdAt: new Date(data.attributes.created_at),
  modifiedAt: new Date(data.attributes.modified_at),

  isArchiveType: function () {
    return this.isFile && ARCHIVE_MIMETYPES.indexOf(this.mimetype) >= 0;
  },

  isEditable: function () {
    if (this.isArchiveType() || !this.isFile) return false;
    const matches = ['application/jar', 'application/octet-stream', 'inode/directory', /^image\/(?!svg\+xml)/];
    return matches.every((m) => !this.mimetype.match(m));
  },
});

export const rawDataToServerBackup = ({ attributes }: FractalResponseData): ServerBackup => ({
  uuid: attributes.uuid,
  isSuccessful: attributes.is_successful,
  isLocked: attributes.is_locked,
  isAutomatic: attributes.is_automatic || false,
  name: attributes.name,
  ignoredFiles: attributes.ignored_files,
  checksum: attributes.checksum,
  bytes: attributes.bytes,
  sizeGb: attributes.size_gb,
  adapter: attributes.adapter,
  isRustic: attributes.is_rustic,
  snapshotId: attributes.snapshot_id,
  createdAt: new Date(attributes.created_at),
  completedAt: attributes.completed_at ? new Date(attributes.completed_at) : null,
  jobId: attributes.job_id || null,
  jobStatus: attributes.job_status || 'completed',
  jobProgress: attributes.job_progress || (attributes.is_successful ? 100 : 0),
  jobMessage: attributes.job_message || null,
  jobError: attributes.job_error || null,
  jobStartedAt: attributes.job_started_at ? new Date(attributes.job_started_at) : null,
  jobLastUpdatedAt: attributes.job_last_updated_at ? new Date(attributes.job_last_updated_at) : null,
  canRetry: attributes.can_retry || false,
  isInProgress: ['pending', 'running'].includes(attributes.job_status || ''),
});

export const rawDataToServerEggVariable = ({ attributes }: FractalResponseData): ServerEggVariable => ({
  name: attributes.name,
  description: attributes.description,
  envVariable: attributes.env_variable,
  defaultValue: attributes.default_value,
  serverValue: attributes.server_value,
  isEditable: attributes.is_editable,
  rules: attributes.rules.split('|'),
});
