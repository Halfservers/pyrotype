import type { PrismaClient } from '@prisma/client'
import { logger } from '../../config/logger'

function parseCronField(field: string, min: number, max: number): number[] {
  const values = new Set<number>()
  for (const part of field.split(',')) {
    const trimmed = part.trim()
    if (trimmed === '*') {
      for (let i = min; i <= max; i++) values.add(i)
      continue
    }
    const stepMatch = trimmed.match(/^(?:(\d+)-(\d+)|\*)\/(\d+)$/)
    if (stepMatch) {
      const start = stepMatch[1] !== undefined ? parseInt(stepMatch[1], 10) : min
      const end = stepMatch[2] !== undefined ? parseInt(stepMatch[2], 10) : max
      const step = parseInt(stepMatch[3], 10)
      if (step > 0) {
        for (let i = start; i <= end; i += step) values.add(i)
      }
      continue
    }
    const rangeMatch = trimmed.match(/^(\d+)-(\d+)$/)
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10)
      const end = parseInt(rangeMatch[2], 10)
      for (let i = start; i <= end; i++) {
        if (i >= min && i <= max) values.add(i)
      }
      continue
    }
    const num = parseInt(trimmed, 10)
    if (!isNaN(num) && num >= min && num <= max) {
      values.add(num)
    }
  }
  return [...values].sort((a, b) => a - b)
}

/**
 * Calculate the next run date for a cron expression.
 * Returns null if no valid date can be computed within 366 days.
 */
export function getNextCronDate(
  minute: string,
  hour: string,
  dayOfMonth: string,
  month: string,
  dayOfWeek: string,
): Date | null {
  const minutes = parseCronField(minute, 0, 59)
  const hours = parseCronField(hour, 0, 23)
  const months = parseCronField(month, 1, 12)
  const daysOfMonth = parseCronField(dayOfMonth, 1, 31)
  const daysOfWeek = parseCronField(dayOfWeek, 0, 6)

  if (!minutes.length || !hours.length || !months.length) return null

  const now = new Date()
  const candidate = new Date(now)
  candidate.setSeconds(0)
  candidate.setMilliseconds(0)
  candidate.setMinutes(candidate.getMinutes() + 1)

  const maxTime = now.getTime() + 366 * 24 * 60 * 60 * 1000

  while (candidate.getTime() < maxTime) {
    const m = candidate.getMonth() + 1
    if (!months.includes(m)) {
      candidate.setMonth(candidate.getMonth() + 1, 1)
      candidate.setHours(0, 0, 0, 0)
      continue
    }

    const dom = candidate.getDate()
    const dow = candidate.getDay()
    const domMatch = dayOfMonth === '*' || daysOfMonth.includes(dom)
    const dowMatch = dayOfWeek === '*' || daysOfWeek.includes(dow)

    let dayMatch: boolean
    if (dayOfMonth === '*' && dayOfWeek === '*') {
      dayMatch = true
    } else if (dayOfMonth !== '*' && dayOfWeek !== '*') {
      dayMatch = domMatch || dowMatch
    } else {
      dayMatch = domMatch && dowMatch
    }

    if (!dayMatch) {
      candidate.setDate(candidate.getDate() + 1)
      candidate.setHours(0, 0, 0, 0)
      continue
    }

    const h = candidate.getHours()
    if (!hours.includes(h)) {
      const nextH = hours.find((v) => v > h)
      if (nextH !== undefined) {
        candidate.setHours(nextH, minutes[0], 0, 0)
      } else {
        candidate.setDate(candidate.getDate() + 1)
        candidate.setHours(hours[0], minutes[0], 0, 0)
      }
      continue
    }

    const mi = candidate.getMinutes()
    if (!minutes.includes(mi)) {
      const nextM = minutes.find((v) => v > mi)
      if (nextM !== undefined) {
        candidate.setMinutes(nextM, 0, 0)
      } else {
        const nextH = hours.find((v) => v > h)
        if (nextH !== undefined) {
          candidate.setHours(nextH, minutes[0], 0, 0)
        } else {
          candidate.setDate(candidate.getDate() + 1)
          candidate.setHours(hours[0], minutes[0], 0, 0)
        }
      }
      continue
    }

    return new Date(candidate)
  }

  return null
}

/**
 * Process schedule dispatch — find due schedules and enqueue them.
 * Called from the Worker's scheduled handler every minute.
 */
export async function processScheduleDispatch(
  prisma: PrismaClient,
  queue: Queue,
): Promise<void> {
  const now = new Date()

  const dueSchedules = await prisma.schedule.findMany({
    where: {
      isActive: true,
      isProcessing: false,
      nextRunAt: { lte: now },
    },
    include: { server: true },
  })

  for (const schedule of dueSchedules) {
    try {
      if (schedule.onlyWhenOnline && schedule.server?.status !== null) {
        const next = getNextCronDate(
          schedule.cronMinute,
          schedule.cronHour,
          schedule.cronDayOfMonth,
          schedule.cronMonth,
          schedule.cronDayOfWeek,
        )
        await prisma.schedule.update({
          where: { id: schedule.id },
          data: { nextRunAt: next },
        })
        continue
      }

      await prisma.schedule.update({
        where: { id: schedule.id },
        data: { isProcessing: true },
      })

      await queue.send({
        type: 'schedule',
        data: { scheduleId: schedule.id },
      })
    } catch (err) {
      logger.error(`Failed to dispatch schedule ${schedule.id}`, {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
}
