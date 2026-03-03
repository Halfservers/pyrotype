export const GAME_FEATURES = {
  EULA: 'eula',
  JAVA_VERSION: 'java_version',
  PID_LIMIT: 'pid_limit',
  STEAM_DISK_SPACE: 'steam_disk_space',
  GSL_TOKEN: 'gsl_token',
} as const;

export type GameFeatureKey = (typeof GAME_FEATURES)[keyof typeof GAME_FEATURES];

export interface GameFeatureComponentProps {
  serverId: string;
}

export interface EulaStatus {
  accepted: boolean;
}

export interface JavaVersion {
  id: string;
  name: string;
  image: string;
}

export interface PidLimitInfo {
  currentLimit: number;
  maxLimit: number;
}

export interface DiskSpaceInfo {
  used: number;
  total: number;
}

export interface GslTokenInfo {
  token: string;
}
