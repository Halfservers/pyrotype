import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createTestHono,
  createMockPrisma,
  jsonRequest,
  MOCK_ADMIN,
  MOCK_USER,
} from '../helpers/test-app'
import { onError } from '../../src/middleware/errorHandler'
import * as userController from '../../src/controllers/admin/userController'

vi.mock('../../src/utils/crypto', () => ({
  hashPassword: vi.fn().mockResolvedValue('$2a$10$hashedpassword'),
  generateUuid: vi.fn().mockReturnValue('generated-uuid-1234'),
  generateToken: vi.fn().mockReturnValue('reset-token-abcdef'),
}))

vi.mock('../../src/services/mail/mailer', () => ({
  sendAccountCreatedEmail: vi.fn().mockResolvedValue(undefined),
}))

function makeMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    uuid: 'user-uuid-10',
    externalId: null,
    username: 'testuser10',
    email: 'test10@pyrotype.local',
    nameFirst: 'Test',
    nameLast: 'User',
    password: '$2a$10$fakehash',
    rootAdmin: false,
    useTotp: false,
    language: 'en',
    gravatar: false,
    createdAt: new Date('2025-06-01'),
    updatedAt: new Date('2025-06-01'),
    ...overrides,
  }
}

describe('Admin Users API (Hono-native)', () => {
  let prisma: ReturnType<typeof createMockPrisma>

  beforeEach(() => {
    vi.clearAllMocks()
    prisma = createMockPrisma()
  })

  function buildApp(user: typeof MOCK_ADMIN | typeof MOCK_USER | null = MOCK_ADMIN) {
    const ctx = createTestHono({ user, prisma })
    ctx.app.onError(onError)
    ctx.app.get('/users', userController.index)
    ctx.app.get('/users/:id', userController.view)
    ctx.app.post('/users', userController.store)
    ctx.app.patch('/users/:id', userController.update)
    ctx.app.delete('/users/:id', userController.deleteUser)
    return ctx.app
  }

  // ── GET /users (index) ──────────────────────────────────────────────────

  describe('GET /users', () => {
    it('should return 200 with paginated user list', async () => {
      const users = [makeMockUser({ id: 1 }), makeMockUser({ id: 2, username: 'user2' })]
      prisma.user.findMany.mockResolvedValue(users)
      prisma.user.count.mockResolvedValue(2)

      const app = buildApp()
      const res = await app.request('/users')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.object).toBe('list')
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.data).toHaveLength(2)
      expect(body.meta.pagination).toBeDefined()
      expect(body.meta.pagination.total).toBe(2)
      expect(body.meta.pagination.current_page).toBe(1)
    })

    it('should pass email filter to prisma where clause', async () => {
      prisma.user.findMany.mockResolvedValue([])
      prisma.user.count.mockResolvedValue(0)

      const app = buildApp()
      await app.request('/users?filter[email]=admin@test')

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ email: { contains: 'admin@test' } }),
        }),
      )
    })

    it('should pass username filter to prisma where clause', async () => {
      prisma.user.findMany.mockResolvedValue([])
      prisma.user.count.mockResolvedValue(0)

      const app = buildApp()
      await app.request('/users?filter[username]=jdoe')

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ username: { contains: 'jdoe' } }),
        }),
      )
    })

    it('should combine email and username filters with OR', async () => {
      prisma.user.findMany.mockResolvedValue([])
      prisma.user.count.mockResolvedValue(0)

      const app = buildApp()
      await app.request('/users?filter[email]=a@b&filter[username]=jdoe')

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { email: { contains: 'a@b' } },
              { username: { contains: 'jdoe' } },
            ],
          }),
        }),
      )
    })

    it('should support pagination query params', async () => {
      prisma.user.findMany.mockResolvedValue([])
      prisma.user.count.mockResolvedValue(0)

      const app = buildApp()
      const res = await app.request('/users?page=2&per_page=10')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.meta.pagination.current_page).toBe(2)
      expect(body.meta.pagination.per_page).toBe(10)
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      )
    })

    it('should support descending sort by id', async () => {
      prisma.user.findMany.mockResolvedValue([])
      prisma.user.count.mockResolvedValue(0)

      const app = buildApp()
      await app.request('/users?sort=-id')

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { id: 'desc' } }),
      )
    })

    it('should default sort to id ascending', async () => {
      prisma.user.findMany.mockResolvedValue([])
      prisma.user.count.mockResolvedValue(0)

      const app = buildApp()
      await app.request('/users')

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { id: 'asc' } }),
      )
    })

    it('should return correct user attribute shape', async () => {
      prisma.user.findMany.mockResolvedValue([makeMockUser()])
      prisma.user.count.mockResolvedValue(1)

      const app = buildApp()
      const res = await app.request('/users')
      const body = await res.json()

      const attrs = body.data[0].attributes
      expect(attrs).toHaveProperty('id')
      expect(attrs).toHaveProperty('uuid')
      expect(attrs).toHaveProperty('username')
      expect(attrs).toHaveProperty('email')
      expect(attrs).toHaveProperty('first_name')
      expect(attrs).toHaveProperty('last_name')
      expect(attrs).toHaveProperty('language')
      expect(attrs).toHaveProperty('root_admin')
      expect(attrs).toHaveProperty('2fa_enabled')
      expect(attrs).toHaveProperty('created_at')
      expect(attrs).toHaveProperty('updated_at')
      expect(body.data[0].object).toBe('user')
    })
  })

  // ── GET /users/:id (view) ───────────────────────────────────────────────

  describe('GET /users/:id', () => {
    it('should return 200 with user details for a valid id', async () => {
      const user = makeMockUser({ id: 5 })
      prisma.user.findUnique.mockResolvedValue(user)

      const app = buildApp()
      const res = await app.request('/users/5')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.object).toBe('user')
      expect(body.attributes.id).toBe(5)
      expect(body.attributes.username).toBe('testuser10')
    })

    it('should return 404 for a non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null)

      const app = buildApp()
      const res = await app.request('/users/999')
      const body = await res.json()

      expect(res.status).toBe(404)
      expect(body.errors).toBeDefined()
      expect(body.errors[0].code).toBe('NotFoundError')
    })
  })

  // ── POST /users (store) ─────────────────────────────────────────────────

  describe('POST /users', () => {
    it('should create a user with valid data and return 201', async () => {
      const createdUser = makeMockUser({
        id: 20,
        uuid: 'generated-uuid-1234',
        username: 'newuser',
        email: 'newuser@test.local',
        nameFirst: 'New',
        nameLast: 'User',
      })
      prisma.user.create.mockResolvedValue(createdUser)

      const app = buildApp()
      const res = await jsonRequest(app, 'POST', '/users', {
        username: 'newuser',
        email: 'newuser@test.local',
        name_first: 'New',
        name_last: 'User',
        password: 'SecurePass123!',
        root_admin: false,
      })
      const body = await res.json()

      expect(res.status).toBe(201)
      expect(body.object).toBe('user')
      expect(body.attributes.username).toBe('newuser')
      expect(body.attributes.email).toBe('newuser@test.local')
      expect(body.attributes.first_name).toBe('New')
      expect(body.meta.resource).toContain('/api/application/users/20')
    })

    it('should create password reset token when no password provided', async () => {
      const createdUser = makeMockUser({ id: 21, email: 'nopass@test.local' })
      prisma.user.create.mockResolvedValue(createdUser)
      prisma.passwordReset.create.mockResolvedValue({})

      const app = buildApp()
      const res = await jsonRequest(app, 'POST', '/users', {
        username: 'nopassuser',
        email: 'nopass@test.local',
        name_first: 'NoPass',
      })

      expect(res.status).toBe(201)
      expect(prisma.passwordReset.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'nopass@test.local',
            token: 'reset-token-abcdef',
          }),
        }),
      )
    })

    it('should not create password reset when password is provided', async () => {
      const createdUser = makeMockUser({ id: 22 })
      prisma.user.create.mockResolvedValue(createdUser)

      const app = buildApp()
      await jsonRequest(app, 'POST', '/users', {
        username: 'withpass',
        email: 'withpass@test.local',
        name_first: 'WithPass',
        password: 'MyPassword123',
      })

      expect(prisma.passwordReset.create).not.toHaveBeenCalled()
    })

    it('should pass correct data shape to prisma create', async () => {
      const createdUser = makeMockUser({ id: 23 })
      prisma.user.create.mockResolvedValue(createdUser)

      const app = buildApp()
      await jsonRequest(app, 'POST', '/users', {
        external_id: 'ext-123',
        username: 'shaped',
        email: 'shaped@test.local',
        name_first: 'Shaped',
        name_last: 'User',
        password: 'GoodPassword1',
        root_admin: true,
        language: 'de',
      })

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          uuid: 'generated-uuid-1234',
          externalId: 'ext-123',
          username: 'shaped',
          email: 'shaped@test.local',
          nameFirst: 'Shaped',
          nameLast: 'User',
          rootAdmin: true,
          language: 'de',
        }),
      })
    })
  })

  // ── PATCH /users/:id (update) ───────────────────────────────────────────

  describe('PATCH /users/:id', () => {
    it('should update user fields and return 200', async () => {
      const existing = makeMockUser({ id: 30 })
      const updated = makeMockUser({ id: 30, nameFirst: 'Updated', language: 'de' })
      prisma.user.findUnique.mockResolvedValue(existing)
      prisma.user.update.mockResolvedValue(updated)

      const app = buildApp()
      const res = await jsonRequest(app, 'PATCH', '/users/30', {
        name_first: 'Updated',
        language: 'de',
      })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.object).toBe('user')
      expect(body.attributes.first_name).toBe('Updated')
      expect(body.attributes.language).toBe('de')
    })

    it('should update root_admin status', async () => {
      const existing = makeMockUser({ id: 31, rootAdmin: false })
      const updated = makeMockUser({ id: 31, rootAdmin: true })
      prisma.user.findUnique.mockResolvedValue(existing)
      prisma.user.update.mockResolvedValue(updated)

      const app = buildApp()
      const res = await jsonRequest(app, 'PATCH', '/users/31', { root_admin: true })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.attributes.root_admin).toBe(true)
    })

    it('should return 404 when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null)

      const app = buildApp()
      const res = await jsonRequest(app, 'PATCH', '/users/999', { name_first: 'Ghost' })
      const body = await res.json()

      expect(res.status).toBe(404)
      expect(body.errors[0].code).toBe('NotFoundError')
    })

    it('should only update provided fields', async () => {
      const existing = makeMockUser({ id: 32 })
      prisma.user.findUnique.mockResolvedValue(existing)
      prisma.user.update.mockResolvedValue(existing)

      const app = buildApp()
      await jsonRequest(app, 'PATCH', '/users/32', { username: 'onlythis' })

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 32 },
        data: { username: 'onlythis' },
      })
    })
  })

  // ── DELETE /users/:id ───────────────────────────────────────────────────

  describe('DELETE /users/:id', () => {
    it('should delete a user without servers and return 204', async () => {
      const user = { ...makeMockUser({ id: 40 }), servers: [] }
      prisma.user.findUnique.mockResolvedValue(user)
      prisma.user.delete.mockResolvedValue({})

      const app = buildApp()
      const res = await app.request('/users/40', { method: 'DELETE' })

      expect(res.status).toBe(204)
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 40 } })
    })

    it('should return 409 when user has active servers', async () => {
      const user = { ...makeMockUser({ id: 41 }), servers: [{ id: 100 }] }
      prisma.user.findUnique.mockResolvedValue(user)

      const app = buildApp()
      const res = await app.request('/users/41', { method: 'DELETE' })
      const body = await res.json()

      expect(res.status).toBe(409)
      expect(body.errors[0].code).toBe('ConflictError')
      expect(body.errors[0].detail).toContain('active servers')
      expect(prisma.user.delete).not.toHaveBeenCalled()
    })

    it('should return 404 when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null)

      const app = buildApp()
      const res = await app.request('/users/999', { method: 'DELETE' })
      const body = await res.json()

      expect(res.status).toBe(404)
      expect(body.errors[0].code).toBe('NotFoundError')
    })
  })

  // ── Non-admin access ────────────────────────────────────────────────────

  describe('Non-admin access denied', () => {
    it('should deny access when user is not root admin and no API key', async () => {
      const ctx = createTestHono({ user: MOCK_USER, prisma })
      ctx.app.onError(onError)
      // Simulate the admin middleware check
      ctx.app.use('*', async (c, next) => {
        const user = c.var.user
        if (!user?.rootAdmin) {
          // The actual middleware checks for Bearer header next,
          // but without one it throws ForbiddenError
          const { ForbiddenError } = await import('../../src/utils/errors')
          throw new ForbiddenError('Admin access required')
        }
        await next()
      })
      ctx.app.get('/users', userController.index)

      const res = await ctx.app.request('/users')
      const body = await res.json()

      expect(res.status).toBe(403)
      expect(body.errors[0].code).toBe('ForbiddenError')
    })

    it('should deny access when no user is set and no API key', async () => {
      const ctx = createTestHono({ user: null, prisma })
      ctx.app.onError(onError)
      ctx.app.use('*', async (c, next) => {
        const user = c.var.user
        if (!user) {
          const { AuthenticationError } = await import('../../src/utils/errors')
          throw new AuthenticationError('Authentication required')
        }
        if (!user.rootAdmin) {
          const { ForbiddenError } = await import('../../src/utils/errors')
          throw new ForbiddenError('Admin access required')
        }
        await next()
      })
      ctx.app.get('/users', userController.index)

      const res = await ctx.app.request('/users')
      const body = await res.json()

      expect(res.status).toBe(401)
      expect(body.errors[0].code).toBe('AuthenticationError')
    })
  })
})
