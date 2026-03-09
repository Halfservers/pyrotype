import type { PrismaClient } from '@prisma/client'
import { daemonRequest, DaemonConnectionError } from '../services/daemon/proxy'
import { logActivity } from '../services/activity'
import { generateUuid } from '../utils/crypto'

export async function processBackupJob(
  data: { serverId: number; backupId?: number },
  prisma: PrismaClient,
): Promise<void> {
  const server = await prisma.server.findUnique({
    where: { id: data.serverId },
    include: { node: true },
  })

  if (!server || !(server as any).node) {
    return // Server or node deleted
  }

  const node = (server as any).node

  let backup: any = null
  if (data.backupId) {
    backup = await prisma.backup.findUnique({ where: { id: data.backupId } })
  }

  if (!backup) {
    // Create a new backup record (for scheduled / ad-hoc job-initiated backups)
    backup = await prisma.backup.create({
      data: {
        serverId: server.id,
        uuid: generateUuid(),
        name: `Auto Backup - ${new Date().toISOString()}`,
        ignoredFiles: [],
        disk: 'wings',
        bytes: BigInt(0),
      },
    })
  }

  try {
    // Instruct the daemon to start the backup; it will call back via remote endpoint
    await daemonRequest(node, 'POST', `/api/servers/${server.uuid}/backup`, {
      adapter: backup.disk ?? 'wings',
      uuid: backup.uuid,
      ignored_files: backup.ignoredFiles ?? [],
    })

    await logActivity(prisma, {
      event: 'server:backup.started',
      ip: '127.0.0.1',
      serverId: server.id,
      properties: { backup_uuid: backup.uuid },
    })
  } catch (error) {
    // Mark the backup as failed so cleanup can collect it later
    await prisma.backup.update({
      where: { id: backup.id },
      data: {
        isSuccessful: false,
        completedAt: new Date(),
      },
    })

    if (error instanceof DaemonConnectionError) {
      // Daemon unreachable — silently abort rather than retrying immediately
      return
    }
    throw error
  }
}
