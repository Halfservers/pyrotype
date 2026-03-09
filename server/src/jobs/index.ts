import type { Env } from '../types/env'
import type { PrismaClient } from '@/generated/prisma'
import { processBackupJob } from './backupJob'
import { processCleanupJob } from './cleanupJob'
import { processScheduleJob } from './scheduleRunner'
import { logger } from '../config/logger'

export interface JobMessage {
  type: 'backup' | 'cleanup' | 'schedule'
  data: Record<string, unknown>
}

/**
 * Cloudflare Queue consumer handler.
 * Attach this to your worker's queue() export.
 */
export async function handleQueueBatch(
  batch: MessageBatch<JobMessage>,
  env: Env,
  prisma: PrismaClient,
): Promise<void> {
  for (const message of batch.messages) {
    try {
      const { type, data } = message.body

      switch (type) {
        case 'backup':
          await processBackupJob(data as { serverId: number; backupId?: number }, prisma)
          break
        case 'cleanup':
          await processCleanupJob(data as { type: string }, prisma)
          break
        case 'schedule':
          await processScheduleJob(data as { scheduleId: number; taskId?: number }, prisma, env.JOB_QUEUE)
          break
        default:
          logger.warn(`Unknown job type: ${type}`)
      }

      message.ack()
    } catch (err) {
      logger.error(`Job failed: ${message.body.type}`, {
        error: err instanceof Error ? err.message : String(err),
      })
      message.retry()
    }
  }
}

/**
 * Enqueue a job onto the Cloudflare Queue.
 */
export async function enqueueJob(queue: Queue, job: JobMessage): Promise<void> {
  await queue.send(job)
}
