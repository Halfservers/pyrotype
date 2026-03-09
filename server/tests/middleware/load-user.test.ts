import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { loadUser } from '../../src/middleware/loadUser'
import { onError } from '../../src/middleware/errorHandler'
import { createMockPrisma, createMockKV } from '../helpers/test-app'
import type { Env, HonoVariables } from '../../src/types/env'

type AppEnv = { Bindings: Env; Variables: HonoVariables }

// Mock the session service
vi.mock('../../src/services/auth/session', () => ({
  loadSession: vi.fn(),
}))

// Import after mock
import { loadSession } from '../../src/services/auth/session'
const mockLoadSession = vi.mocked(loadSession)

function buildApp(opts?: {
  prisma?: ReturnType<typeof createMockPrisma>
  kv?: ReturnType<typeof createMockKV>
}) {
  const prisma = opts?.prisma ?? createMockPrisma()
  const kv = opts?.kv ?? createMockKV()

  const app = new Hono<AppEnv>()

  // Set up bindings and variables
  app.use('*', async (c, next) => {
    // Inject bindings for loadUser (it reads c.env.SESSION_KV, c.env.APP_KEY)
    ;(c.env as any) = {
      SESSION_KV: kv,
      APP_KEY: 'test-app-key',
    }
    c.set('prisma', prisma as any)
    await next()
  })

  app.use('*', loadUser)

  app.get('/test', (c) => c.json({ ok: true, user: c.var.user ?? null }))
  app.onError(onError)

  return { app, prisma, kv }
}

describe('loadUser middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should load user into c.var.user when session cookie is valid', async () => {
    const prisma = createMockPrisma()
    const fakeUser = { id: 1, username: 'admin', rootAdmin: true, email: 'admin@test.com' }
    prisma.user.findUnique.mockResolvedValue(fakeUser)
    mockLoadSession.mockResolvedValue({
      sessionId: 'sess-123',
      data: { userId: 1 },
    })

    const { app } = buildApp({ prisma })

    const res = await app.request('/test', {
      headers: { Cookie: 'pyrotype_session=signed-cookie-value' },
    })

    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.user).toMatchObject({ id: 1, username: 'admin', rootAdmin: true })
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } })
  })

  it('should continue without user when no session cookie', async () => {
    const prisma = createMockPrisma()
    const { app } = buildApp({ prisma })

    const res = await app.request('/test')

    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.user).toBeNull()
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('should continue without user when session is invalid', async () => {
    mockLoadSession.mockResolvedValue(null)

    const prisma = createMockPrisma()
    const { app } = buildApp({ prisma })

    const res = await app.request('/test', {
      headers: { Cookie: 'pyrotype_session=invalid-cookie' },
    })

    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.user).toBeNull()
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('should continue without user when user not found in DB', async () => {
    const prisma = createMockPrisma()
    prisma.user.findUnique.mockResolvedValue(null)
    mockLoadSession.mockResolvedValue({
      sessionId: 'sess-456',
      data: { userId: 9999 },
    })

    const { app } = buildApp({ prisma })

    const res = await app.request('/test', {
      headers: { Cookie: 'pyrotype_session=signed-cookie' },
    })

    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.user).toBeNull()
  })

  it('should propagate errors thrown by prisma', async () => {
    const prisma = createMockPrisma()
    prisma.user.findUnique.mockRejectedValue(new Error('DB connection failed'))
    mockLoadSession.mockResolvedValue({
      sessionId: 'sess-789',
      data: { userId: 1 },
    })

    const { app } = buildApp({ prisma })

    const res = await app.request('/test', {
      headers: { Cookie: 'pyrotype_session=signed-cookie' },
    })

    expect(res.status).toBe(500)
    const body = await res.json() as any
    expect(body.errors[0].detail).toBe('An unexpected error occurred.')
  })
})
