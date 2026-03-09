import { createApp } from './app'
import type { Env } from './types/env'
import { handleQueueBatch, type JobMessage } from './jobs'
import { processScheduleDispatch } from './services/schedules'
import { createPrisma } from './config/database'

// Re-export Durable Object class (required by wrangler for DO bindings)
export { ServerConsole } from './durable-objects/ServerConsole'

const app = createApp()

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx)
  },

  async queue(batch: MessageBatch<JobMessage>, env: Env): Promise<void> {
    const prisma = createPrisma(env.DB)
    await handleQueueBatch(batch, env, prisma)
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const prisma = createPrisma(env.DB)
    ctx.waitUntil(processScheduleDispatch(prisma, env.JOB_QUEUE))
  },
}
