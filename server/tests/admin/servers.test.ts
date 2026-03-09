import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createTestHono,
  createMockPrisma,
  jsonRequest,
  MOCK_ADMIN,
} from '../helpers/test-app'
import { onError } from '../../src/middleware/errorHandler'
import * as serverController from '../../src/controllers/admin/serverController'
import * as serverManagementController from '../../src/controllers/admin/serverManagementController'
import * as serverDetailsController from '../../src/controllers/admin/serverDetailsController'

vi.mock('../../src/utils/crypto', () => ({
  generateUuid: vi.fn().mockReturnValue('srv-uuid-abcd-1234-5678'),
}))

vi.mock('../../src/services/daemon/proxy', () => ({
  daemonRequest: vi.fn().mockResolvedValue({}),
  getDaemonBaseUrl: vi.fn().mockReturnValue('https://daemon.test:8080'),
  DaemonConnectionError: class DaemonConnectionError extends Error {
    constructor(msg?: string) {
      super(msg ?? 'Daemon connection error')
      this.name = 'DaemonConnectionError'
    }
  },
}))

const NOW = new Date('2025-06-01')

function makeMockServer(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    uuid: 'srv-uuid-abcd-1234-5678',
    uuidShort: 'srv-uuid',
    externalId: null,
    name: 'Test Server',
    description: 'A test server',
    status: null,
    ownerId: 1,
    nodeId: 1,
    allocationId: 10,
    nestId: 1,
    eggId: 1,
    startup: 'java -jar server.jar',
    image: 'ghcr.io/test:latest',
    memory: 1024,
    swap: 0,
    disk: 5120,
    io: 500,
    cpu: 100,
    threads: null,
    oomDisabled: true,
    databaseLimit: 2,
    allocationLimit: 5,
    backupLimit: 3,
    backupStorageLimit: null,
    installedAt: NOW,
    skipScripts: false,
    overheadMemory: 0,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

function makeMockNode(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    uuid: 'node-uuid-1',
    name: 'Test Node',
    fqdn: 'node.test.local',
    scheme: 'https',
    daemonListen: 8080,
    daemonToken: 'secret-token',
    daemonTokenId: 'token-id',
    ...overrides,
  }
}

describe('Admin Servers API (Hono-native)', () => {
  let prisma: ReturnType<typeof createMockPrisma>

  beforeEach(() => {
    vi.clearAllMocks()
    prisma = createMockPrisma()
  })

  function buildApp() {
    const ctx = createTestHono({ user: MOCK_ADMIN, prisma })
    ctx.app.onError(onError)
    // CRUD routes
    ctx.app.get('/servers', serverController.index)
    ctx.app.get('/servers/:id', serverController.view)
    ctx.app.post('/servers', serverController.store)
    ctx.app.delete('/servers/:id/:force', serverController.deleteServer)
    ctx.app.delete('/servers/:id', serverController.deleteServer)
    // Management routes
    ctx.app.post('/servers/:id/suspend', serverManagementController.suspend)
    ctx.app.post('/servers/:id/unsuspend', serverManagementController.unsuspend)
    ctx.app.post('/servers/:id/reinstall', serverManagementController.reinstall)
    // Details routes
    ctx.app.patch('/servers/:id/details', serverDetailsController.details)
    ctx.app.patch('/servers/:id/build', serverDetailsController.build)
    return ctx.app
  }

  // ── GET /servers (index) ────────────────────────────────────────────────

  describe('GET /servers', () => {
    it('should return 200 with paginated server list', async () => {
      const servers = [makeMockServer({ id: 1 }), makeMockServer({ id: 2, name: 'Server 2' })]
      prisma.server.findMany.mockResolvedValue(servers)
      prisma.server.count.mockResolvedValue(2)

      const app = buildApp()
      const res = await app.request('/servers')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.object).toBe('list')
      expect(body.data).toHaveLength(2)
      expect(body.meta.pagination.total).toBe(2)
    })

    it('should return correct server attribute shape', async () => {
      prisma.server.findMany.mockResolvedValue([makeMockServer()])
      prisma.server.count.mockResolvedValue(1)

      const app = buildApp()
      const res = await app.request('/servers')
      const body = await res.json()

      const attrs = body.data[0].attributes
      expect(body.data[0].object).toBe('server')
      expect(attrs).toHaveProperty('id')
      expect(attrs).toHaveProperty('uuid')
      expect(attrs).toHaveProperty('name')
      expect(attrs).toHaveProperty('status')
      expect(attrs).toHaveProperty('suspended')
      expect(attrs).toHaveProperty('limits')
      expect(attrs.limits).toHaveProperty('memory')
      expect(attrs.limits).toHaveProperty('disk')
      expect(attrs.limits).toHaveProperty('cpu')
      expect(attrs).toHaveProperty('feature_limits')
      expect(attrs).toHaveProperty('user')
      expect(attrs).toHaveProperty('node')
      expect(attrs).toHaveProperty('allocation')
      expect(attrs).toHaveProperty('container')
      expect(attrs.container).toHaveProperty('startup_command')
      expect(attrs.container).toHaveProperty('image')
    })

    it('should pass name filter to prisma', async () => {
      prisma.server.findMany.mockResolvedValue([])
      prisma.server.count.mockResolvedValue(0)

      const app = buildApp()
      await app.request('/servers?filter[name]=myserver')

      expect(prisma.server.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ name: { contains: 'myserver' } }),
        }),
      )
    })

    it('should pass uuid filter to prisma', async () => {
      prisma.server.findMany.mockResolvedValue([])
      prisma.server.count.mockResolvedValue(0)

      const app = buildApp()
      await app.request('/servers?filter[uuid]=abc')

      expect(prisma.server.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ uuid: { contains: 'abc' } }),
        }),
      )
    })

    it('should support pagination', async () => {
      prisma.server.findMany.mockResolvedValue([])
      prisma.server.count.mockResolvedValue(50)

      const app = buildApp()
      const res = await app.request('/servers?page=3&per_page=5')
      const body = await res.json()

      expect(body.meta.pagination.current_page).toBe(3)
      expect(body.meta.pagination.per_page).toBe(5)
      expect(prisma.server.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      )
    })

    it('should support descending sort by id', async () => {
      prisma.server.findMany.mockResolvedValue([])
      prisma.server.count.mockResolvedValue(0)

      const app = buildApp()
      await app.request('/servers?sort=-id')

      expect(prisma.server.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { id: 'desc' } }),
      )
    })

    it('should set suspended=true when status is suspended', async () => {
      prisma.server.findMany.mockResolvedValue([makeMockServer({ status: 'suspended' })])
      prisma.server.count.mockResolvedValue(1)

      const app = buildApp()
      const res = await app.request('/servers')
      const body = await res.json()

      expect(body.data[0].attributes.suspended).toBe(true)
    })
  })

  // ── GET /servers/:id (view) ─────────────────────────────────────────────

  describe('GET /servers/:id', () => {
    it('should return 200 with server details', async () => {
      const server = makeMockServer({ id: 5 })
      prisma.server.findUnique.mockResolvedValue(server)

      const app = buildApp()
      const res = await app.request('/servers/5')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.object).toBe('server')
      expect(body.attributes.id).toBe(5)
      expect(body.attributes.name).toBe('Test Server')
    })

    it('should return 404 for a non-existent server', async () => {
      prisma.server.findUnique.mockResolvedValue(null)

      const app = buildApp()
      const res = await app.request('/servers/999')
      const body = await res.json()

      expect(res.status).toBe(404)
      expect(body.errors[0].code).toBe('NotFoundError')
    })
  })

  // ── POST /servers (store) ──────────────────────────────────────────────

  describe('POST /servers', () => {
    it('should create a server and return 201', async () => {
      const created = makeMockServer({ id: 50, status: 'installing' })
      const node = makeMockNode()
      const allocation = { id: 10, ip: '127.0.0.1', port: 25565 }

      // Mock $transaction: just call the callback with prisma as tx
      prisma.$transaction = vi.fn().mockImplementation(async (cb: any) => {
        const tx = {
          server: { create: vi.fn().mockResolvedValue(created) },
          allocation: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
          eggVariable: { findMany: vi.fn().mockResolvedValue([]) },
          serverVariable: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        }
        return cb(tx)
      })
      // After transaction, findUnique for daemon call
      prisma.server.findUnique.mockResolvedValue({
        ...created,
        node,
        egg: { id: 1, forceOutgoingIp: false },
        allocation,
        allocations: [allocation],
      })
      prisma.serverVariable.findMany.mockResolvedValue([])

      const app = buildApp()
      const res = await jsonRequest(app, 'POST', '/servers', {
        name: 'New Server',
        owner_id: 1,
        node_id: 1,
        allocation_id: 10,
        nest_id: 1,
        egg_id: 1,
        startup: 'java -jar server.jar',
        image: 'ghcr.io/test:latest',
        memory: 1024,
        swap: 0,
        disk: 5120,
        io: 500,
        cpu: 100,
      })
      const body = await res.json()

      expect(res.status).toBe(201)
      expect(body.object).toBe('server')
      expect(body.attributes.id).toBe(50)
    })
  })

  // ── POST /servers/:id/suspend ──────────────────────────────────────────

  describe('POST /servers/:id/suspend', () => {
    it('should suspend a server and return 204', async () => {
      const server = makeMockServer({ id: 60 })
      prisma.server.findUnique
        .mockResolvedValueOnce(server) // initial lookup
        .mockResolvedValueOnce({ ...server, status: 'suspended', node: makeMockNode() }) // after update lookup
      prisma.server.update.mockResolvedValue({ ...server, status: 'suspended' })

      const app = buildApp()
      const res = await app.request('/servers/60', { method: 'POST' })

      // The route is /servers/:id/suspend
      const res2 = await app.request('/servers/60/suspend', { method: 'POST' })

      expect(res2.status).toBe(204)
      expect(prisma.server.update).toHaveBeenCalledWith({
        where: { id: 60 },
        data: { status: 'suspended' },
      })
    })

    it('should return 404 for non-existent server', async () => {
      prisma.server.findUnique.mockResolvedValue(null)

      const app = buildApp()
      const res = await app.request('/servers/999/suspend', { method: 'POST' })
      const body = await res.json()

      expect(res.status).toBe(404)
      expect(body.errors[0].code).toBe('NotFoundError')
    })
  })

  // ── POST /servers/:id/unsuspend ────────────────────────────────────────

  describe('POST /servers/:id/unsuspend', () => {
    it('should unsuspend a server and return 204', async () => {
      const server = makeMockServer({ id: 61, status: 'suspended' })
      prisma.server.findUnique
        .mockResolvedValueOnce(server)
        .mockResolvedValueOnce({ ...server, status: null, node: makeMockNode() })
      prisma.server.update.mockResolvedValue({ ...server, status: null })

      const app = buildApp()
      const res = await app.request('/servers/61/unsuspend', { method: 'POST' })

      expect(res.status).toBe(204)
      expect(prisma.server.update).toHaveBeenCalledWith({
        where: { id: 61 },
        data: { status: null },
      })
    })

    it('should return 404 for non-existent server', async () => {
      prisma.server.findUnique.mockResolvedValue(null)

      const app = buildApp()
      const res = await app.request('/servers/999/unsuspend', { method: 'POST' })
      const body = await res.json()

      expect(res.status).toBe(404)
      expect(body.errors[0].code).toBe('NotFoundError')
    })
  })

  // ── POST /servers/:id/reinstall ────────────────────────────────────────

  describe('POST /servers/:id/reinstall', () => {
    it('should trigger reinstall and return 204', async () => {
      const server = makeMockServer({ id: 62, node: makeMockNode() })
      prisma.server.findUnique.mockResolvedValue(server)
      prisma.server.update.mockResolvedValue({ ...server, status: 'installing' })

      const app = buildApp()
      const res = await app.request('/servers/62/reinstall', { method: 'POST' })

      expect(res.status).toBe(204)
      expect(prisma.server.update).toHaveBeenCalledWith({
        where: { id: 62 },
        data: { status: 'installing', installedAt: null },
      })
    })

    it('should return 404 for non-existent server', async () => {
      prisma.server.findUnique.mockResolvedValue(null)

      const app = buildApp()
      const res = await app.request('/servers/999/reinstall', { method: 'POST' })
      const body = await res.json()

      expect(res.status).toBe(404)
      expect(body.errors[0].code).toBe('NotFoundError')
    })
  })

  // ── PATCH /servers/:id/details ─────────────────────────────────────────

  describe('PATCH /servers/:id/details', () => {
    it('should update server details and return 200', async () => {
      const existing = makeMockServer({ id: 70 })
      const updated = makeMockServer({ id: 70, name: 'Updated Name', description: 'New desc' })
      prisma.server.findUnique.mockResolvedValue(existing)
      prisma.server.update.mockResolvedValue(updated)

      const app = buildApp()
      const res = await jsonRequest(app, 'PATCH', '/servers/70/details', {
        name: 'Updated Name',
        description: 'New desc',
      })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.object).toBe('server')
      expect(body.attributes.name).toBe('Updated Name')
      expect(body.attributes.description).toBe('New desc')
    })

    it('should return 404 when server does not exist', async () => {
      prisma.server.findUnique.mockResolvedValue(null)

      const app = buildApp()
      const res = await jsonRequest(app, 'PATCH', '/servers/999/details', { name: 'Ghost' })
      const body = await res.json()

      expect(res.status).toBe(404)
      expect(body.errors[0].code).toBe('NotFoundError')
    })

    it('should update owner_id', async () => {
      const existing = makeMockServer({ id: 71 })
      const updated = makeMockServer({ id: 71, ownerId: 5 })
      prisma.server.findUnique.mockResolvedValue(existing)
      prisma.server.update.mockResolvedValue(updated)

      const app = buildApp()
      const res = await jsonRequest(app, 'PATCH', '/servers/71/details', { owner_id: 5 })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(prisma.server.update).toHaveBeenCalledWith({
        where: { id: 71 },
        data: expect.objectContaining({ ownerId: 5 }),
      })
    })
  })

  // ── DELETE /servers/:id ────────────────────────────────────────────────

  describe('DELETE /servers/:id', () => {
    it('should delete a server and return 204', async () => {
      const server = makeMockServer({ id: 80 })
      prisma.server.findUnique
        .mockResolvedValueOnce(server) // first lookup
        .mockResolvedValueOnce({ ...server, node: makeMockNode() }) // lookup with node
      prisma.server.delete.mockResolvedValue({})

      const app = buildApp()
      const res = await app.request('/servers/80', { method: 'DELETE' })

      expect(res.status).toBe(204)
      expect(prisma.server.delete).toHaveBeenCalledWith({ where: { id: 80 } })
    })

    it('should return 404 for a non-existent server', async () => {
      prisma.server.findUnique.mockResolvedValue(null)

      const app = buildApp()
      const res = await app.request('/servers/999', { method: 'DELETE' })
      const body = await res.json()

      expect(res.status).toBe(404)
      expect(body.errors[0].code).toBe('NotFoundError')
    })

    it('should support force delete via path param', async () => {
      const server = makeMockServer({ id: 81 })
      prisma.server.findUnique
        .mockResolvedValueOnce(server)
        .mockResolvedValueOnce({ ...server, node: makeMockNode() })
      prisma.server.delete.mockResolvedValue({})

      // Mock daemonRequest to throw so we can test force path
      const { daemonRequest } = await import('../../src/services/daemon/proxy')
      ;(daemonRequest as any).mockRejectedValueOnce(new Error('Daemon down'))

      const app = buildApp()
      const res = await app.request('/servers/81/force', { method: 'DELETE' })

      expect(res.status).toBe(204)
      expect(prisma.server.delete).toHaveBeenCalledWith({ where: { id: 81 } })
    })

    it('should delete server without node gracefully', async () => {
      const server = makeMockServer({ id: 82 })
      prisma.server.findUnique
        .mockResolvedValueOnce(server)
        .mockResolvedValueOnce({ ...server, node: null })
      prisma.server.delete.mockResolvedValue({})

      const app = buildApp()
      const res = await app.request('/servers/82', { method: 'DELETE' })

      expect(res.status).toBe(204)
    })
  })
})
