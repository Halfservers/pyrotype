import type { PrismaClient } from '../generated/prisma'
import { daemonRequest } from '../services/daemon/proxy'
import { generateUuid } from '../utils/crypto'
import { rotateOldestBackup } from '../services/backups'

interface ScheduleJobData {
  scheduleId: number
  taskId?: number
}

export async function processScheduleJob(
  data: ScheduleJobData,
  prisma: PrismaClient,
  queue?: any,
): Promise<void> {
  const schedule = await prisma.schedule.findUnique({
    where: { id: data.scheduleId },
    include: {
      server: { include: { node: true } },
      tasks: { orderBy: { sequenceId: 'asc' } },
    },
  })

  if (!schedule || !schedule.server) {
    return
  }

  const server = schedule.server
  const node = (server as any).node

  // Find the task to execute
  let task
  if (data.taskId) {
    task = schedule.tasks.find((t) => t.id === data.taskId)
  } else {
    task = schedule.tasks[0]
  }

  if (!task) {
    // No more tasks — mark schedule complete
    await markScheduleComplete(prisma, schedule.id)
    return
  }

  try {
    await prisma.task.update({
      where: { id: task.id },
      data: { isProcessing: true },
    })

    switch (task.action) {
      case 'power':
        await daemonRequest(node, 'POST', `/api/servers/${server.uuid}/power`, {
          action: task.payload,
        })
        break

      case 'command':
        await daemonRequest(node, 'POST', `/api/servers/${server.uuid}/command`, {
          command: task.payload,
        })
        break

      case 'backup': {
        const backupCount = await prisma.backup.count({
          where: { serverId: server.id, isSuccessful: true, deletedAt: null },
        })

        const backupLimit = server.backupLimit ?? 0
        if (backupLimit > 0 && backupCount >= backupLimit) {
          await rotateOldestBackup(prisma, server.id, node, server.uuid)
        }

        const backup = await prisma.backup.create({
          data: {
            serverId: server.id,
            uuid: generateUuid(),
            name: `Scheduled Backup - ${new Date().toISOString()}`,
            disk: 'wings',
            bytes: BigInt(0),
            ignoredFiles: [],
          },
        })

        await daemonRequest(node, 'POST', `/api/servers/${server.uuid}/backup`, {
          adapter: 'wings',
          uuid: backup.uuid,
          ignored_files: [],
        })
        break
      }
    }

    await prisma.task.update({
      where: { id: task.id },
      data: { isProcessing: false },
    })

    const currentIndex = schedule.tasks.findIndex((t) => t.id === task!.id)
    const nextTask = schedule.tasks[currentIndex + 1]

    if (nextTask) {
      if (queue && nextTask.timeOffset > 0) {
        await queue.send(
          { type: 'schedule', data: { scheduleId: schedule.id, taskId: nextTask.id } },
          { delaySeconds: nextTask.timeOffset },
        )
      } else {
        await processScheduleJob(
          { scheduleId: schedule.id, taskId: nextTask.id },
          prisma,
          queue,
        )
      }
    } else {
      await markScheduleComplete(prisma, schedule.id)
    }
  } catch (error) {
    await prisma.task
      .update({
        where: { id: task.id },
        data: { isProcessing: false },
      })
      .catch(() => {})

    const currentIndex = schedule.tasks.findIndex((t) => t.id === task!.id)
    const nextTask = schedule.tasks[currentIndex + 1]

    if (task.continueOnFailure) {
      if (nextTask) {
        await processScheduleJob(
          { scheduleId: schedule.id, taskId: nextTask.id },
          prisma,
          queue,
        )
      } else {
        await markScheduleComplete(prisma, schedule.id)
      }
    } else {
      await markScheduleComplete(prisma, schedule.id)
      throw error
    }
  }
}

async function markScheduleComplete(prisma: PrismaClient, scheduleId: number): Promise<void> {
  const schedule = await prisma.schedule.findUnique({ where: { id: scheduleId } })
  if (!schedule) return

  const { getNextCronDate } = await import('../services/schedules')
  const nextRunAt = getNextCronDate(
    schedule.cronMinute,
    schedule.cronHour,
    schedule.cronDayOfMonth,
    schedule.cronMonth,
    schedule.cronDayOfWeek,
  )

  await prisma.schedule.update({
    where: { id: scheduleId },
    data: {
      isProcessing: false,
      lastRunAt: new Date(),
      nextRunAt,
    },
  })
}
