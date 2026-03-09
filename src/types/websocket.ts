// Wings/Elytra WebSocket event types

export type PowerState = 'offline' | 'starting' | 'running' | 'stopping'

export type PowerAction = 'start' | 'stop' | 'restart' | 'kill'

export interface ServerStats {
  memory_bytes: number
  memory_limit_bytes: number
  cpu_absolute: number
  network: {
    rx_bytes: number
    tx_bytes: number
  }
  disk_bytes: number
  uptime: number
  state: PowerState
  is_suspended: boolean
}

// Inbound events (from Wings/Elytra → client)
export type InboundWebSocketEvent =
  | 'auth success'
  | 'status'
  | 'console output'
  | 'stats'
  | 'token expiring'
  | 'token expired'
  | 'install output'
  | 'install completed'
  | 'transfer logs'
  | 'transfer status'
  | 'backup restore completed'

// Outbound events (client → Wings/Elytra)
export type OutboundWebSocketEvent =
  | 'auth'
  | 'set state'
  | 'send command'
  | 'send logs'
  | 'send stats'

export type TransferStatus =
  | 'pending'
  | 'processing'
  | 'failed'
  | 'successful'
  | 'cancelled'

export interface WebSocketMessage {
  event: string
  args?: string[]
}

export interface WebSocketCredentials {
  token: string
  socket: string
}
