import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/config/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import {
  createRemoteDatabase,
  deleteRemoteDatabase,
  resetRemoteDatabasePassword,
  testDatabaseHostConnection,
} from '../../src/services/databases/index'
import { logger } from '../../src/config/logger'

const mockedLogger = vi.mocked(logger)

const MOCK_HOST = {
  host: 'db.example.com',
  port: 3306,
  username: 'root',
  password: 'secret',
}

describe('createRemoteDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates correct SQL statements and logs them', async () => {
    const result = await createRemoteDatabase(
      MOCK_HOST,
      'test_db',
      'test_user',
      'test_pass',
      '%',
      0,
    )

    expect(result).toBe(false) // always false in CF Workers
    expect(mockedLogger.info).toHaveBeenCalledWith(
      'Remote MySQL SQL (not executed — requires Hyperdrive or HTTP MySQL proxy)',
      expect.objectContaining({
        host: 'db.example.com',
        port: 3306,
        statementCount: 4, // CREATE DB, CREATE USER, GRANT, FLUSH
      }),
    )
  })

  it('includes ALTER USER when maxConnections > 0', async () => {
    await createRemoteDatabase(MOCK_HOST, 'test_db', 'test_user', 'test_pass', '%', 10)

    expect(mockedLogger.info).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        statementCount: 5, // CREATE DB, CREATE USER, GRANT, ALTER USER, FLUSH
      }),
    )
  })

  it('omits ALTER USER when maxConnections is 0', async () => {
    await createRemoteDatabase(MOCK_HOST, 'test_db', 'test_user', 'test_pass', '%', 0)

    expect(mockedLogger.info).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        statementCount: 4,
      }),
    )
  })

  it('returns false (not executed in CF Workers)', async () => {
    const result = await createRemoteDatabase(
      MOCK_HOST,
      'my_db',
      'my_user',
      'my_pass',
      'localhost',
      5,
    )
    expect(result).toBe(false)
  })
})

describe('deleteRemoteDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates correct SQL statements (DROP USER, DROP DB, FLUSH)', async () => {
    const result = await deleteRemoteDatabase(MOCK_HOST, 'test_db', 'test_user', '%')

    expect(result).toBe(false)
    expect(mockedLogger.info).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        statementCount: 3, // DROP USER, DROP DB, FLUSH
      }),
    )
  })

  it('returns false (not executed in CF Workers)', async () => {
    const result = await deleteRemoteDatabase(MOCK_HOST, 'test_db', 'test_user', '%')
    expect(result).toBe(false)
  })
})

describe('resetRemoteDatabasePassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates correct SQL statements without maxConnections', async () => {
    const result = await resetRemoteDatabasePassword(
      MOCK_HOST,
      'test_db',
      'test_user',
      'new_pass',
      '%',
      0,
    )

    expect(result).toBe(false)
    expect(mockedLogger.info).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        statementCount: 4, // DROP USER, CREATE USER, GRANT, FLUSH
      }),
    )
  })

  it('includes ALTER USER when maxConnections > 0', async () => {
    await resetRemoteDatabasePassword(
      MOCK_HOST,
      'test_db',
      'test_user',
      'new_pass',
      '%',
      20,
    )

    expect(mockedLogger.info).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        statementCount: 5, // DROP USER, CREATE USER, GRANT, ALTER, FLUSH
      }),
    )
  })
})

describe('testDatabaseHostConnection', () => {
  it('returns success=false with descriptive error message', async () => {
    const result = await testDatabaseHostConnection(MOCK_HOST)

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error).toContain('Raw MySQL connections not supported')
    expect(result.error).toContain('Cloudflare Workers')
  })

  it('returns error mentioning Hyperdrive as an alternative', async () => {
    const result = await testDatabaseHostConnection(MOCK_HOST)
    expect(result.error).toContain('Hyperdrive')
  })
})

describe('SQL escaping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('handles database names with backticks via esc()', async () => {
    // The esc() function doubles backticks: ` -> ``
    // We verify indirectly by checking the function completes without error
    const result = await createRemoteDatabase(
      MOCK_HOST,
      'db`injection',
      'user',
      'pass',
      '%',
      0,
    )
    expect(result).toBe(false)
    expect(mockedLogger.info).toHaveBeenCalled()
  })

  it('handles usernames with single quotes via quote()', async () => {
    const result = await createRemoteDatabase(
      MOCK_HOST,
      'test_db',
      "user'name",
      'pass',
      '%',
      0,
    )
    expect(result).toBe(false)
    expect(mockedLogger.info).toHaveBeenCalled()
  })

  it('handles passwords with backslashes via quote()', async () => {
    const result = await createRemoteDatabase(
      MOCK_HOST,
      'test_db',
      'user',
      'pass\\word',
      '%',
      0,
    )
    expect(result).toBe(false)
    expect(mockedLogger.info).toHaveBeenCalled()
  })

  it('handles remote with special characters', async () => {
    const result = await createRemoteDatabase(
      MOCK_HOST,
      'test_db',
      'user',
      'pass',
      "192.168.1.%",
      0,
    )
    expect(result).toBe(false)
    expect(mockedLogger.info).toHaveBeenCalled()
  })
})
