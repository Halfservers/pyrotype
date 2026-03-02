import type { ServerState } from '@/store/server.ts';

export const selectInConflictState = (state: ServerState): boolean =>
  state.server ? state.server.status !== null || state.server.isTransferring : false;

export const selectIsInstalling = (state: ServerState): boolean =>
  state.server?.status === 'installing' || state.server?.status === 'install_failed';

export const selectServer = (state: ServerState) => state.server;

export const selectServerStatus = (state: ServerState) => state.status;

export const selectDatabases = (state: ServerState) => state.databases;

export const selectSubusers = (state: ServerState) => state.subusers;

export const selectSchedules = (state: ServerState) => state.schedules;

export const selectFileDirectory = (state: ServerState) => state.fileDirectory;

export const selectSelectedFiles = (state: ServerState) => state.selectedFiles;

export const selectSocketConnected = (state: ServerState) => state.socketConnected;
