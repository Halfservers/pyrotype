import { createApp } from './app'
import type { Env } from './types/env'
import type { JobPayload } from './config/queue'

const app = createApp()

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx)
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
