import type { PrismaClient } from '@/generated/prisma'

interface ActivityEntry {
  event: string
  ip: string
  userId?: number
  serverId?: number
  apiKeyId?: number
  properties?: Record<string, unknown>
  description?: string
}

export async function logActivity(
  prisma: PrismaClient,
  entry: ActivityEntry,
): Promise<void> {
  const log = await prisma.activityLog.create({
    data: {
      batch: crypto.randomUUID(),
      event: entry.event,
      ip: entry.ip,
      description: entry.description ?? null,
      properties: entry.properties ? JSON.stringify(entry.properties) : '{}',
      actorType: entry.userId ? 'user' : entry.apiKeyId ? 'api_key' : null,
      actorId: entry.userId ?? entry.apiKeyId ?? null,
      timestamp: new Date(),
    },
  })

  const subjects: Array<{ activityLogId: bigint; subjectType: string; subjectId: bigint }> = []

  if (entry.userId) {
    subjects.push({ activityLogId: log.id, subjectType: 'user', subjectId: BigInt(entry.userId) })
  }

  if (entry.serverId) {
    subjects.push({ activityLogId: log.id, subjectType: 'server', subjectId: BigInt(entry.serverId) })
  }

  if (subjects.length > 0) {
    await prisma.activityLogSubject.createMany({ data: subjects })
  }
}

export async function logActivities(
  prisma: PrismaClient,
  entries: ActivityEntry[],
): Promise<void> {
  for (const entry of entries) {
    await logActivity(prisma, entry)
  }
}
