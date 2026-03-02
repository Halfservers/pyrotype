export type {
  WingsServerDetails,
  WingsWebsocketAuth,
  WingsResourceUsage,
  WingsFileObject,
  WingsBackupRequest,
  WingsInstallStatus,
  PowerSignal,
  SocketEvent,
  SocketRequest,
} from '../services/wings/types';

export interface WingsServerState {
  state: 'running' | 'starting' | 'stopping' | 'offline';
  isSuspended: boolean;
  utilization: {
    memoryBytes: number;
    cpuAbsolute: number;
    diskBytes: number;
    networkRxBytes: number;
    networkTxBytes: number;
    uptime: number;
  };
}
