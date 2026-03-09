import type { PrismaClient } from '@/generated/prisma'
import { daemonRequest } from '../daemon/proxy'
import { logger } from '../../config/logger'

interface NodeLike {
  fqdn: string
  internalFqdn?: string | null
  scheme: string
  daemonListen: number
  daemonTokenId: string
  daemonToken: string
  useSeparateFqdns?: boolean
}

/**
 * Delete a backup from the daemon (Wings/Elytra).
 * Swallows 404 errors (backup already gone on the daemon).
 */
export async function deleteBackupFromDaemon(
  node: NodeLike,
  serverUuid: string,
  backupUuid: string,
): Promise<void> {
  try {
    await daemonRequest(node, 'DELETE', `/api/servers/${serverUuid}/backup/${backupUuid}`)
  } catch (err: any) {
    if (err?.message?.includes('404')) return
    logger.warn('Failed to delete backup from daemon', {
      serverUuid,
      backupUuid,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

/**
 * Rotate (delete) the oldest unlocked successful backup to make room.
 * Matches Pyrodactyl's InitiateBackupService rotation behavior.
 * Throws if no unlocked backup exists to rotate.
 */
export async function rotateOldestBackup(
  prisma: PrismaClient,
  serverId: number,
  node: NodeLike,
  serverUuid: string,
): Promise<void> {
  const oldest = await prisma.backup.findFirst({
    where: {
      serverId,
      isLocked: false,
      isSuccessful: true,
      deletedAt: null,
    },
    orderBy: { createdAt: 'asc' },
  })

  if (!oldest) {
    throw new Error('TooManyBackups')
  }

  await deleteBackupFromDaemon(node, serverUuid, oldest.uuid)
  await prisma.backup.delete({ where: { id: oldest.id } })
}
