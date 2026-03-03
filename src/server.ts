import startHandler from '@tanstack/react-start/server-entry'
import { createApp } from '../server/src/app'
import type { Env } from '../server/src/types/env'
import type { JobPayload } from '../server/src/config/queue'

// Re-export Durable Object class (required by wrangler for DO bindings)
export { ServerConsole } from '../server/src/durable-objects/ServerConsole'

const honoApp = createApp()

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    // Route /api/* to Hono backend
    if (url.pathname.startsWith('/api/')) {
      return honoApp.fetch(request, env, ctx)
    }

    // Everything else → TanStack Start SSR
    return startHandler.fetch(request, env, ctx)
  },

  async queue(batch: MessageBatch<JobPayload>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      try {
        console.log(`Processing job: ${msg.body.type}`)
        msg.ack()
      } catch {
        msg.retry()
      }
    }
  },
}
