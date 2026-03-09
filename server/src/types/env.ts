export interface Env {
  DB: D1Database
  SESSION_KV: KVNamespace
  JOB_QUEUE: Queue
  SERVER_CONSOLE: DurableObjectNamespace
  APP_KEY: string
  APP_URL?: string
  NODE_ENV: string
  APP_VERSION?: string
}

export interface SessionData {
  userId: number
  twoFactorVerified?: boolean
  pendingUserId?: number
  authConfirmationToken?: {
    userId: number
    tokenValue: string
    expiresAt: number
  }
}

export interface HonoVariables {
  prisma: import('../generated/prisma').PrismaClient
  kv: KVNamespace
  queue: Queue
  user?: import('../generated/prisma').User & { rootAdmin: boolean }
  server?: import('../generated/prisma').Server & { node?: import('../generated/prisma').Node; allocation?: import('../generated/prisma').Allocation; egg?: import('../generated/prisma').Egg }
  serverPermissions?: string[]
  node?: import('../generated/prisma').Node
  apiKey?: import('../generated/prisma').ApiKey
  session?: SessionData | null
  sessionId?: string
}
