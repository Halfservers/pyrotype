import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import {
  createTestHono,
  createMockPrisma,
  createMockKV,
  MOCK_ADMIN,
} from '../helpers/test-app'
import { handle as loginCheckpoint } from '../../src/controllers/auth/loginCheckpointController'
import { onError } from '../../src/middleware/errorHandler'

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('../../src/utils/crypto', () => ({
  verifyPassword: vi.fn(async (plain: string, _hash: string) => plain === 'correct-password'),
  generateToken: vi.fn(() => 'mock-token-abc123'),
  hashPassword: vi.fn(async (pw: string) => `hashed:${pw}`),
}))

vi.mock('../../src/services/auth/session', () => ({
  createSession: vi.fn(async () => 'signed-session-cookie'),
  updateSession: vi.fn(async () => 'updated-session-cookie'),
  destroySession: vi.fn(async () => {}),
}))

vi.mock('../../src/services/auth/twoFactor', () => ({
  verifyTotpCode: vi.fn((_secret: string, code: string) => code === '123456'),
}))

vi.mock('../../src/config/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_ENV = {
  SESSION_KV: {} as any,
  APP_KEY: 'test-app-key-secret',
  NODE_ENV: 'testing',
  DB: {} as any,
  JOB_QUEUE: {} as any,
  SERVER_CONSOLE: {} as any,
}

const TOTP_USER = {
  ...MOCK_ADMIN,
  id: 3,
  uuid: 'totp-user-uuid',
  username: 'totpuser',
  email: 'totp@pyrotype.local',
  useTotp: true,
  totpSecret: 'JBSWY3DPEHPK3PXP',
  recoveryTokens: [],
}

async function testRequest(
  app: Hono<any>,
  method: string,
  path: string,
  body?: unknown,
) {
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) {
    init.body = JSON.stringify(body)
  }
  return app.request(path, init, MOCK_ENV)
}

function buildCheckpointApp(sessionOverrides?: Record<string, unknown>) {
  const prisma = createMockPrisma()
  const kv = createMockKV()

  const ctx = createTestHono({ prisma, kv })
  const { app } = ctx

  app.use('*', async (c, next) => {
    c.set('session', {
      userId: 0,
      authConfirmationToken: {
        userId: TOTP_USER.id,
        tokenValue: 'mock-token-abc123',
        expiresAt: Date.now() + 5 * 60 * 1000,
        ...sessionOverrides,
      },
    } as any)
    await next()
  })

  app.onError(onError)
  app.post('/api/auth/login/checkpoint', loginCheckpoint)

  return { ...ctx, prisma }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/auth/login/checkpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reject checkpoint without pending auth session', async () => {
    const ctx = createTestHono()
    const { app } = ctx

    app.onError(onError)
    app.post('/api/auth/login/checkpoint', loginCheckpoint)

    const res = await testRequest(app, 'POST', '/api/auth/login/checkpoint', {
      confirmation_token: 'some-token',
      authentication_code: '123456',
    })

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.errors).toBeDefined()
    expect(json.errors[0].detail).toContain('authentication token')
  })

  it('should reject checkpoint with no body', async () => {
    const ctx = createTestHono()
    const { app } = ctx

    app.onError(onError)
    app.post('/api/auth/login/checkpoint', loginCheckpoint)

    const res = await testRequest(app, 'POST', '/api/auth/login/checkpoint', {})

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.errors).toBeDefined()
  })

  it('should reject checkpoint with invalid confirmation token', async () => {
    const { app, prisma } = buildCheckpointApp()
    prisma.user.findUnique.mockResolvedValue({
      ...TOTP_USER,
      recoveryTokens: [],
    })

    const res = await testRequest(app, 'POST', '/api/auth/login/checkpoint', {
      confirmation_token: 'invalid-token',
      authentication_code: '123456',
    })

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.errors).toBeDefined()
  })

  it('should reject checkpoint with missing confirmation_token field', async () => {
    const { app, prisma } = buildCheckpointApp()
    prisma.user.findUnique.mockResolvedValue({
      ...TOTP_USER,
      recoveryTokens: [],
    })

    const res = await testRequest(app, 'POST', '/api/auth/login/checkpoint', {
      authentication_code: '123456',
    })

    expect(res.status).toBe(422)
  })

  it('should reject checkpoint with missing authentication_code field', async () => {
    const { app, prisma } = buildCheckpointApp()
    prisma.user.findUnique.mockResolvedValue({
      ...TOTP_USER,
      totpSecret: 'JBSWY3DPEHPK3PXP',
      recoveryTokens: [],
    })

    const res = await testRequest(app, 'POST', '/api/auth/login/checkpoint', {
      confirmation_token: 'mock-token-abc123',
    })

    expect(res.status).toBe(422)
  })

  it('should not leak user information on invalid checkpoint attempts', async () => {
    const ctx = createTestHono()
    const { app } = ctx

    app.onError(onError)
    app.post('/api/auth/login/checkpoint', loginCheckpoint)

    const res = await testRequest(app, 'POST', '/api/auth/login/checkpoint', {
      confirmation_token: 'invalid',
      authentication_code: '000000',
    })

    expect(res.status).toBe(422)
    const json = await res.json()
    const body = JSON.stringify(json)
    expect(body).not.toContain('admin@pyrotype.local')
    expect(body).not.toContain('"password"')
  })

  it('should complete 2FA with valid TOTP code', async () => {
    const { app, prisma } = buildCheckpointApp()
    prisma.user.findUnique.mockResolvedValue({
      ...TOTP_USER,
      recoveryTokens: [],
    })

    const res = await testRequest(app, 'POST', '/api/auth/login/checkpoint', {
      confirmation_token: 'mock-token-abc123',
      authentication_code: '123456',
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.complete).toBe(true)
    expect(json.data.intended).toBe('/')
    expect(json.data.user.object).toBe('user')
    expect(json.data.user.attributes.username).toBe('totpuser')
  })

  it('should reject when confirmation token is expired', async () => {
    const { app, prisma } = buildCheckpointApp({
      expiresAt: Date.now() - 1000,
    })
    prisma.user.findUnique.mockResolvedValue({
      ...TOTP_USER,
      recoveryTokens: [],
    })

    const res = await testRequest(app, 'POST', '/api/auth/login/checkpoint', {
      confirmation_token: 'mock-token-abc123',
      authentication_code: '123456',
    })

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.errors[0].detail).toContain('expired')
  })

  it('should reject when user no longer exists', async () => {
    const { app, prisma } = buildCheckpointApp()
    prisma.user.findUnique.mockResolvedValue(null)

    const res = await testRequest(app, 'POST', '/api/auth/login/checkpoint', {
      confirmation_token: 'mock-token-abc123',
      authentication_code: '123456',
    })

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.errors[0].detail).toContain('expired')
  })

  it('should accept a valid recovery token instead of TOTP code', async () => {
    const { app, prisma } = buildCheckpointApp()
    prisma.user.findUnique.mockResolvedValue({
      ...TOTP_USER,
      recoveryTokens: [{ id: 10, token: 'hashed-recovery', userId: TOTP_USER.id }],
    })

    const res = await testRequest(app, 'POST', '/api/auth/login/checkpoint', {
      confirmation_token: 'mock-token-abc123',
      recovery_token: 'correct-password',
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.complete).toBe(true)

    expect(prisma.recoveryToken.delete).toHaveBeenCalledWith({
      where: { id: 10 },
    })
  })

  it('should reject an invalid recovery token', async () => {
    const { app, prisma } = buildCheckpointApp()
    prisma.user.findUnique.mockResolvedValue({
      ...TOTP_USER,
      recoveryTokens: [{ id: 10, token: 'hashed-recovery', userId: TOTP_USER.id }],
    })

    const res = await testRequest(app, 'POST', '/api/auth/login/checkpoint', {
      confirmation_token: 'mock-token-abc123',
      recovery_token: 'wrong-recovery-token',
    })

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.errors[0].detail).toContain('recovery token provided is not valid')
  })
})
