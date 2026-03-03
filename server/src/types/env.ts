export interface Env {
  DB: D1Database
  SESSION_KV: KVNamespace
  JOB_QUEUE: Queue
  SERVER_CONSOLE: DurableObjectNamespace
  APP_KEY: string
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
  prisma: import('../generated/prisma/client').PrismaClient
  kv: KVNamespace
  queue: Queue
  user?: import('../generated/prisma/client').User & { rootAdmin: boolean }
  server?: import('../generated/prisma/client').Server & { node?: import('../generated/prisma/client').Node; allocation?: import('../generated/prisma/client').Allocation; egg?: import('../generated/prisma/client').Egg }
  serverPermissions?: string[]
  node?: import('../generated/prisma/client').Node
  apiKey?: import('../generated/prisma/client').ApiKey
  session?: SessionData | null
  sessionId?: string
}
