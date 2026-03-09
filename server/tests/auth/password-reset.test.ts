import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import {
  createTestHono,
  createMockPrisma,
  MOCK_ADMIN,
} from '../helpers/test-app'
import { sendResetLink } from '../../src/controllers/auth/forgotPasswordController'
import { handle as resetPassword } from '../../src/controllers/auth/resetPasswordController'
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

vi.mock('../../src/services/mail/mailer', () => ({
  sendPasswordResetEmail: vi.fn(async () => true),
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

function buildApp() {
  const ctx = createTestHono()
  const { app } = ctx

  app.onError(onError)
  app.post('/api/auth/password', sendResetLink)
  app.post('/api/auth/password/reset', resetPassword)

  return ctx
}

// ---------------------------------------------------------------------------
// Forgot password (POST /api/auth/password)
// ---------------------------------------------------------------------------

describe('POST /api/auth/password (forgot password)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should accept valid email and return success message', async () => {
    const { app, prisma } = buildApp()
    prisma.user.findUnique.mockResolvedValue(MOCK_ADMIN)

    const res = await testRequest(app, 'POST', '/api/auth/password', {
      email: 'admin@pyrotype.local',
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toContain('e-mailed your password reset link')
  })

  it('should return same response for nonexistent email (no enumeration)', async () => {
    const { app, prisma } = buildApp()
    prisma.user.findUnique.mockResolvedValue(null)

    const res = await testRequest(app, 'POST', '/api/auth/password', {
      email: 'nonexistent@example.com',
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toContain('e-mailed your password reset link')
  })

  it('should return success even with empty email (no enumeration)', async () => {
    const { app } = buildApp()

    const res = await testRequest(app, 'POST', '/api/auth/password', {})

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toContain('e-mailed your password reset link')
  })

  it('should create a password reset token for valid email', async () => {
    const { app, prisma } = buildApp()
    prisma.user.findUnique.mockResolvedValue(MOCK_ADMIN)

    await testRequest(app, 'POST', '/api/auth/password', {
      email: 'admin@pyrotype.local',
    })

    expect(prisma.passwordReset.deleteMany).toHaveBeenCalledWith({
      where: { email: 'admin@pyrotype.local' },
    })
    expect(prisma.passwordReset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'admin@pyrotype.local',
        token: 'mock-token-abc123',
      }),
    })
  })

  it('should not create reset token for nonexistent email', async () => {
    const { app, prisma } = buildApp()
    prisma.user.findUnique.mockResolvedValue(null)

    await testRequest(app, 'POST', '/api/auth/password', {
      email: 'nonexistent@example.com',
    })

    expect(prisma.passwordReset.create).not.toHaveBeenCalled()
  })

  it('should send a password reset email for existing user', async () => {
    const { sendPasswordResetEmail } = await import('../../src/services/mail/mailer')
    const { app, prisma } = buildApp()
    prisma.user.findUnique.mockResolvedValue(MOCK_ADMIN)

    await testRequest(app, 'POST', '/api/auth/password', {
      email: 'admin@pyrotype.local',
    })

    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      prisma,
      'admin@pyrotype.local',
      'mock-token-abc123',
    )
  })

  it('should replace existing reset token on repeated requests', async () => {
    const { app, prisma } = buildApp()
    prisma.user.findUnique.mockResolvedValue(MOCK_ADMIN)

    await testRequest(app, 'POST', '/api/auth/password', {
      email: 'admin@pyrotype.local',
    })

    // Should delete old tokens before creating a new one
    expect(prisma.passwordReset.deleteMany).toHaveBeenCalledWith({
      where: { email: 'admin@pyrotype.local' },
    })
    expect(prisma.passwordReset.create).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// Reset password (POST /api/auth/password/reset)
// ---------------------------------------------------------------------------

describe('POST /api/auth/password/reset', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const validResetBody = {
    email: 'admin@pyrotype.local',
    token: 'valid-reset-token',
    password: 'NewSecurePassword123!',
    passwordConfirmation: 'NewSecurePassword123!',
  }

  it('should reset password with valid token', async () => {
    const { app, prisma } = buildApp()
    prisma.passwordReset.findFirst.mockResolvedValue({
      id: 1,
      email: 'admin@pyrotype.local',
      token: 'valid-reset-token',
      createdAt: new Date(),
    })
    prisma.user.findUnique.mockResolvedValue(MOCK_ADMIN)

    const res = await testRequest(app, 'POST', '/api/auth/password/reset', validResetBody)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.redirect_to).toBe('/')
  })

  it('should update the user password hash', async () => {
    const { app, prisma } = buildApp()
    prisma.passwordReset.findFirst.mockResolvedValue({
      id: 1,
      email: 'admin@pyrotype.local',
      token: 'valid-reset-token',
      createdAt: new Date(),
    })
    prisma.user.findUnique.mockResolvedValue(MOCK_ADMIN)

    await testRequest(app, 'POST', '/api/auth/password/reset', validResetBody)

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: MOCK_ADMIN.id },
      data: { password: 'hashed:NewSecurePassword123!' },
    })
  })

  it('should reject reset with invalid token', async () => {
    const { app, prisma } = buildApp()
    prisma.passwordReset.findFirst.mockResolvedValue(null)

    const res = await testRequest(app, 'POST', '/api/auth/password/reset', {
      ...validResetBody,
      token: 'completely-invalid-token',
    })

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.errors).toBeDefined()
    expect(json.errors[0].detail).toContain('token is invalid')
  })

  it('should reject reset with mismatched passwords', async () => {
    const { app } = buildApp()

    const res = await testRequest(app, 'POST', '/api/auth/password/reset', {
      email: 'admin@pyrotype.local',
      token: 'some-token',
      password: 'NewPassword123!',
      passwordConfirmation: 'DifferentPassword456!',
    })

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.errors).toBeDefined()
    expect(json.errors[0].detail).toContain('confirmation does not match')
  })

  it('should reject reset with missing required fields', async () => {
    const { app } = buildApp()

    const res = await testRequest(app, 'POST', '/api/auth/password/reset', {})

    expect(res.status).toBe(422)
  })

  it('should reject reset with missing email', async () => {
    const { app } = buildApp()

    const res = await testRequest(app, 'POST', '/api/auth/password/reset', {
      token: 'some-token',
      password: 'NewPassword123!',
      passwordConfirmation: 'NewPassword123!',
    })

    expect(res.status).toBe(422)
  })

  it('should reject reset with missing token', async () => {
    const { app } = buildApp()

    const res = await testRequest(app, 'POST', '/api/auth/password/reset', {
      email: 'admin@pyrotype.local',
      password: 'NewPassword123!',
      passwordConfirmation: 'NewPassword123!',
    })

    expect(res.status).toBe(422)
  })

  it('should reject reset with password shorter than 8 characters', async () => {
    const { app } = buildApp()

    const res = await testRequest(app, 'POST', '/api/auth/password/reset', {
      email: 'admin@pyrotype.local',
      token: 'some-token',
      password: 'short',
      passwordConfirmation: 'short',
    })

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.errors[0].detail).toContain('at least 8 characters')
  })

  it('should delete reset token after successful use', async () => {
    const { app, prisma } = buildApp()
    prisma.passwordReset.findFirst.mockResolvedValue({
      id: 1,
      email: 'admin@pyrotype.local',
      token: 'valid-reset-token',
      createdAt: new Date(),
    })
    prisma.user.findUnique.mockResolvedValue(MOCK_ADMIN)

    await testRequest(app, 'POST', '/api/auth/password/reset', validResetBody)

    expect(prisma.passwordReset.deleteMany).toHaveBeenCalledWith({
      where: { email: 'admin@pyrotype.local' },
    })
  })

  it('should reject reuse of same reset token (token deleted after use)', async () => {
    const { app, prisma } = buildApp()

    // First request: token exists
    prisma.passwordReset.findFirst.mockResolvedValueOnce({
      id: 1,
      email: 'admin@pyrotype.local',
      token: 'valid-reset-token',
      createdAt: new Date(),
    })
    prisma.user.findUnique.mockResolvedValueOnce(MOCK_ADMIN)

    const firstRes = await testRequest(app, 'POST', '/api/auth/password/reset', validResetBody)
    expect(firstRes.status).toBe(200)

    // Second request: token no longer exists
    prisma.passwordReset.findFirst.mockResolvedValueOnce(null)

    const secondRes = await testRequest(app, 'POST', '/api/auth/password/reset', validResetBody)
    expect(secondRes.status).toBe(422)
  })

  it('should reject expired token (older than 1 hour)', async () => {
    const { app, prisma } = buildApp()
    const expiredDate = new Date(Date.now() - 2 * 60 * 60 * 1000)
    prisma.passwordReset.findFirst.mockResolvedValue({
      id: 1,
      email: 'admin@pyrotype.local',
      token: 'valid-reset-token',
      createdAt: expiredDate,
    })

    const res = await testRequest(app, 'POST', '/api/auth/password/reset', validResetBody)

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.errors[0].detail).toContain('token is invalid')
  })

  it('should set session cookie for non-2FA user after reset', async () => {
    const { app, prisma } = buildApp()
    prisma.passwordReset.findFirst.mockResolvedValue({
      id: 1,
      email: 'admin@pyrotype.local',
      token: 'valid-reset-token',
      createdAt: new Date(),
    })
    prisma.user.findUnique.mockResolvedValue(MOCK_ADMIN)

    const res = await testRequest(app, 'POST', '/api/auth/password/reset', validResetBody)

    expect(res.status).toBe(200)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('pyrotype_session')
  })

  it('should redirect 2FA user to login instead of auto-session', async () => {
    const { app, prisma } = buildApp()
    prisma.passwordReset.findFirst.mockResolvedValue({
      id: 1,
      email: 'totp@pyrotype.local',
      token: 'valid-reset-token',
      createdAt: new Date(),
    })
    prisma.user.findUnique.mockResolvedValue(TOTP_USER)

    const res = await testRequest(app, 'POST', '/api/auth/password/reset', {
      ...validResetBody,
      email: 'totp@pyrotype.local',
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.send_to_login).toBe(true)
  })
})
