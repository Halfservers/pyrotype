import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createApiKey, deleteApiKey } from '@/lib/api/account/api-keys';
import { createSSHKey, deleteSSHKey } from '@/lib/api/account/ssh-keys';
import { disableTwoFactor, enableTwoFactor } from '@/lib/api/account/two-factor';
import updateEmail from '@/lib/api/account/update-email';
import updatePassword from '@/lib/api/account/update-password';
import {
  createServerBackup,
  deleteAllServerBackups,
  deleteServerBackup,
  renameServerBackup,
  restoreServerBackup,
  retryBackup,
} from '@/lib/api/server/backups';
import {
  createServerDatabase,
  deleteServerDatabase,
  rotateDatabasePassword,
} from '@/lib/api/server/databases';
import {
  chmodFiles,
  compressFiles,
  copyFile,
  createDirectory,
  decompressFiles,
  deleteFiles,
  renameFiles,
  saveFileContents,
} from '@/lib/api/server/files';
import {
  createServerAllocation,
  deleteServerAllocation,
  deleteSubdomain,
  setPrimaryServerAllocation,
  setServerAllocationNotes,
  setSubdomain,
} from '@/lib/api/server/network';
import { type PowerAction, sendPowerAction } from '@/lib/api/server/operations';
import {
  createOrUpdateSchedule,
  createOrUpdateScheduleTask,
  deleteSchedule,
  deleteScheduleTask,
  triggerScheduleExecution,
} from '@/lib/api/server/schedules';
import {
  reinstallServer,
  renameServer,
  revertDockerImage,
  setSelectedDockerImage,
} from '@/lib/api/server/settings';
import {
  updateStartupCommand,
  updateStartupVariable,
} from '@/lib/api/server/startup';
import { createOrUpdateSubuser, deleteSubuser } from '@/lib/api/server/users';
import { queryKeys } from '@/lib/queries/keys';

// --- Backup mutations ---

export const useCreateBackupMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { name?: string; ignored?: string; isLocked: boolean }) =>
      createServerBackup(serverId, params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.servers.backups(serverId) });
    },
  });
};

export const useDeleteBackupMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (backup: string) => deleteServerBackup(serverId, backup),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.servers.backups(serverId) });
    },
  });
};

export const useDeleteAllBackupsMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { password: string; twoFactor: boolean; totpCode?: string }) =>
      deleteAllServerBackups(serverId, params.password, params.twoFactor, params.totpCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.servers.backups(serverId) });
    },
  });
};

export const useRestoreBackupMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (backup: string) => restoreServerBackup(serverId, backup),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.servers.backups(serverId) });
    },
  });
};

export const useRenameBackupMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { backup: string; name: string }) =>
      renameServerBackup(serverId, params.backup, params.name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.servers.backups(serverId) });
    },
  });
};

export const useRetryBackupMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (backupUuid: string) => retryBackup(serverId, backupUuid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.servers.backups(serverId) });
    },
  });
};

// --- Database mutations ---

export const useCreateDatabaseMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { connectionsFrom: string; databaseName: string }) =>
      createServerDatabase(serverId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.servers.databases(serverId) });
    },
  });
};

export const useDeleteDatabaseMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (database: string) => deleteServerDatabase(serverId, database),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.servers.databases(serverId) });
    },
  });
};

export const useRotatePasswordMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (database: string) => rotateDatabasePassword(serverId, database),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.servers.databases(serverId) });
    },
  });
};

// --- File mutations ---

export const useDeleteFilesMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { directory: string; files: string[] }) =>
      deleteFiles(serverId, params.directory, params.files),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.servers.files(serverId, variables.directory),
      });
    },
  });
};

export const useRenameFilesMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      directory: string;
      files: { to: string; from: string }[];
    }) => renameFiles(serverId, params.directory, params.files),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.servers.files(serverId, variables.directory),
      });
    },
  });
};

export const useCompressFilesMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { directory: string; files: string[] }) =>
      compressFiles(serverId, params.directory, params.files),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.servers.files(serverId, variables.directory),
      });
    },
  });
};

export const useDecompressFilesMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { directory: string; file: string }) =>
      decompressFiles(serverId, params.directory, params.file),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.servers.files(serverId, variables.directory),
      });
    },
  });
};

export const useCopyFileMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (location: string) => copyFile(serverId, location),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.servers.all });
    },
  });
};

export const useChmodFilesMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      directory: string;
      files: { file: string; mode: string }[];
    }) => chmodFiles(serverId, params.directory, params.files),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.servers.files(serverId, variables.directory),
      });
    },
  });
};

export const useCreateDirectoryMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { root: string; name: string }) =>
      createDirectory(serverId, params.root, params.name),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.servers.files(serverId, variables.root),
      });
    },
  });
};

export const useSaveFileMutation = (serverId: string) => {
  return useMutation({
    mutationFn: (params: { file: string; content: string }) =>
      saveFileContents(serverId, params.file, params.content),
  });
};

// --- Schedule mutations ---

export const useCreateScheduleMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      schedule: Parameters<typeof createOrUpdateSchedule>[1],
    ) => createOrUpdateSchedule(serverId, schedule),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.servers.schedules(serverId) });
    },
  });
};

export const useDeleteScheduleMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scheduleId: number) => deleteSchedule(serverId, scheduleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.servers.schedules(serverId) });
    },
  });
};

export const useCreateScheduleTaskMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      scheduleId: number;
      taskId?: number;
      data: {
        action: string;
        payload: string;
        timeOffset: string | number;
        continueOnFailure: boolean;
      };
    }) =>
      createOrUpdateScheduleTask(
        serverId,
        params.scheduleId,
        params.taskId,
        params.data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.servers.schedules(serverId) });
    },
  });
};

export const useDeleteScheduleTaskMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { scheduleId: number; taskId: number }) =>
      deleteScheduleTask(serverId, params.scheduleId, params.taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.servers.schedules(serverId) });
    },
  });
};

export const useTriggerScheduleMutation = (serverId: string) => {
  return useMutation({
    mutationFn: (scheduleId: number) =>
      triggerScheduleExecution(serverId, scheduleId),
  });
};

// --- Power action mutation ---

export const usePowerActionMutation = (serverId: string) => {
  return useMutation({
    mutationFn: (action: PowerAction) => sendPowerAction(serverId, action),
  });
};

// --- Network mutations ---

export const useCreateAllocationMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => createServerAllocation(serverId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.servers.allocations(serverId),
      });
    },
  });
};

export const useDeleteAllocationMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteServerAllocation(serverId, id),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.servers.allocations(serverId),
      });
    },
  });
};

export const useSetPrimaryAllocationMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => setPrimaryServerAllocation(serverId, id),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.servers.allocations(serverId),
      });
    },
  });
};

export const useSetAllocationNotesMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: number; notes: string | null }) =>
      setServerAllocationNotes(serverId, params.id, params.notes),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.servers.allocations(serverId),
      });
    },
  });
};

export const useSetSubdomainMutation = (serverId: string) => {
  return useMutation({
    mutationFn: (params: { subdomain: string; domainId: number }) =>
      setSubdomain(serverId, params.subdomain, params.domainId),
  });
};

export const useDeleteSubdomainMutation = (serverId: string) => {
  return useMutation({
    mutationFn: () => deleteSubdomain(serverId),
  });
};

// --- Subuser mutations ---

export const useCreateSubuserMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { email: string; permissions: string[] }) =>
      createOrUpdateSubuser(serverId, params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.servers.subusers(serverId) });
    },
  });
};

export const useUpdateSubuserMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      email: string;
      permissions: string[];
      subuser: Parameters<typeof createOrUpdateSubuser>[2];
    }) => createOrUpdateSubuser(serverId, params, params.subuser),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.servers.subusers(serverId) });
    },
  });
};

export const useDeleteSubuserMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => deleteSubuser(serverId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.servers.subusers(serverId) });
    },
  });
};

// --- Startup mutations ---

export const useUpdateStartupVariableMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { key: string; value: string }) =>
      updateStartupVariable(serverId, params.key, params.value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.servers.startup(serverId) });
    },
  });
};

export const useUpdateStartupCommandMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (startup: string) => updateStartupCommand(serverId, startup),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.servers.startup(serverId) });
    },
  });
};

// --- Settings mutations ---

export const useRenameServerMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { name: string; description?: string }) =>
      renameServer(serverId, params.name, params.description),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.servers.detail(serverId) });
    },
  });
};

export const useReinstallServerMutation = (serverId: string) => {
  return useMutation({
    mutationFn: () => reinstallServer(serverId),
  });
};

export const useRevertDockerImageMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => revertDockerImage(serverId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.servers.detail(serverId) });
    },
  });
};

export const useSetDockerImageMutation = (serverId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (image: string) => setSelectedDockerImage(serverId, image),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.servers.detail(serverId) });
    },
  });
};

// --- Account mutations ---

export const useUpdateEmailMutation = () => {
  return useMutation({
    mutationFn: (params: { email: string; password: string }) =>
      updateEmail(params.email, params.password),
  });
};

export const useUpdatePasswordMutation = () => {
  return useMutation({
    mutationFn: (params: {
      current: string;
      password: string;
      confirmPassword: string;
    }) => updatePassword(params),
  });
};

export const useCreateApiKeyMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { description: string; allowedIps: string }) =>
      createApiKey(params.description, params.allowedIps),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.account.apiKeys() });
    },
  });
};

export const useDeleteApiKeyMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (identifier: string) => deleteApiKey(identifier),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.account.apiKeys() });
    },
  });
};

export const useCreateSSHKeyMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { name: string; publicKey: string }) =>
      createSSHKey(params.name, params.publicKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.account.sshKeys() });
    },
  });
};

export const useDeleteSSHKeyMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fingerprint: string) => deleteSSHKey(fingerprint),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.account.sshKeys() });
    },
  });
};

export const useEnableTwoFactorMutation = () => {
  return useMutation({
    mutationFn: (params: { code: string; password: string }) =>
      enableTwoFactor(params.code, params.password),
  });
};

export const useDisableTwoFactorMutation = () => {
  return useMutation({
    mutationFn: (password: string) => disableTwoFactor(password),
  });
};
