import { Hono } from 'hono'
import { vi } from 'vitest'
import type { Env, HonoVariables } from '../../src/types/env'

type AppType = { Bindings: Env; Variables: HonoVariables }

/**
 * Create mock Prisma client with common model stubs.
 * Override specific methods per test.
 */
export function createMockPrisma() {
  const mockModel = () => ({
    findUnique: vi.fn().mockResolvedValue(null),
    findFirst: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockImplementation((args: any) => Promise.resolve({ id: 1, ...args.data })),
    update: vi.fn().mockImplementation((args: any) => Promise.resolve({ id: 1, ...args.data })),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    delete: vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    count: vi.fn().mockResolvedValue(0),
    upsert: vi.fn().mockImplementation((args: any) => Promise.resolve({ id: 1, ...args.create })),
  })

  return {
    user: mockModel(),
    server: mockModel(),
    node: mockModel(),
    egg: mockModel(),
    nest: mockModel(),
    location: mockModel(),
    allocation: mockModel(),
    backup: mockModel(),
    database: mockModel(),
    databaseHost: mockModel(),
    schedule: mockModel(),
    task: mockModel(),
    subuser: mockModel(),
    apiKey: mockModel(),
    userSSHKey: mockModel(),
    notification: mockModel(),
    activityLog: mockModel(),
    activityLogSubject: mockModel(),
    setting: mockModel(),
    session: mockModel(),
    serverSubdomain: mockModel(),
    domain: mockModel(),
    mount: mockModel(),
    mountEgg: mockModel(),
    mountNode: mockModel(),
    eggVariable: mockModel(),
    serverVariable: mockModel(),
    serverTransfer: mockModel(),
    recoveryToken: mockModel(),
    auditLog: mockModel(),
    elytraJob: mockModel(),
    serverOperation: mockModel(),
    passwordReset: mockModel(),
  } as any
}

/**
 * Create mock KV namespace.
 */
export function createMockKV() {
  const store = new Map<string, string>()
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => { store.set(key, value) }),
    delete: vi.fn(async (key: string) => { store.delete(key) }),
    list: vi.fn(async () => ({ keys: [], list_complete: true, cursor: '' })),
    _store: store,
  } as any
}

/**
 * Create mock Queue.
 */
export function createMockQueue() {
  return {
    send: vi.fn().mockResolvedValue(undefined),
    sendBatch: vi.fn().mockResolvedValue(undefined),
  } as any
}

/**
 * Mock admin user object.
 */
export const MOCK_ADMIN = {
  id: 1,
  uuid: 'test-admin-uuid',
  username: 'admin',
  email: 'admin@pyrotype.local',
  nameFirst: 'Admin',
  nameLast: 'User',
  password: '$2a$10$fakehash',
  rootAdmin: true,
  useTotp: false,
  language: 'en',
  gravatar: false,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
}

/**
 * Mock regular user object.
 */
export const MOCK_USER = {
  ...MOCK_ADMIN,
  id: 2,
  uuid: 'test-user-uuid',
  username: 'testuser',
  email: 'user@pyrotype.local',
  rootAdmin: false,
}

/**
 * Create a Hono app with mock bindings + middleware that sets vars.
 * The returned app has prisma, kv, queue pre-set on every request.
 * Pass `user` to simulate an authenticated request.
 */
export function createTestHono(opts?: {
  user?: typeof MOCK_ADMIN | null
  prisma?: ReturnType<typeof createMockPrisma>
  kv?: ReturnType<typeof createMockKV>
  queue?: ReturnType<typeof createMockQueue>
}) {
  const prisma = opts?.prisma ?? createMockPrisma()
  const kv = opts?.kv ?? createMockKV()
  const queue = opts?.queue ?? createMockQueue()

  const app = new Hono<AppType>()

  // Inject mocks into context
  app.use('*', async (c, next) => {
    c.set('prisma', prisma as any)
    c.set('kv', kv as any)
    c.set('queue', queue as any)
    if (opts?.user !== null && opts?.user !== undefined) {
      c.set('user', opts.user as any)
    }
    await next()
  })

  return { app, prisma, kv, queue }
}

/**
 * Helper to make a JSON request to a Hono app.
 */
export async function jsonRequest(
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
  return app.request(path, init)
}
