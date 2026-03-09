import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createTestHono,
  createMockPrisma,
  jsonRequest,
  MOCK_ADMIN,
} from '../helpers/test-app'
import { onError } from '../../src/middleware/errorHandler'
import * as locationController from '../../src/controllers/admin/locationController'

function makeMockLocation(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    short: 'us-east',
    long: 'US East Coast',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }
}

describe('Admin Locations API (Hono-native)', () => {
  let prisma: ReturnType<typeof createMockPrisma>

  beforeEach(() => {
    vi.clearAllMocks()
    prisma = createMockPrisma()
  })

  function buildApp(user = MOCK_ADMIN) {
    const ctx = createTestHono({ user, prisma })
    ctx.app.onError(onError)
    ctx.app.get('/locations', locationController.index)
    ctx.app.get('/locations/:id', locationController.view)
    ctx.app.post('/locations', locationController.store)
    ctx.app.patch('/locations/:id', locationController.update)
    ctx.app.delete('/locations/:id', locationController.deleteLocation)
    return ctx.app
  }

  // ── GET /locations (index) ──────────────────────────────────────────

  describe('GET /locations', () => {
    it('should return paginated location list', async () => {
      const loc = makeMockLocation()
      prisma.location.findMany.mockResolvedValue([loc])
      prisma.location.count.mockResolvedValue(1)

      const app = buildApp()
      const res = await jsonRequest(app, 'GET', '/locations')

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.object).toBe('list')
      expect(Array.isArray(json.data)).toBe(true)
      expect(json.data).toHaveLength(1)
      expect(json.data[0].object).toBe('location')
      expect(json.data[0].attributes.short).toBe('us-east')
      expect(json.meta.pagination).toMatchObject({
        total: 1,
        per_page: 50,
        current_page: 1,
        total_pages: 1,
      })
    })

    it('should pass pagination params to prisma', async () => {
      prisma.location.findMany.mockResolvedValue([])
      prisma.location.count.mockResolvedValue(0)

      const app = buildApp()
      await jsonRequest(app, 'GET', '/locations?page=2&per_page=5')

      expect(prisma.location.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      )
    })

    it('should support filter[short]', async () => {
      prisma.location.findMany.mockResolvedValue([])
      prisma.location.count.mockResolvedValue(0)

      const app = buildApp()
      await jsonRequest(app, 'GET', '/locations?filter[short]=us')

      expect(prisma.location.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ short: { contains: 'us' } }),
        }),
      )
    })

    it('should return empty list when no locations exist', async () => {
      prisma.location.findMany.mockResolvedValue([])
      prisma.location.count.mockResolvedValue(0)

      const app = buildApp()
      const res = await jsonRequest(app, 'GET', '/locations')

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data).toEqual([])
      expect(json.meta.pagination.total).toBe(0)
    })
  })

  // ── GET /locations/:id (view) ───────────────────────────────────────

  describe('GET /locations/:id', () => {
    it('should return location details', async () => {
      const loc = makeMockLocation({ id: 5 })
      prisma.location.findUnique.mockResolvedValue(loc)

      const app = buildApp()
      const res = await jsonRequest(app, 'GET', '/locations/5')

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.object).toBe('location')
      expect(json.attributes.id).toBe(5)
      expect(json.attributes).toHaveProperty('short')
      expect(json.attributes).toHaveProperty('long')
      expect(json.attributes).toHaveProperty('created_at')
      expect(json.attributes).toHaveProperty('updated_at')
    })

    it('should return 404 for non-existent location', async () => {
      prisma.location.findUnique.mockResolvedValue(null)

      const app = buildApp()
      const res = await jsonRequest(app, 'GET', '/locations/999')

      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.errors[0].code).toBe('NotFoundError')
    })
  })

  // ── POST /locations (store) ─────────────────────────────────────────

  describe('POST /locations', () => {
    it('should create a location and return 201', async () => {
      const created = makeMockLocation({ id: 7, short: 'eu-west', long: 'EU West' })
      prisma.location.create.mockResolvedValue(created)

      const app = buildApp()
      const res = await jsonRequest(app, 'POST', '/locations', {
        short: 'eu-west',
        long: 'EU West',
      })

      expect(res.status).toBe(201)
      const json = await res.json()
      expect(json.object).toBe('location')
      expect(json.attributes.short).toBe('eu-west')
      expect(json.attributes.long).toBe('EU West')
      expect(json.meta.resource).toBe('/api/application/locations/7')
    })

    it('should pass null for missing long', async () => {
      const created = makeMockLocation({ id: 8, short: 'ap-south', long: null })
      prisma.location.create.mockResolvedValue(created)

      const app = buildApp()
      const res = await jsonRequest(app, 'POST', '/locations', { short: 'ap-south' })

      expect(res.status).toBe(201)
      expect(prisma.location.create).toHaveBeenCalledWith({
        data: { short: 'ap-south', long: null },
      })
    })
  })

  // ── PATCH /locations/:id (update) ───────────────────────────────────

  describe('PATCH /locations/:id', () => {
    it('should update location fields and return 200', async () => {
      const existing = makeMockLocation({ id: 3 })
      const updated = makeMockLocation({ id: 3, long: 'Updated' })
      prisma.location.findUnique.mockResolvedValue(existing)
      prisma.location.update.mockResolvedValue(updated)

      const app = buildApp()
      const res = await jsonRequest(app, 'PATCH', '/locations/3', { long: 'Updated' })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.object).toBe('location')
      expect(json.attributes.long).toBe('Updated')
    })

    it('should update short name', async () => {
      const existing = makeMockLocation({ id: 3 })
      const updated = makeMockLocation({ id: 3, short: 'new-short' })
      prisma.location.findUnique.mockResolvedValue(existing)
      prisma.location.update.mockResolvedValue(updated)

      const app = buildApp()
      const res = await jsonRequest(app, 'PATCH', '/locations/3', { short: 'new-short' })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.attributes.short).toBe('new-short')
    })

    it('should return 404 for non-existent location', async () => {
      prisma.location.findUnique.mockResolvedValue(null)

      const app = buildApp()
      const res = await jsonRequest(app, 'PATCH', '/locations/999', { long: 'Ghost' })

      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.errors[0].code).toBe('NotFoundError')
    })
  })

  // ── DELETE /locations/:id ───────────────────────────────────────────

  describe('DELETE /locations/:id', () => {
    it('should delete a location without nodes and return 204', async () => {
      prisma.location.findUnique.mockResolvedValue(
        makeMockLocation({ id: 4, nodes: [] }),
      )
      prisma.location.delete.mockResolvedValue({})

      const app = buildApp()
      const res = await jsonRequest(app, 'DELETE', '/locations/4')

      expect(res.status).toBe(204)
      expect(prisma.location.delete).toHaveBeenCalledWith({ where: { id: 4 } })
    })

    it('should return 404 for non-existent location', async () => {
      prisma.location.findUnique.mockResolvedValue(null)

      const app = buildApp()
      const res = await jsonRequest(app, 'DELETE', '/locations/999')

      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.errors[0].code).toBe('NotFoundError')
    })

    it('should return 409 when location has nodes attached', async () => {
      prisma.location.findUnique.mockResolvedValue(
        makeMockLocation({ id: 4, nodes: [{ id: 1 }] }),
      )

      const app = buildApp()
      const res = await jsonRequest(app, 'DELETE', '/locations/4')

      expect(res.status).toBe(409)
      const json = await res.json()
      expect(json.errors[0].code).toBe('ConflictError')
    })
  })
})
