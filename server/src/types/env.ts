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
  prisma: import('@prisma/client').PrismaClient
  kv: KVNamespace
  queue: Queue
  user?: import('@prisma/client').User & { rootAdmin: boolean }
  server?: import('@prisma/client').Server & { node?: import('@prisma/client').Node; allocation?: import('@prisma/client').Allocation; egg?: import('@prisma/client').Egg }
  serverPermissions?: string[]
  node?: import('@prisma/client').Node
  apiKey?: import('@prisma/client').ApiKey
  session?: SessionData | null
  sessionId?: string
}
