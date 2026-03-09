import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createTestHono,
  createMockPrisma,
  jsonRequest,
  MOCK_ADMIN,
} from '../helpers/test-app'
import { onError } from '../../src/middleware/errorHandler'
import * as nestController from '../../src/controllers/admin/nestController'

vi.mock('../../src/utils/crypto', () => ({
  generateUuid: vi.fn().mockReturnValue('mock-uuid-1234'),
}))

function makeMockNest(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    uuid: 'nest-uuid-1',
    author: 'admin@pyrotype.local',
    name: 'Minecraft',
    description: 'Minecraft nest',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }
}

describe('Admin Nests API (Hono-native)', () => {
  let prisma: ReturnType<typeof createMockPrisma>

  beforeEach(() => {
    vi.clearAllMocks()
    prisma = createMockPrisma()
  })

  function buildApp(user = MOCK_ADMIN) {
    const ctx = createTestHono({ user, prisma })
    ctx.app.onError(onError)
    ctx.app.get('/nests', nestController.index)
    ctx.app.get('/nests/:id', nestController.view)
    ctx.app.post('/nests', nestController.store)
    ctx.app.patch('/nests/:id', nestController.update)
    ctx.app.delete('/nests/:id', nestController.deleteNest)
    return ctx.app
  }

  // ── GET /nests (index) ──────────────────────────────────────────────

  describe('GET /nests', () => {
    it('should return paginated nest list', async () => {
      const nest = makeMockNest()
      prisma.nest.findMany.mockResolvedValue([nest])
      prisma.nest.count.mockResolvedValue(1)

      const app = buildApp()
      const res = await jsonRequest(app, 'GET', '/nests')

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.object).toBe('list')
      expect(Array.isArray(json.data)).toBe(true)
      expect(json.data).toHaveLength(1)
      expect(json.data[0].object).toBe('nest')
      expect(json.data[0].attributes.name).toBe('Minecraft')
      expect(json.meta.pagination).toMatchObject({
        total: 1,
        per_page: 50,
        current_page: 1,
        total_pages: 1,
      })
    })

    it('should return nests with correct attributes', async () => {
      const nest = makeMockNest()
      prisma.nest.findMany.mockResolvedValue([nest])
      prisma.nest.count.mockResolvedValue(1)

      const app = buildApp()
      const res = await jsonRequest(app, 'GET', '/nests')
      const json = await res.json()

      const attrs = json.data[0].attributes
      expect(attrs).toHaveProperty('id')
      expect(attrs).toHaveProperty('uuid')
      expect(attrs).toHaveProperty('author')
      expect(attrs).toHaveProperty('name')
      expect(attrs).toHaveProperty('description')
      expect(attrs).toHaveProperty('created_at')
      expect(attrs).toHaveProperty('updated_at')
    })

    it('should pass pagination params to prisma', async () => {
      prisma.nest.findMany.mockResolvedValue([])
      prisma.nest.count.mockResolvedValue(0)

      const app = buildApp()
      await jsonRequest(app, 'GET', '/nests?page=2&per_page=5')

      expect(prisma.nest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      )
    })

    it('should return empty list when no nests exist', async () => {
      prisma.nest.findMany.mockResolvedValue([])
      prisma.nest.count.mockResolvedValue(0)

      const app = buildApp()
      const res = await jsonRequest(app, 'GET', '/nests')

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data).toEqual([])
      expect(json.meta.pagination.total).toBe(0)
    })
  })

  // ── GET /nests/:id (view) ───────────────────────────────────────────

  describe('GET /nests/:id', () => {
    it('should return nest details', async () => {
      const nest = makeMockNest({ id: 5 })
      prisma.nest.findUnique.mockResolvedValue(nest)

      const app = buildApp()
      const res = await jsonRequest(app, 'GET', '/nests/5')

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.object).toBe('nest')
      expect(json.attributes.id).toBe(5)
      expect(json.attributes).toHaveProperty('uuid')
      expect(json.attributes).toHaveProperty('author')
      expect(json.attributes).toHaveProperty('name')
    })

    it('should return 404 for non-existent nest', async () => {
      prisma.nest.findUnique.mockResolvedValue(null)

      const app = buildApp()
      const res = await jsonRequest(app, 'GET', '/nests/999')

      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.errors[0].code).toBe('NotFoundError')
    })
  })

  // ── POST /nests (store) ─────────────────────────────────────────────

  describe('POST /nests', () => {
    it('should create a nest and return 201', async () => {
      const created = makeMockNest({
        id: 7,
        uuid: 'mock-uuid-1234',
        name: 'Rust Games',
        description: 'Rust game servers',
      })
      prisma.nest.create.mockResolvedValue(created)

      const app = buildApp()
      const res = await jsonRequest(app, 'POST', '/nests', {
        name: 'Rust Games',
        description: 'Rust game servers',
      })

      expect(res.status).toBe(201)
      const json = await res.json()
      expect(json.object).toBe('nest')
      expect(json.attributes.name).toBe('Rust Games')
      expect(json.attributes.description).toBe('Rust game servers')
    })

    it('should pass null for missing description', async () => {
      const created = makeMockNest({ id: 8, name: 'Source', description: null })
      prisma.nest.create.mockResolvedValue(created)

      const app = buildApp()
      await jsonRequest(app, 'POST', '/nests', { name: 'Source' })

      expect(prisma.nest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          uuid: 'mock-uuid-1234',
          author: 'custom@local',
          name: 'Source',
          description: null,
        }),
      })
    })
  })

  // ── PATCH /nests/:id (update) ───────────────────────────────────────

  describe('PATCH /nests/:id', () => {
    it('should update nest fields and return 200', async () => {
      const existing = makeMockNest({ id: 3 })
      const updated = makeMockNest({ id: 3, name: 'Updated Nest' })
      prisma.nest.findUnique.mockResolvedValue(existing)
      prisma.nest.update.mockResolvedValue(updated)

      const app = buildApp()
      const res = await jsonRequest(app, 'PATCH', '/nests/3', { name: 'Updated Nest' })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.object).toBe('nest')
      expect(json.attributes.name).toBe('Updated Nest')
    })

    it('should update description', async () => {
      const existing = makeMockNest({ id: 3 })
      const updated = makeMockNest({ id: 3, description: 'New desc' })
      prisma.nest.findUnique.mockResolvedValue(existing)
      prisma.nest.update.mockResolvedValue(updated)

      const app = buildApp()
      const res = await jsonRequest(app, 'PATCH', '/nests/3', { description: 'New desc' })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.attributes.description).toBe('New desc')
    })

    it('should return 404 for non-existent nest', async () => {
      prisma.nest.findUnique.mockResolvedValue(null)

      const app = buildApp()
      const res = await jsonRequest(app, 'PATCH', '/nests/999', { name: 'Ghost' })

      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.errors[0].code).toBe('NotFoundError')
    })
  })

  // ── DELETE /nests/:id ───────────────────────────────────────────────

  describe('DELETE /nests/:id', () => {
    it('should delete a nest without eggs or servers and return 204', async () => {
      prisma.nest.findUnique.mockResolvedValue(
        makeMockNest({ id: 4, eggs: [] }),
      )
      prisma.server.count.mockResolvedValue(0)
      prisma.nest.delete.mockResolvedValue({})

      const app = buildApp()
      const res = await jsonRequest(app, 'DELETE', '/nests/4')

      expect(res.status).toBe(204)
      expect(prisma.nest.delete).toHaveBeenCalledWith({ where: { id: 4 } })
    })

    it('should return 404 for non-existent nest', async () => {
      prisma.nest.findUnique.mockResolvedValue(null)

      const app = buildApp()
      const res = await jsonRequest(app, 'DELETE', '/nests/999')

      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.errors[0].code).toBe('NotFoundError')
    })

    it('should return 409 when nest has eggs', async () => {
      prisma.nest.findUnique.mockResolvedValue(
        makeMockNest({ id: 4, eggs: [{ id: 1 }] }),
      )

      const app = buildApp()
      const res = await jsonRequest(app, 'DELETE', '/nests/4')

      expect(res.status).toBe(409)
      const json = await res.json()
      expect(json.errors[0].code).toBe('ConflictError')
    })

    it('should return 409 when nest has active servers', async () => {
      prisma.nest.findUnique.mockResolvedValue(
        makeMockNest({ id: 4, eggs: [] }),
      )
      prisma.server.count.mockResolvedValue(3)

      const app = buildApp()
      const res = await jsonRequest(app, 'DELETE', '/nests/4')

      expect(res.status).toBe(409)
      const json = await res.json()
      expect(json.errors[0].code).toBe('ConflictError')
    })
  })
})
