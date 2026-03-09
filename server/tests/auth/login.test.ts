import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import {
  createTestHono,
  createMockPrisma,
  createMockKV,
  MOCK_ADMIN,
  MOCK_USER,
} from '../helpers/test-app'
import { login, logout } from '../../src/controllers/auth/loginController'
import { handle as loginCheckpoint } from '../../src/controllers/auth/loginCheckpointController'
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

vi.mock('../../src/services/auth/twoFactor', () => ({
  verifyTotpCode: vi.fn((_secret: string, code: string) => code === '123456'),
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

/** Mock env bindings required by controllers. */
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

/**
 * Send a JSON request to the Hono app with mock env bindings.
 * Hono's `app.request(input, init, Env)` requires env as the third arg.
 */
async function testRequest(
  app: Hono<any>,
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>,
) {
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }
  if (body !== undefined) {
    init.body = JSON.stringify(body)
  }
  return app.request(path, init, MOCK_ENV)
}

function buildAuthApp(opts?: Parameters<typeof createTestHono>[0]) {
  const ctx = createTestHono(opts)
  const { app } = ctx

  app.onError(onError)

  // Mount controllers directly (bypasses rate-limit and captcha middleware)
  app.post('/auth/login', login)
  app.post('/auth/login/checkpoint', loginCheckpoint)
  app.post('/auth/logout', logout)
  app.post('/auth/password', sendResetLink)
  app.post('/auth/password/reset', resetPassword)

  return ctx
}

// ---------------------------------------------------------------------------
// 1. Login
// ---------------------------------------------------------------------------

describe('POST /auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 200 with complete user data for valid credentials (username)', async () => {
    const { app, prisma } = buildAuthApp()
    prisma.user.findFirst.mockResolvedValue(MOCK_ADMIN)

    const res = await testRequest(app, 'POST', '/auth/login', {
      user: 'admin',
      password: 'correct-password',
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.complete).toBe(true)
    expect(json.data.intended).toBe('/')
    expect(json.data.user.object).toBe('user')

    const attrs = json.data.user.attributes
    expect(attrs.id).toBe(MOCK_ADMIN.id)
    expect(attrs.uuid).toBe(MOCK_ADMIN.uuid)
    expect(attrs.username).toBe('admin')
    expect(attrs.email).toBe('admin@pyrotype.local')
    expect(attrs.root_admin).toBe(true)
    expect(attrs.use_totp).toBe(false)
    expect(attrs.name_first).toBe('Admin')
    expect(attrs.name_last).toBe('User')
    expect(attrs.language).toBe('en')
    expect(attrs.created_at).toBe(MOCK_ADMIN.createdAt.toISOString())
    expect(attrs.updated_at).toBe(MOCK_ADMIN.updatedAt.toISOString())
  })

  it('should resolve the user by email when the identifier contains @', async () => {
    const { app, prisma } = buildAuthApp()
    prisma.user.findFirst.mockResolvedValue(MOCK_USER)

    const res = await testRequest(app, 'POST', '/auth/login', {
      user: 'user@pyrotype.local',
      password: 'correct-password',
    })

    expect(res.status).toBe(200)
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { email: 'user@pyrotype.local' },
    })
  })

  it('should resolve the user by username when identifier has no @', async () => {
    const { app, prisma } = buildAuthApp()
    prisma.user.findFirst.mockResolvedValue(MOCK_ADMIN)

    await testRequest(app, 'POST', '/auth/login', {
      user: 'admin',
      password: 'correct-password',
    })

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { username: 'admin' },
    })
  })

  it('should set a session cookie on successful login', async () => {
    const { app, prisma } = buildAuthApp()
    prisma.user.findFirst.mockResolvedValue(MOCK_ADMIN)

    const res = await testRequest(app, 'POST', '/auth/login', {
      user: 'admin',
      password: 'correct-password',
    })

    expect(res.status).toBe(200)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('pyrotype_session')
  })

  it('should return 422 when user is not found', async () => {
    const { app, prisma } = buildAuthApp()
    prisma.user.findFirst.mockResolvedValue(null)

    const res = await testRequest(app, 'POST', '/auth/login', {
      user: 'nonexistent',
      password: 'anything',
    })

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.errors[0].detail).toContain('credentials do not match')
  })

  it('should return 422 when password is wrong', async () => {
    const { app, prisma } = buildAuthApp()
    prisma.user.findFirst.mockResolvedValue(MOCK_ADMIN)

    const res = await testRequest(app, 'POST', '/auth/login', {
      user: 'admin',
      password: 'wrong-password',
    })

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.errors[0].detail).toContain('credentials do not match')
  })

  it('should return identical error for wrong user and wrong password (no enumeration)', async () => {
    const { app, prisma } = buildAuthApp()

    // Wrong user
    prisma.user.findFirst.mockResolvedValue(null)
    const resNoUser = await testRequest(app, 'POST', '/auth/login', {
      user: 'ghost',
      password: 'anything',
    })
    const jsonNoUser = await resNoUser.json()

    // Wrong password
    prisma.user.findFirst.mockResolvedValue(MOCK_ADMIN)
    const resWrongPw = await testRequest(app, 'POST', '/auth/login', {
      user: 'admin',
      password: 'wrong',
    })
    const jsonWrongPw = await resWrongPw.json()

    expect(resNoUser.status).toBe(resWrongPw.status)
    expect(jsonNoUser.errors[0].detail).toBe(jsonWrongPw.errors[0].detail)
  })

  it('should return 422 when both user and password are missing', async () => {
    const { app } = buildAuthApp()

    const res = await testRequest(app, 'POST', '/auth/login', {})

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.errors[0].detail).toContain('required')
  })

  it('should return 422 when user field is missing', async () => {
    const { app } = buildAuthApp()

    const res = await testRequest(app, 'POST', '/auth/login', {
      password: 'correct-password',
    })

    expect(res.status).toBe(422)
  })

  it('should return 422 when password field is missing', async () => {
    const { app } = buildAuthApp()

    const res = await testRequest(app, 'POST', '/auth/login', {
      user: 'admin',
    })

    expect(res.status).toBe(422)
  })

  it('should return incomplete when user has 2FA enabled', async () => {
    const { app, prisma } = buildAuthApp()
    prisma.user.findFirst.mockResolvedValue(TOTP_USER)

    const res = await testRequest(app, 'POST', '/auth/login', {
      user: 'totpuser',
      password: 'correct-password',
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.complete).toBe(false)
    expect(json.data.confirmation_token).toBe('mock-token-abc123')
    expect(json.data.user).toBeUndefined()
  })

  it('should set a short-lived session cookie for 2FA checkpoint', async () => {
    const { app, prisma } = buildAuthApp()
    prisma.user.findFirst.mockResolvedValue(TOTP_USER)

    const res = await testRequest(app, 'POST', '/auth/login', {
      user: 'totpuser',
      password: 'correct-password',
    })

    expect(res.status).toBe(200)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('pyrotype_session')
  })
})

// ---------------------------------------------------------------------------
// 2. Login checkpoint (2FA verification)
// ---------------------------------------------------------------------------

describe('POST /auth/login/checkpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function buildCheckpointApp(sessionOverrides?: Record<string, unknown>) {
    const prisma = createMockPrisma()
    const kv = createMockKV()

    const ctx = createTestHono({ prisma, kv })
    const { app } = ctx

    // Inject session data with the auth confirmation token
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
    app.post('/auth/login/checkpoint', loginCheckpoint)

    return { ...ctx, prisma }
  }

  it('should complete 2FA with valid TOTP code', async () => {
    const { app, prisma } = buildCheckpointApp()
    prisma.user.findUnique.mockResolvedValue({
      ...TOTP_USER,
      recoveryTokens: [],
    })

    const res = await testRequest(app, 'POST', '/auth/login/checkpoint', {
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

  it('should reject invalid TOTP code', async () => {
    const { app, prisma } = buildCheckpointApp()
    prisma.user.findUnique.mockResolvedValue({
      ...TOTP_USER,
      recoveryTokens: [],
    })

    const res = await testRequest(app, 'POST', '/auth/login/checkpoint', {
      confirmation_token: 'mock-token-abc123',
      authentication_code: '000000',
    })

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.errors[0].detail).toContain('Two-factor authentication checkpoint failed')
  })

  it('should reject mismatched confirmation token', async () => {
    const { app, prisma } = buildCheckpointApp()
    prisma.user.findUnique.mockResolvedValue({
      ...TOTP_USER,
      recoveryTokens: [],
    })

    const res = await testRequest(app, 'POST', '/auth/login/checkpoint', {
      confirmation_token: 'wrong-token',
      authentication_code: '123456',
    })

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.errors[0].detail).toContain('credentials do not match')
  })

  it('should reject when confirmation token is expired', async () => {
    const { app, prisma } = buildCheckpointApp({
      expiresAt: Date.now() - 1000,
    })
    prisma.user.findUnique.mockResolvedValue({
      ...TOTP_USER,
      recoveryTokens: [],
    })

    const res = await testRequest(app, 'POST', '/auth/login/checkpoint', {
      confirmation_token: 'mock-token-abc123',
      authentication_code: '123456',
    })

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.errors[0].detail).toContain('expired')
  })

  it('should reject when no session confirmation data exists', async () => {
    const ctx = createTestHono()
    const { app } = ctx

    app.onError(onError)
    app.post('/auth/login/checkpoint', loginCheckpoint)

    const res = await testRequest(app, 'POST', '/auth/login/checkpoint', {
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

    const res = await testRequest(app, 'POST', '/auth/login/checkpoint', {
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

    // The verifyPassword mock returns true when plain === 'correct-password'
    const res = await testRequest(app, 'POST', '/auth/login/checkpoint', {
      confirmation_token: 'mock-token-abc123',
      recovery_token: 'correct-password',
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.complete).toBe(true)

    // Should delete the used recovery token
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

    const res = await testRequest(app, 'POST', '/auth/login/checkpoint', {
      confirmation_token: 'mock-token-abc123',
      recovery_token: 'wrong-recovery-token',
    })

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.errors[0].detail).toContain('recovery token provided is not valid')
  })

  it('should reject when no authentication_code and no recovery_token given', async () => {
    const { app, prisma } = buildCheckpointApp()
    prisma.user.findUnique.mockResolvedValue({
      ...TOTP_USER,
      totpSecret: 'JBSWY3DPEHPK3PXP',
      recoveryTokens: [],
    })

    const res = await testRequest(app, 'POST', '/auth/login/checkpoint', {
      confirmation_token: 'mock-token-abc123',
    })

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.errors[0].detail).toContain('Two-factor authentication checkpoint failed')
  })
})

// ---------------------------------------------------------------------------
// 3. Logout
// ---------------------------------------------------------------------------

describe('POST /auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 204 with no body', async () => {
    const { app } = buildAuthApp()

    const res = await app.request('/auth/logout', { method: 'POST' }, MOCK_ENV)

    expect(res.status).toBe(204)
    const text = await res.text()
    expect(text).toBe('')
  })

  it('should clear the session cookie', async () => {
    const { app } = buildAuthApp()

    const res = await app.request('/auth/logout', { method: 'POST' }, MOCK_ENV)

    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('pyrotype_session')
  })

  it('should handle logout when no session cookie exists', async () => {
    const { app } = buildAuthApp()

    const res = await app.request('/auth/logout', { method: 'POST' }, MOCK_ENV)

    expect(res.status).toBe(204)
  })

  it('should call destroySession when a cookie is present', async () => {
    const { destroySession } = await import('../../src/services/auth/session')
    const { app } = buildAuthApp()

    const res = await app.request(
      '/auth/logout',
      {
        method: 'POST',
        headers: { Cookie: 'pyrotype_session=some-session-value' },
      },
      MOCK_ENV,
    )

    expect(res.status).toBe(204)
    expect(destroySession).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// 4. Forgot password
// ---------------------------------------------------------------------------

describe('POST /auth/password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return success message for a valid existing email', async () => {
    const { app, prisma } = buildAuthApp()
    prisma.user.findUnique.mockResolvedValue(MOCK_ADMIN)

    const res = await testRequest(app, 'POST', '/auth/password', {
      email: 'admin@pyrotype.local',
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toContain('e-mailed your password reset link')
  })

  it('should create a password reset record for existing user', async () => {
    const { app, prisma } = buildAuthApp()
    prisma.user.findUnique.mockResolvedValue(MOCK_ADMIN)

    await testRequest(app, 'POST', '/auth/password', {
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

  it('should send a password reset email for existing user', async () => {
    const { sendPasswordResetEmail } = await import('../../src/services/mail/mailer')
    const { app, prisma } = buildAuthApp()
    prisma.user.findUnique.mockResolvedValue(MOCK_ADMIN)

    await testRequest(app, 'POST', '/auth/password', {
      email: 'admin@pyrotype.local',
    })

    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      prisma,
      'admin@pyrotype.local',
      'mock-token-abc123',
    )
  })

  it('should return same success message for nonexistent email (no enumeration)', async () => {
    const { app, prisma } = buildAuthApp()
    prisma.user.findUnique.mockResolvedValue(null)

    const res = await testRequest(app, 'POST', '/auth/password', {
      email: 'nobody@nowhere.com',
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toContain('e-mailed your password reset link')
  })

  it('should not create a reset record for nonexistent email', async () => {
    const { app, prisma } = buildAuthApp()
    prisma.user.findUnique.mockResolvedValue(null)

    await testRequest(app, 'POST', '/auth/password', {
      email: 'nobody@nowhere.com',
    })

    expect(prisma.passwordReset.create).not.toHaveBeenCalled()
  })

  it('should return success even when email field is missing', async () => {
    const { app } = buildAuthApp()

    const res = await testRequest(app, 'POST', '/auth/password', {})

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toContain('e-mailed your password reset link')
  })
})

// ---------------------------------------------------------------------------
// 5. Reset password
// ---------------------------------------------------------------------------

describe('POST /auth/password/reset', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const validResetBody = {
    email: 'admin@pyrotype.local',
    token: 'valid-reset-token',
    password: 'newpassword123',
    passwordConfirmation: 'newpassword123',
  }

  it('should reset password with valid token and log user in', async () => {
    const { app, prisma } = buildAuthApp()
    const freshCreatedAt = new Date()
    prisma.passwordReset.findFirst.mockResolvedValue({
      id: 1,
      email: 'admin@pyrotype.local',
      token: 'valid-reset-token',
      createdAt: freshCreatedAt,
    })
    prisma.user.findUnique.mockResolvedValue(MOCK_ADMIN)

    const res = await testRequest(app, 'POST', '/auth/password/reset', validResetBody)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.redirect_to).toBe('/')
    expect(json.send_to_login).toBe(false)
  })

  it('should update the user password hash', async () => {
    const { app, prisma } = buildAuthApp()
    prisma.passwordReset.findFirst.mockResolvedValue({
      id: 1,
      email: 'admin@pyrotype.local',
      token: 'valid-reset-token',
      createdAt: new Date(),
    })
    prisma.user.findUnique.mockResolvedValue(MOCK_ADMIN)

    await testRequest(app, 'POST', '/auth/password/reset', validResetBody)

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: MOCK_ADMIN.id },
      data: { password: 'hashed:newpassword123' },
    })
  })

  it('should delete all reset tokens for the email after reset', async () => {
    const { app, prisma } = buildAuthApp()
    prisma.passwordReset.findFirst.mockResolvedValue({
      id: 1,
      email: 'admin@pyrotype.local',
      token: 'valid-reset-token',
      createdAt: new Date(),
    })
    prisma.user.findUnique.mockResolvedValue(MOCK_ADMIN)

    await testRequest(app, 'POST', '/auth/password/reset', validResetBody)

    expect(prisma.passwordReset.deleteMany).toHaveBeenCalledWith({
      where: { email: 'admin@pyrotype.local' },
    })
  })

  it('should set a session cookie for non-2FA user after reset', async () => {
    const { app, prisma } = buildAuthApp()
    prisma.passwordReset.findFirst.mockResolvedValue({
      id: 1,
      email: 'admin@pyrotype.local',
      token: 'valid-reset-token',
      createdAt: new Date(),
    })
    prisma.user.findUnique.mockResolvedValue(MOCK_ADMIN)

    const res = await testRequest(app, 'POST', '/auth/password/reset', validResetBody)

    expect(res.status).toBe(200)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('pyrotype_session')
  })

  it('should redirect 2FA user to login instead of auto-session', async () => {
    const { app, prisma } = buildAuthApp()
    prisma.passwordReset.findFirst.mockResolvedValue({
      id: 1,
      email: 'totp@pyrotype.local',
      token: 'valid-reset-token',
      createdAt: new Date(),
    })
    prisma.user.findUnique.mockResolvedValue(TOTP_USER)

    const res = await testRequest(app, 'POST', '/auth/password/reset', {
      ...validResetBody,
      email: 'totp@pyrotype.local',
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.send_to_login).toBe(true)
  })

  it('should return 422 for invalid token', async () => {
    const { app, prisma } = buildAuthApp()
    prisma.passwordReset.findFirst.mockResolvedValue(null)

    const res = await testRequest(app, 'POST', '/auth/password/reset', {
      ...validResetBody,
      token: 'bad-token',
    })

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.errors[0].detail).toContain('password reset token is invalid')
  })

  it('should return 422 for expired token (older than 1 hour)', async () => {
    const { app, prisma } = buildAuthApp()
    const expiredDate = new Date(Date.now() - 2 * 60 * 60 * 1000)
    prisma.passwordReset.findFirst.mockResolvedValue({
      id: 1,
      email: 'admin@pyrotype.local',
      token: 'valid-reset-token',
      createdAt: expiredDate,
    })

    const res = await testRequest(app, 'POST', '/auth/password/reset', validResetBody)

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.errors[0].detail).toContain('password reset token is invalid')
  })

  it('should clean up expired tokens', async () => {
    const { app, prisma } = buildAuthApp()
    const expiredDate = new Date(Date.now() - 2 * 60 * 60 * 1000)
    prisma.passwordReset.findFirst.mockResolvedValue({
      id: 1,
      email: 'admin@pyrotype.local',
      token: 'valid-reset-token',
      createdAt: expiredDate,
    })

    await testRequest(app, 'POST', '/auth/password/reset', validResetBody)

    expect(prisma.passwordReset.deleteMany).toHaveBeenCalledWith({
      where: { email: 'admin@pyrotype.local' },
    })
  })

  it('should return 422 when user does not exist for the email', async () => {
    const { app, prisma } = buildAuthApp()
    prisma.passwordReset.findFirst.mockResolvedValue({
      id: 1,
      email: 'admin@pyrotype.local',
      token: 'valid-reset-token',
      createdAt: new Date(),
    })
    prisma.user.findUnique.mockResolvedValue(null)

    const res = await testRequest(app, 'POST', '/auth/password/reset', validResetBody)

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.errors[0].detail).toContain('password reset token is invalid')
  })

  it('should return 422 when required fields are missing', async () => {
    const { app } = buildAuthApp()

    const res = await testRequest(app, 'POST', '/auth/password/reset', {
      email: 'admin@pyrotype.local',
    })

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.errors[0].detail).toContain('Missing required fields')
  })

  it('should return 422 when password confirmation does not match', async () => {
    const { app } = buildAuthApp()

    const res = await testRequest(app, 'POST', '/auth/password/reset', {
      email: 'admin@pyrotype.local',
      token: 'valid-reset-token',
      password: 'newpassword123',
      passwordConfirmation: 'different-password',
    })

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.errors[0].detail).toContain('password confirmation does not match')
  })

  it('should return 422 when password is too short', async () => {
    const { app } = buildAuthApp()

    const res = await testRequest(app, 'POST', '/auth/password/reset', {
      email: 'admin@pyrotype.local',
      token: 'valid-reset-token',
      password: 'short',
      passwordConfirmation: 'short',
    })

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.errors[0].detail).toContain('at least 8 characters')
  })
})
