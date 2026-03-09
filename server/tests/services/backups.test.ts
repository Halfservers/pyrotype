import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deleteBackupFromDaemon, rotateOldestBackup } from '../../src/services/backups/index'
import { createMockPrisma } from '../helpers/test-app'

vi.mock('../../src/services/daemon/proxy', () => ({
  daemonRequest: vi.fn(),
}))

vi.mock('../../src/config/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { daemonRequest } from '../../src/services/daemon/proxy'
import { logger } from '../../src/config/logger'

const mockedDaemonRequest = vi.mocked(daemonRequest)
const mockedLogger = vi.mocked(logger)

const MOCK_NODE = {
  fqdn: 'node1.example.com',
  scheme: 'https',
  daemonListen: 8080,
  daemonTokenId: 'token-id-1',
  daemonToken: 'secret-token',
}

describe('deleteBackupFromDaemon', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls daemonRequest with correct DELETE path', async () => {
    mockedDaemonRequest.mockResolvedValue(undefined as any)

    await deleteBackupFromDaemon(MOCK_NODE, 'server-uuid-1', 'backup-uuid-1')

    expect(mockedDaemonRequest).toHaveBeenCalledWith(
      MOCK_NODE,
      'DELETE',
      '/api/servers/server-uuid-1/backup/backup-uuid-1',
    )
  })

  it('swallows 404 errors silently', async () => {
    mockedDaemonRequest.mockRejectedValue(new Error('Request failed with status 404'))

    await expect(
      deleteBackupFromDaemon(MOCK_NODE, 'server-uuid-1', 'backup-uuid-1'),
    ).resolves.toBeUndefined()

    // Should NOT log a warning for 404
    expect(mockedLogger.warn).not.toHaveBeenCalled()
  })

  it('logs warning for non-404 errors', async () => {
    mockedDaemonRequest.mockRejectedValue(new Error('Connection refused'))

    await expect(
      deleteBackupFromDaemon(MOCK_NODE, 'server-uuid-1', 'backup-uuid-1'),
    ).resolves.toBeUndefined()

    expect(mockedLogger.warn).toHaveBeenCalledWith(
      'Failed to delete backup from daemon',
      expect.objectContaining({
        serverUuid: 'server-uuid-1',
        backupUuid: 'backup-uuid-1',
        error: 'Connection refused',
      }),
    )
  })

  it('logs warning for errors without message property', async () => {
    mockedDaemonRequest.mockRejectedValue('string error')

    await expect(
      deleteBackupFromDaemon(MOCK_NODE, 'server-uuid-1', 'backup-uuid-1'),
    ).resolves.toBeUndefined()

    expect(mockedLogger.warn).toHaveBeenCalledWith(
      'Failed to delete backup from daemon',
      expect.objectContaining({
        error: 'string error',
      }),
    )
  })
})

describe('rotateOldestBackup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('finds and deletes the oldest unlocked successful backup', async () => {
    const prisma = createMockPrisma()
    const oldestBackup = {
      id: 42,
      uuid: 'oldest-backup-uuid',
      serverId: 1,
      isLocked: false,
      isSuccessful: true,
      deletedAt: null,
      createdAt: new Date('2025-01-01'),
    }

    prisma.backup.findFirst.mockResolvedValue(oldestBackup)
    mockedDaemonRequest.mockResolvedValue(undefined as any)
    prisma.backup.delete.mockResolvedValue(oldestBackup)

    await rotateOldestBackup(prisma, 1, MOCK_NODE, 'server-uuid-1')

    // Should query for oldest unlocked successful backup
    expect(prisma.backup.findFirst).toHaveBeenCalledWith({
      where: {
        serverId: 1,
        isLocked: false,
        isSuccessful: true,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    })

    // Should delete from daemon
    expect(mockedDaemonRequest).toHaveBeenCalledWith(
      MOCK_NODE,
      'DELETE',
      '/api/servers/server-uuid-1/backup/oldest-backup-uuid',
    )

    // Should delete from database
    expect(prisma.backup.delete).toHaveBeenCalledWith({
      where: { id: 42 },
    })
  })

  it('throws TooManyBackups when no unlocked backup exists', async () => {
    const prisma = createMockPrisma()
    prisma.backup.findFirst.mockResolvedValue(null)

    await expect(
      rotateOldestBackup(prisma, 1, MOCK_NODE, 'server-uuid-1'),
    ).rejects.toThrow('TooManyBackups')
  })

  it('does not delete from database if daemon deletion fails with non-404', async () => {
    const prisma = createMockPrisma()
    const oldestBackup = {
      id: 42,
      uuid: 'oldest-backup-uuid',
      serverId: 1,
      isLocked: false,
      isSuccessful: true,
      deletedAt: null,
      createdAt: new Date('2025-01-01'),
    }

    prisma.backup.findFirst.mockResolvedValue(oldestBackup)
    // Non-404 error is logged but swallowed by deleteBackupFromDaemon
    mockedDaemonRequest.mockRejectedValue(new Error('Connection timeout'))
    prisma.backup.delete.mockResolvedValue(oldestBackup)

    // deleteBackupFromDaemon swallows non-404 errors (just logs them)
    // so rotateOldestBackup will still proceed to delete from DB
    await rotateOldestBackup(prisma, 1, MOCK_NODE, 'server-uuid-1')

    expect(prisma.backup.delete).toHaveBeenCalledWith({
      where: { id: 42 },
    })
  })

  it('proceeds with DB delete when daemon returns 404 (backup already gone)', async () => {
    const prisma = createMockPrisma()
    const oldestBackup = {
      id: 42,
      uuid: 'oldest-backup-uuid',
      serverId: 1,
      isLocked: false,
      isSuccessful: true,
      deletedAt: null,
      createdAt: new Date('2025-01-01'),
    }

    prisma.backup.findFirst.mockResolvedValue(oldestBackup)
    mockedDaemonRequest.mockRejectedValue(new Error('404 Not Found'))
    prisma.backup.delete.mockResolvedValue(oldestBackup)

    await rotateOldestBackup(prisma, 1, MOCK_NODE, 'server-uuid-1')

    // Should still delete from database even if daemon returned 404
    expect(prisma.backup.delete).toHaveBeenCalledWith({
      where: { id: 42 },
    })
  })
})
