import type { PrismaClient } from '../generated/prisma'

export async function processCleanupJob(
  data: { type: string },
  prisma: PrismaClient,
): Promise<void> {
  const cleanupType = data.type || 'all'

  if (cleanupType === 'activity_logs' || cleanupType === 'all') {
    await cleanupActivityLogs(prisma)
  }

  if (cleanupType === 'failed_backups' || cleanupType === 'all') {
    await cleanupFailedBackups(prisma)
  }

  if (cleanupType === 'stale_transfers' || cleanupType === 'all') {
    await cleanupStaleTransfers(prisma)
  }

  if (cleanupType === 'stale_tasks' || cleanupType === 'all') {
    await cleanupStaleTasks(prisma)
  }
}

async function cleanupActivityLogs(prisma: PrismaClient): Promise<void> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)

  // Process in batches of 1000 to avoid long-running transactions
  const oldLogs = await prisma.activityLog.findMany({
    where: { timestamp: { lt: cutoff } },
    select: { id: true },
    take: 1000,
  })

  if (oldLogs.length > 0) {
    const logIds = oldLogs.map((l) => l.id)

    // Delete subjects first to satisfy the foreign key constraint
    await prisma.activityLogSubject.deleteMany({
      where: { activityLogId: { in: logIds } },
    })

    await prisma.activityLog.deleteMany({
      where: { id: { in: logIds } },
    })
  }
}

async function cleanupFailedBackups(prisma: PrismaClient): Promise<void> {
  const pendingCutoff = new Date()
  pendingCutoff.setHours(pendingCutoff.getHours() - 24)

  // Backups that were never reported back by the daemon after 24 hours
  await prisma.backup.deleteMany({
    where: {
      isSuccessful: false,
      completedAt: null,
      createdAt: { lt: pendingCutoff },
    },
  })

  // Hard-delete soft-deleted backups older than 30 days
  const softDeleteCutoff = new Date()
  softDeleteCutoff.setDate(softDeleteCutoff.getDate() - 30)

  await prisma.backup.deleteMany({
    where: {
      deletedAt: { not: null, lt: softDeleteCutoff },
    },
  })
}

async function cleanupStaleTransfers(prisma: PrismaClient): Promise<void> {
  const cutoff = new Date()
  cutoff.setHours(cutoff.getHours() - 24)

  // Archive transfers that have been pending (no outcome) for over 24 hours
  await prisma.serverTransfer.updateMany({
    where: {
      successful: null,
      archived: false,
      createdAt: { lt: cutoff },
    },
    data: { archived: true },
  })
}

async function cleanupStaleTasks(prisma: PrismaClient): Promise<void> {
  const cutoff = new Date()
  cutoff.setHours(cutoff.getHours() - 1)

  // Reset tasks that have been stuck in the processing state for over 1 hour
  await prisma.task.updateMany({
    where: {
      isProcessing: true,
      updatedAt: { lt: cutoff },
    },
    data: { isProcessing: false },
  })

  // Reset schedules stuck in the processing state for over 1 hour
  await prisma.schedule.updateMany({
    where: {
      isProcessing: true,
      updatedAt: { lt: cutoff },
    },
    data: { isProcessing: false },
  })
}
