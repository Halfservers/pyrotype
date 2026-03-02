export interface WingsServerDetails {
  settings: {
    uuid: string;
    meta: {
      name: string;
      description: string;
    };
    suspended: boolean;
    environment: Record<string, string>;
    invocation: string;
    skip_egg_scripts: boolean;
    build: {
      memory_limit: number;
      swap: number;
      io_weight: number;
      cpu_limit: number;
      threads: string | null;
      disk_space: number;
      oom_disabled: boolean;
    };
    container: {
      image: string;
      oom_disabled: boolean;
      requires_rebuild: boolean;
    };
    allocations: {
      force_outgoing_ip: boolean;
      default: {
        ip: string;
        port: number;
      };
      mappings: Record<string, number[]>;
    };
    mounts: Array<{
      source: string;
      target: string;
      read_only: boolean;
    }>;
    egg: {
      id: string;
      file_denylist: string[];
    };
  };
  process_configuration: {
    startup: {
      done: string[];
      user_interaction: string[];
      strip_ansi: boolean;
    };
    stop: {
      type: string;
      value: string;
    };
    configs: Array<{
      parser: string;
      file: string;
      replace: Array<{
        match: string;
        replace_with: string;
      }>;
    }>;
  };
}

export interface WingsWebsocketAuth {
  token: string;
  socket: string;
}

export interface WingsResourceUsage {
  memory_bytes: number;
  memory_limit_bytes: number;
  cpu_absolute: number;
  network: {
    rx_bytes: number;
    tx_bytes: number;
  };
  uptime: number;
  state: string;
  disk_bytes: number;
}

export interface WingsFileObject {
  name: string;
  created: string;
  modified: string;
  mode: string;
  mode_bits: string;
  size: number;
  is_file: boolean;
  is_symlink: boolean;
  mimetype: string;
}

export interface WingsBackupRequest {
  adapter: string;
  uuid: string;
  ignore: string;
}

export interface WingsInstallStatus {
  successful: boolean;
}

export type PowerSignal = 'start' | 'stop' | 'restart' | 'kill';

export type SocketEvent =
  | 'auth success'
  | 'auth error'
  | 'status'
  | 'console output'
  | 'stats'
  | 'install output'
  | 'install started'
  | 'install completed'
  | 'transfer logs'
  | 'transfer status'
  | 'backup completed'
  | 'backup restore completed'
  | 'daemon error'
  | 'daemon message'
  | 'token expiring'
  | 'token expired';

export type SocketRequest = 'auth' | 'set state' | 'send command' | 'send logs' | 'send stats';
