import { createContext, useContext } from 'react';
import isEqual from 'react-fast-compare';
import { createStore, useStore } from 'zustand';

import type { Websocket } from '@/lib/websocket/WebSocketManager.ts';

// TODO: import from @/types when available
export type ServerStatus = 'offline' | 'starting' | 'stopping' | 'running' | null;

export interface ServerAllocation {
  id: number;
  ip: string;
  alias: string | null;
  port: number;
  isDefault: boolean;
}

export interface ServerEggVariable {
  name: string;
  description: string;
  envVariable: string;
  defaultValue: string;
  serverValue: string;
  isEditable: boolean;
  rules: string;
}

export interface Server {
  id: string;
  internalId: number | string;
  uuid: string;
  name: string;
  node: string;
  isNodeUnderMaintenance: boolean;
  status: string | null;
  sftpDetails: { ip: string; port: number };
  invocation: string;
  dockerImage: string;
  description: string;
  limits: {
    memory: number;
    swap: number;
    disk: number;
    io: number;
    cpu: number;
    threads: string | null;
  };
  eggFeatures: string[];
  featureLimits: {
    databases: number;
    allocations: number;
    backups: number;
  };
  isTransferring: boolean;
  variables: ServerEggVariable[];
  allocations: ServerAllocation[];
  egg: string;
  daemonType: string;
}

export interface ServerDatabase {
  id: string;
  name: string;
  username: string;
  connectionString: string;
  allowConnectionsFrom: string;
  password?: string;
  maxConnections: number;
}

export interface Subuser {
  uuid: string;
  username: string;
  email: string;
  image: string;
  twoFactorEnabled: boolean;
  createdAt: Date;
  permissions: string[];
}

export interface ScheduleTask {
  id: number;
  sequenceId: number;
  action: string;
  payload: string;
  timeOffset: number;
  isQueued: boolean;
  continueOnFailure: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Schedule {
  id: number;
  name: string;
  isActive: boolean;
  isProcessing: boolean;
  onlyWhenOnline: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  cron: {
    dayOfWeek: string;
    month: string;
    dayOfMonth: string;
    hour: string;
    minute: string;
  };
  tasks: ScheduleTask[];
}

export interface FileUploadData {
  loaded: number;
  readonly abort: AbortController;
  readonly total: number;
}

export interface ServerState {
  // Server data
  server: Server | undefined;
  serverPermissions: string[];
  status: ServerStatus;

  // Socket
  socketInstance: Websocket | null;
  socketConnected: boolean;

  // Databases
  databases: ServerDatabase[];

  // Files
  fileDirectory: string;
  selectedFiles: string[];
  uploads: Record<string, FileUploadData>;

  // Subusers
  subusers: Subuser[];

  // Schedules
  schedules: Schedule[];

  // Server actions
  setServer: (server: Server) => void;
  setServerFromState: (fn: (server: Server) => Server) => void;
  setPermissions: (permissions: string[]) => void;
  setStatus: (status: ServerStatus) => void;

  // Socket actions
  setSocket: (socket: Websocket | null) => void;
  setSocketConnected: (connected: boolean) => void;

  // Database actions
  setDatabases: (databases: ServerDatabase[]) => void;
  appendDatabase: (database: ServerDatabase) => void;
  removeDatabase: (id: string) => void;

  // File actions
  setFileDirectory: (directory: string) => void;
  setSelectedFiles: (files: string[]) => void;
  appendSelectedFile: (file: string) => void;
  removeSelectedFile: (file: string) => void;
  pushFileUpload: (name: string, data: FileUploadData) => void;
  setUploadProgress: (name: string, loaded: number) => void;
  removeFileUpload: (name: string) => void;
  cancelFileUpload: (name: string) => void;
  clearFileUploads: () => void;

  // Subuser actions
  setSubusers: (subusers: Subuser[]) => void;
  appendSubuser: (subuser: Subuser) => void;
  removeSubuser: (uuid: string) => void;

  // Schedule actions
  setSchedules: (schedules: Schedule[]) => void;
  appendSchedule: (schedule: Schedule) => void;
  removeSchedule: (id: number) => void;

  // Clear
  clearServerState: () => void;
}

function cleanDirectoryPath(path: string): string {
  return path.replace(/(\/(\/*))|(^$)/g, '/');
}

const initialState = {
  server: undefined,
  serverPermissions: [],
  status: null as ServerStatus,
  socketInstance: null as Websocket | null,
  socketConnected: false,
  databases: [] as ServerDatabase[],
  fileDirectory: '/',
  selectedFiles: [] as string[],
  uploads: {} as Record<string, FileUploadData>,
  subusers: [] as Subuser[],
  schedules: [] as Schedule[],
};

export const createServerStore = () =>
  createStore<ServerState>((set, get) => ({
    ...initialState,

    // Server actions
    setServer: (server) => {
      const current = get().server;
      if (!isEqual(server, current)) {
        set({ server });
      }
    },

    setServerFromState: (fn) => {
      const current = get().server;
      if (!current) return;
      const output = fn(current);
      if (!isEqual(output, current)) {
        set({ server: output });
      }
    },

    setPermissions: (permissions) => {
      if (!isEqual(permissions, get().serverPermissions)) {
        set({ serverPermissions: permissions });
      }
    },

    setStatus: (status) => set({ status }),

    // Socket actions
    setSocket: (socket) => set({ socketInstance: socket }),
    setSocketConnected: (connected) => set({ socketConnected: connected }),

    // Database actions
    setDatabases: (databases) => set({ databases }),

    appendDatabase: (database) =>
      set((state) => {
        const exists = state.databases.find((d) => d.id === database.id);
        if (exists) {
          return { databases: state.databases.map((d) => (d.id === database.id ? database : d)) };
        }
        return { databases: [...state.databases, database] };
      }),

    removeDatabase: (id) =>
      set((state) => ({
        databases: state.databases.filter((d) => d.id !== id),
      })),

    // File actions
    setFileDirectory: (directory) => set({ fileDirectory: cleanDirectoryPath(directory) }),

    setSelectedFiles: (files) => set({ selectedFiles: files }),

    appendSelectedFile: (file) =>
      set((state) => ({
        selectedFiles: state.selectedFiles.filter((f) => f !== file).concat(file),
      })),

    removeSelectedFile: (file) =>
      set((state) => ({
        selectedFiles: state.selectedFiles.filter((f) => f !== file),
      })),

    pushFileUpload: (name, data) =>
      set((state) => ({
        uploads: { ...state.uploads, [name]: data },
      })),

    setUploadProgress: (name, loaded) =>
      set((state) => {
        const upload = state.uploads[name];
        if (!upload) return state;
        return {
          uploads: { ...state.uploads, [name]: { ...upload, loaded } },
        };
      }),

    removeFileUpload: (name) =>
      set((state) => {
        const { [name]: _, ...rest } = state.uploads;
        return { uploads: rest };
      }),

    cancelFileUpload: (name) =>
      set((state) => {
        const upload = state.uploads[name];
        if (!upload) return state;
        upload.abort.abort();
        const { [name]: _, ...rest } = state.uploads;
        return { uploads: rest };
      }),

    clearFileUploads: () =>
      set((state) => {
        Object.values(state.uploads).forEach((upload) => upload.abort.abort());
        return { uploads: {} };
      }),

    // Subuser actions
    setSubusers: (subusers) => set({ subusers }),

    appendSubuser: (subuser) =>
      set((state) => {
        let matched = false;
        const updated = state.subusers.map((u) => {
          if (u.uuid === subuser.uuid) {
            matched = true;
            return subuser;
          }
          return u;
        });
        return { subusers: matched ? updated : [...updated, subuser] };
      }),

    removeSubuser: (uuid) =>
      set((state) => ({
        subusers: state.subusers.filter((u) => u.uuid !== uuid),
      })),

    // Schedule actions
    setSchedules: (schedules) => set({ schedules }),

    appendSchedule: (schedule) =>
      set((state) => {
        const exists = state.schedules.find((s) => s.id === schedule.id);
        if (exists) {
          return { schedules: state.schedules.map((s) => (s.id === schedule.id ? schedule : s)) };
        }
        return { schedules: [...state.schedules, schedule] };
      }),

    removeSchedule: (id) =>
      set((state) => ({
        schedules: state.schedules.filter((s) => s.id !== id),
      })),

    // Clear
    clearServerState: () => {
      const state = get();
      if (state.socketInstance) {
        state.socketInstance.removeAllListeners();
        state.socketInstance.close();
      }
      set({ ...initialState });
    },
  }));

export type ServerStore = ReturnType<typeof createServerStore>;

export const ServerStoreContext = createContext<ServerStore | null>(null);

export function useServerStore<T>(selector: (state: ServerState) => T): T {
  const store = useContext(ServerStoreContext);
  if (!store) throw new Error('useServerStore must be used within ServerStoreProvider');
  return useStore(store, selector);
}
