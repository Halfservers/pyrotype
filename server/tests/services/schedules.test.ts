import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getNextCronDate } from '../../src/services/schedules/index'

vi.mock('../../src/config/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('getNextCronDate', () => {
  describe('simple cron patterns', () => {
    it('every minute (* * * * *) returns a date within the next minute', () => {
      const result = getNextCronDate('*', '*', '*', '*', '*')
      expect(result).toBeInstanceOf(Date)
      const now = new Date()
      const diffMs = result!.getTime() - now.getTime()
      // Should be within 0-60 seconds from now
      expect(diffMs).toBeGreaterThan(0)
      expect(diffMs).toBeLessThanOrEqual(61_000)
    })

    it('every hour at :00 (0 * * * *) returns a date at minute 0', () => {
      const result = getNextCronDate('0', '*', '*', '*', '*')
      expect(result).toBeInstanceOf(Date)
      expect(result!.getMinutes()).toBe(0)
      expect(result!.getSeconds()).toBe(0)
    })

    it('daily at midnight (0 0 * * *) returns a date at 00:00', () => {
      const result = getNextCronDate('0', '0', '*', '*', '*')
      expect(result).toBeInstanceOf(Date)
      expect(result!.getHours()).toBe(0)
      expect(result!.getMinutes()).toBe(0)
    })
  })

  describe('specific times', () => {
    it('"30 14 * * *" returns 2:30 PM', () => {
      const result = getNextCronDate('30', '14', '*', '*', '*')
      expect(result).toBeInstanceOf(Date)
      expect(result!.getHours()).toBe(14)
      expect(result!.getMinutes()).toBe(30)
    })

    it('"0 6 * * *" returns 6:00 AM', () => {
      const result = getNextCronDate('0', '6', '*', '*', '*')
      expect(result).toBeInstanceOf(Date)
      expect(result!.getHours()).toBe(6)
      expect(result!.getMinutes()).toBe(0)
    })
  })

  describe('day-of-week patterns', () => {
    it('"0 0 * * 1" returns a Monday at midnight', () => {
      const result = getNextCronDate('0', '0', '*', '*', '1')
      expect(result).toBeInstanceOf(Date)
      expect(result!.getDay()).toBe(1) // Monday
      expect(result!.getHours()).toBe(0)
      expect(result!.getMinutes()).toBe(0)
    })

    it('"0 0 * * 0" returns a Sunday', () => {
      const result = getNextCronDate('0', '0', '*', '*', '0')
      expect(result).toBeInstanceOf(Date)
      expect(result!.getDay()).toBe(0) // Sunday
    })

    it('"0 0 * * 5" returns a Friday', () => {
      const result = getNextCronDate('0', '0', '*', '*', '5')
      expect(result).toBeInstanceOf(Date)
      expect(result!.getDay()).toBe(5) // Friday
    })
  })

  describe('step values', () => {
    it('"*/5 * * * *" returns a date at a multiple-of-5 minute', () => {
      const result = getNextCronDate('*/5', '*', '*', '*', '*')
      expect(result).toBeInstanceOf(Date)
      expect(result!.getMinutes() % 5).toBe(0)
    })

    it('"*/15 * * * *" returns a date at a multiple-of-15 minute', () => {
      const result = getNextCronDate('*/15', '*', '*', '*', '*')
      expect(result).toBeInstanceOf(Date)
      expect([0, 15, 30, 45]).toContain(result!.getMinutes())
    })

    it('"0 */6 * * *" returns a date at a multiple-of-6 hour', () => {
      const result = getNextCronDate('0', '*/6', '*', '*', '*')
      expect(result).toBeInstanceOf(Date)
      expect([0, 6, 12, 18]).toContain(result!.getHours())
    })
  })

  describe('ranges', () => {
    it('"0 9-17 * * 1-5" returns a weekday between 9-17', () => {
      const result = getNextCronDate('0', '9-17', '*', '*', '1-5')
      expect(result).toBeInstanceOf(Date)
      expect(result!.getHours()).toBeGreaterThanOrEqual(9)
      expect(result!.getHours()).toBeLessThanOrEqual(17)
      expect(result!.getDay()).toBeGreaterThanOrEqual(1)
      expect(result!.getDay()).toBeLessThanOrEqual(5)
    })

    it('"0-30 * * * *" returns a date with minute between 0 and 30', () => {
      const result = getNextCronDate('0-30', '*', '*', '*', '*')
      expect(result).toBeInstanceOf(Date)
      expect(result!.getMinutes()).toBeGreaterThanOrEqual(0)
      expect(result!.getMinutes()).toBeLessThanOrEqual(30)
    })
  })

  describe('impossible patterns', () => {
    it('returns null for empty minute field', () => {
      // parseCronField with an invalid value that produces no results
      const result = getNextCronDate('60', '0', '*', '*', '*')
      expect(result).toBeNull()
    })

    it('returns null for empty hour field', () => {
      const result = getNextCronDate('0', '25', '*', '*', '*')
      expect(result).toBeNull()
    })

    it('returns null for impossible month (13)', () => {
      const result = getNextCronDate('0', '0', '*', '13', '*')
      expect(result).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('result is always in the future', () => {
      const result = getNextCronDate('*', '*', '*', '*', '*')
      expect(result).toBeInstanceOf(Date)
      expect(result!.getTime()).toBeGreaterThan(Date.now())
    })

    it('result has seconds and milliseconds zeroed', () => {
      const result = getNextCronDate('*', '*', '*', '*', '*')
      expect(result).toBeInstanceOf(Date)
      expect(result!.getSeconds()).toBe(0)
      expect(result!.getMilliseconds()).toBe(0)
    })

    it('handles specific month constraint (only January)', () => {
      const result = getNextCronDate('0', '0', '1', '1', '*')
      expect(result).toBeInstanceOf(Date)
      expect(result!.getMonth()).toBe(0) // January (0-indexed)
      expect(result!.getDate()).toBe(1)
    })

    it('handles combined day-of-month and day-of-week (OR logic)', () => {
      // When both dayOfMonth and dayOfWeek are non-*, they use OR logic
      const result = getNextCronDate('0', '0', '15', '*', '1')
      expect(result).toBeInstanceOf(Date)
      // Should match either the 15th of month OR a Monday
      const isThe15th = result!.getDate() === 15
      const isMonday = result!.getDay() === 1
      expect(isThe15th || isMonday).toBe(true)
    })

    it('comma-separated values work correctly', () => {
      const result = getNextCronDate('0,30', '9,17', '*', '*', '*')
      expect(result).toBeInstanceOf(Date)
      expect([0, 30]).toContain(result!.getMinutes())
      expect([9, 17]).toContain(result!.getHours())
    })
  })
})
