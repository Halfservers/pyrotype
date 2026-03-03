export interface JobPayload {
  type: string
  data: Record<string, unknown>
}

export async function enqueueJob(queue: Queue, type: string, data: Record<string, unknown>): Promise<void> {
  await queue.send({ type, data } satisfies JobPayload)
}
