export { queryKeys } from '@/lib/queries/keys';

export {
  useServerListQuery,
  useServerBackupsQuery,
  useServerStartupQuery,
  useServerAllocationsQuery,
  useFileManagerQuery,
  useServerActivityQuery,
  useAccountActivityQuery,
  useSSHKeysQuery,
  useServerSchedulesQuery,
  useServerSubusersQuery,
  useServerDatabasesQuery,
} from '@/lib/queries/hooks';

export {
  // Backup mutations
  useCreateBackupMutation,
  useDeleteBackupMutation,
  useDeleteAllBackupsMutation,
  useRestoreBackupMutation,
  useRenameBackupMutation,
  useRetryBackupMutation,
  // Database mutations
  useCreateDatabaseMutation,
  useDeleteDatabaseMutation,
  useRotatePasswordMutation,
  // File mutations
  useDeleteFilesMutation,
  useRenameFilesMutation,
  useCompressFilesMutation,
  useDecompressFilesMutation,
  useCopyFileMutation,
  useChmodFilesMutation,
  useCreateDirectoryMutation,
  useSaveFileMutation,
  // Schedule mutations
  useCreateScheduleMutation,
  useDeleteScheduleMutation,
  useCreateScheduleTaskMutation,
  useDeleteScheduleTaskMutation,
  useTriggerScheduleMutation,
  // Power action
  usePowerActionMutation,
  // Network mutations
  useCreateAllocationMutation,
  useDeleteAllocationMutation,
  useSetPrimaryAllocationMutation,
  useSetAllocationNotesMutation,
  useSetSubdomainMutation,
  useDeleteSubdomainMutation,
  // Subuser mutations
  useCreateSubuserMutation,
  useUpdateSubuserMutation,
  useDeleteSubuserMutation,
  // Startup mutations
  useUpdateStartupVariableMutation,
  useUpdateStartupCommandMutation,
  // Settings mutations
  useRenameServerMutation,
  useReinstallServerMutation,
  useRevertDockerImageMutation,
  useSetDockerImageMutation,
  // Account mutations
  useUpdateEmailMutation,
  useUpdatePasswordMutation,
  useCreateApiKeyMutation,
  useDeleteApiKeyMutation,
  useCreateSSHKeyMutation,
  useDeleteSSHKeyMutation,
  useEnableTwoFactorMutation,
  useDisableTwoFactorMutation,
} from '@/lib/queries/mutations';
