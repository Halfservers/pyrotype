import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createTestHono,
  createMockPrisma,
  jsonRequest,
  MOCK_ADMIN,
} from '../helpers/test-app'
import { onError } from '../../src/middleware/errorHandler'
import * as nodeController from '../../src/controllers/admin/nodeController'

vi.mock('../../src/utils/crypto', () => ({
  generateUuid: vi.fn().mockReturnValue('node-uuid-generated-1234'),
}))

vi.mock('../../src/services/daemon/proxy', () => ({
  daemonRequest: vi.fn().mockResolvedValue({}),
  DaemonConnectionError: class DaemonConnectionError extends Error {
    constructor(msg?: string) {
      super(msg ?? 'Daemon connection error')
      this.name = 'DaemonConnectionError'
    }
  },
}))

const NOW = new Date('2025-06-01')

function makeMockNode(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    uuid: 'node-uuid-generated-1234',
    public: true,
    name: 'Test Node',
    description: 'A test node',
    locationId: 1,
    fqdn: 'node.test.local',
    internalFqdn: null,
    useSeparateFqdns: false,
    scheme: 'https',
    behindProxy: false,
    maintenanceMode: false,
    memory: 32768,
    memoryOverallocate: 0,
    disk: 1048576,
    diskOverallocate: 0,
    uploadSize: 100,
    daemonListen: 8080,
    daemonSFTP: 2022,
    daemonBase: '/var/lib/pterodactyl/volumes',
    daemonType: 'elytra',
    backupDisk: 'local',
    daemonTokenId: 'abcdef0123456789',
    daemonToken: 'secret-daemon-token-hex',
    trustAlias: false,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

describe('Admin Nodes API (Hono-native)', () => {
  let prisma: ReturnType<typeof createMockPrisma>

  beforeEach(() => {
    vi.clearAllMocks()
    prisma = createMockPrisma()
  })

  function buildApp() {
    const ctx = createTestHono({ user: MOCK_ADMIN, prisma })
    ctx.app.onError(onError)
    ctx.app.get('/nodes', nodeController.index)
    ctx.app.get('/nodes/:id', nodeController.view)
    ctx.app.post('/nodes', nodeController.store)
    ctx.app.patch('/nodes/:id', nodeController.update)
    ctx.app.delete('/nodes/:id', nodeController.deleteNode)
    return ctx.app
  }

  // ── GET /nodes (index) ──────────────────────────────────────────────────

  describe('GET /nodes', () => {
    it('should return 200 with paginated node list', async () => {
      const nodes = [makeMockNode({ id: 1 }), makeMockNode({ id: 2, name: 'Node 2' })]
      prisma.node.findMany.mockResolvedValue(nodes)
      prisma.node.count.mockResolvedValue(2)

      const app = buildApp()
      const res = await app.request('/nodes')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.object).toBe('list')
      expect(body.data).toHaveLength(2)
      expect(body.meta.pagination.total).toBe(2)
      expect(body.meta.pagination.current_page).toBe(1)
    })

    it('should return correct node attribute shape', async () => {
      prisma.node.findMany.mockResolvedValue([makeMockNode()])
      prisma.node.count.mockResolvedValue(1)

      const app = buildApp()
      const res = await app.request('/nodes')
      const body = await res.json()

      const attrs = body.data[0].attributes
      expect(body.data[0].object).toBe('node')
      expect(attrs).toHaveProperty('id')
      expect(attrs).toHaveProperty('uuid')
      expect(attrs).toHaveProperty('public')
      expect(attrs).toHaveProperty('name')
      expect(attrs).toHaveProperty('description')
      expect(attrs).toHaveProperty('location_id')
      expect(attrs).toHaveProperty('fqdn')
      expect(attrs).toHaveProperty('scheme')
      expect(attrs).toHaveProperty('behind_proxy')
      expect(attrs).toHaveProperty('maintenance_mode')
      expect(attrs).toHaveProperty('memory')
      expect(attrs).toHaveProperty('memory_overallocate')
      expect(attrs).toHaveProperty('disk')
      expect(attrs).toHaveProperty('disk_overallocate')
      expect(attrs).toHaveProperty('upload_size')
      expect(attrs).toHaveProperty('daemon_listen')
      expect(attrs).toHaveProperty('daemon_sftp')
      expect(attrs).toHaveProperty('daemon_base')
      expect(attrs).toHaveProperty('daemon_type')
      expect(attrs).toHaveProperty('backup_disk')
      expect(attrs).toHaveProperty('created_at')
      expect(attrs).toHaveProperty('updated_at')
    })

    it('should pass name filter to prisma', async () => {
      prisma.node.findMany.mockResolvedValue([])
      prisma.node.count.mockResolvedValue(0)

      const app = buildApp()
      await app.request('/nodes?filter[name]=production')

      expect(prisma.node.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ name: { contains: 'production' } }),
        }),
      )
    })

    it('should pass fqdn filter to prisma', async () => {
      prisma.node.findMany.mockResolvedValue([])
      prisma.node.count.mockResolvedValue(0)

      const app = buildApp()
      await app.request('/nodes?filter[fqdn]=test.local')

      expect(prisma.node.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ fqdn: { contains: 'test.local' } }),
        }),
      )
    })

    it('should pass uuid filter to prisma', async () => {
      prisma.node.findMany.mockResolvedValue([])
      prisma.node.count.mockResolvedValue(0)

      const app = buildApp()
      await app.request('/nodes?filter[uuid]=abc123')

      expect(prisma.node.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ uuid: { contains: 'abc123' } }),
        }),
      )
    })

    it('should support pagination', async () => {
      prisma.node.findMany.mockResolvedValue([])
      prisma.node.count.mockResolvedValue(100)

      const app = buildApp()
      const res = await app.request('/nodes?page=2&per_page=25')
      const body = await res.json()

      expect(body.meta.pagination.current_page).toBe(2)
      expect(body.meta.pagination.per_page).toBe(25)
      expect(prisma.node.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 25, take: 25 }),
      )
    })

    it('should sort by memory ascending', async () => {
      prisma.node.findMany.mockResolvedValue([])
      prisma.node.count.mockResolvedValue(0)

      const app = buildApp()
      await app.request('/nodes?sort=memory')

      expect(prisma.node.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { memory: 'asc' } }),
      )
    })

    it('should sort by disk descending', async () => {
      prisma.node.findMany.mockResolvedValue([])
      prisma.node.count.mockResolvedValue(0)

      const app = buildApp()
      await app.request('/nodes?sort=-disk')

      expect(prisma.node.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { disk: 'desc' } }),
      )
    })

    it('should default sort to id ascending', async () => {
      prisma.node.findMany.mockResolvedValue([])
      prisma.node.count.mockResolvedValue(0)

      const app = buildApp()
      await app.request('/nodes')

      expect(prisma.node.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { id: 'asc' } }),
      )
    })
  })

  // ── GET /nodes/:id (view) ──────────────────────────────────────────────

  describe('GET /nodes/:id', () => {
    it('should return 200 with node details', async () => {
      const node = makeMockNode({ id: 5 })
      prisma.node.findUnique.mockResolvedValue(node)

      const app = buildApp()
      const res = await app.request('/nodes/5')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.object).toBe('node')
      expect(body.attributes.id).toBe(5)
      expect(body.attributes.name).toBe('Test Node')
      expect(body.attributes.fqdn).toBe('node.test.local')
    })

    it('should return 404 for non-existent node', async () => {
      prisma.node.findUnique.mockResolvedValue(null)

      const app = buildApp()
      const res = await app.request('/nodes/999')
      const body = await res.json()

      expect(res.status).toBe(404)
      expect(body.errors[0].code).toBe('NotFoundError')
    })
  })

  // ── POST /nodes (store) ────────────────────────────────────────────────

  describe('POST /nodes', () => {
    it('should create a node with valid data and return 201', async () => {
      const created = makeMockNode({
        id: 20,
        name: 'New Node',
        fqdn: 'new.node.local',
        memory: 16384,
        disk: 524288,
      })
      prisma.node.create.mockResolvedValue(created)

      const app = buildApp()
      const res = await jsonRequest(app, 'POST', '/nodes', {
        name: 'New Node',
        location_id: 1,
        fqdn: 'new.node.local',
        scheme: 'https',
        memory: 16384,
        disk: 524288,
      })
      const body = await res.json()

      expect(res.status).toBe(201)
      expect(body.object).toBe('node')
      expect(body.attributes.name).toBe('New Node')
      expect(body.attributes.fqdn).toBe('new.node.local')
      expect(body.attributes.memory).toBe(16384)
      expect(body.attributes.disk).toBe(524288)
      expect(body.meta.resource).toContain('/api/application/nodes/20')
    })

    it('should pass correct defaults to prisma create', async () => {
      const created = makeMockNode({ id: 21 })
      prisma.node.create.mockResolvedValue(created)

      const app = buildApp()
      await jsonRequest(app, 'POST', '/nodes', {
        name: 'Defaults Node',
        location_id: 1,
        fqdn: 'defaults.node.local',
        memory: 8192,
        disk: 262144,
      })

      expect(prisma.node.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          uuid: 'node-uuid-generated-1234',
          name: 'Defaults Node',
          locationId: 1,
          fqdn: 'defaults.node.local',
          memory: 8192,
          disk: 262144,
          scheme: 'https',
          behindProxy: false,
          public: true,
          memoryOverallocate: 0,
          diskOverallocate: 0,
          daemonBase: '/var/lib/pterodactyl/volumes',
          daemonSFTP: 2022,
          daemonListen: 8080,
          uploadSize: 100,
          maintenanceMode: false,
          daemonType: 'elytra',
          backupDisk: 'local',
        }),
      })
    })

    it('should generate daemon token on create', async () => {
      const created = makeMockNode({ id: 22 })
      prisma.node.create.mockResolvedValue(created)

      const app = buildApp()
      await jsonRequest(app, 'POST', '/nodes', {
        name: 'Token Node',
        location_id: 1,
        fqdn: 'token.node.local',
        memory: 4096,
        disk: 131072,
      })

      expect(prisma.node.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          daemonTokenId: expect.any(String),
          daemonToken: expect.any(String),
        }),
      })
    })

    it('should accept custom optional fields', async () => {
      const created = makeMockNode({ id: 23 })
      prisma.node.create.mockResolvedValue(created)

      const app = buildApp()
      await jsonRequest(app, 'POST', '/nodes', {
        name: 'Custom Node',
        description: 'A custom node',
        location_id: 2,
        fqdn: 'custom.node.local',
        internal_fqdn: 'internal.node.local',
        use_separate_fqdns: true,
        scheme: 'http',
        behind_proxy: true,
        public: false,
        memory: 4096,
        memory_overallocate: 20,
        disk: 131072,
        disk_overallocate: 10,
        daemon_base: '/opt/volumes',
        daemon_sftp: 2023,
        daemon_listen: 9090,
        upload_size: 200,
        maintenance_mode: true,
        daemon_type: 'wings',
        backup_disk: 's3',
      })

      expect(prisma.node.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: 'A custom node',
          internalFqdn: 'internal.node.local',
          useSeparateFqdns: true,
          scheme: 'http',
          behindProxy: true,
          public: false,
          memoryOverallocate: 20,
          diskOverallocate: 10,
          daemonBase: '/opt/volumes',
          daemonSFTP: 2023,
          daemonListen: 9090,
          uploadSize: 200,
          maintenanceMode: true,
          daemonType: 'wings',
          backupDisk: 's3',
        }),
      })
    })
  })

  // ── PATCH /nodes/:id (update) ──────────────────────────────────────────

  describe('PATCH /nodes/:id', () => {
    it('should update node fields and return 200', async () => {
      const existing = makeMockNode({ id: 30 })
      const updated = makeMockNode({ id: 30, name: 'Updated Node', memory: 65536 })
      prisma.node.findUnique.mockResolvedValue(existing)
      prisma.node.update.mockResolvedValue(updated)

      const app = buildApp()
      const res = await jsonRequest(app, 'PATCH', '/nodes/30', {
        name: 'Updated Node',
        memory: 65536,
      })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.object).toBe('node')
      expect(body.attributes.name).toBe('Updated Node')
      expect(body.attributes.memory).toBe(65536)
    })

    it('should update maintenance_mode', async () => {
      const existing = makeMockNode({ id: 31 })
      const updated = makeMockNode({ id: 31, maintenanceMode: true })
      prisma.node.findUnique.mockResolvedValue(existing)
      prisma.node.update.mockResolvedValue(updated)

      const app = buildApp()
      const res = await jsonRequest(app, 'PATCH', '/nodes/31', { maintenance_mode: true })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.attributes.maintenance_mode).toBe(true)
    })

    it('should return 404 for non-existent node', async () => {
      prisma.node.findUnique.mockResolvedValue(null)

      const app = buildApp()
      const res = await jsonRequest(app, 'PATCH', '/nodes/999', { name: 'Ghost' })
      const body = await res.json()

      expect(res.status).toBe(404)
      expect(body.errors[0].code).toBe('NotFoundError')
    })

    it('should only update provided fields', async () => {
      const existing = makeMockNode({ id: 32 })
      prisma.node.findUnique.mockResolvedValue(existing)
      prisma.node.update.mockResolvedValue(existing)

      const app = buildApp()
      await jsonRequest(app, 'PATCH', '/nodes/32', { fqdn: 'updated.fqdn.local' })

      expect(prisma.node.update).toHaveBeenCalledWith({
        where: { id: 32 },
        data: { fqdn: 'updated.fqdn.local' },
      })
    })

    it('should handle reset_secret flag', async () => {
      const existing = makeMockNode({ id: 33 })
      prisma.node.findUnique.mockResolvedValue(existing)
      prisma.node.update.mockResolvedValue(existing)

      const app = buildApp()
      await jsonRequest(app, 'PATCH', '/nodes/33', { reset_secret: true })

      expect(prisma.node.update).toHaveBeenCalledWith({
        where: { id: 33 },
        data: expect.objectContaining({
          daemonTokenId: expect.any(String),
          daemonToken: expect.any(String),
        }),
      })
    })

    it('should update multiple fields at once', async () => {
      const existing = makeMockNode({ id: 34 })
      const updated = makeMockNode({
        id: 34,
        name: 'Multi Update',
        memory: 4096,
        disk: 500000,
        scheme: 'http',
      })
      prisma.node.findUnique.mockResolvedValue(existing)
      prisma.node.update.mockResolvedValue(updated)

      const app = buildApp()
      const res = await jsonRequest(app, 'PATCH', '/nodes/34', {
        name: 'Multi Update',
        memory: 4096,
        disk: 500000,
        scheme: 'http',
      })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(prisma.node.update).toHaveBeenCalledWith({
        where: { id: 34 },
        data: expect.objectContaining({
          name: 'Multi Update',
          memory: 4096,
          disk: 500000,
          scheme: 'http',
        }),
      })
    })
  })

  // ── DELETE /nodes/:id ──────────────────────────────────────────────────

  describe('DELETE /nodes/:id', () => {
    it('should delete a node without servers and return 204', async () => {
      const node = { ...makeMockNode({ id: 40 }), servers: [] }
      prisma.node.findUnique.mockResolvedValue(node)
      prisma.node.delete.mockResolvedValue({})

      const app = buildApp()
      const res = await app.request('/nodes/40', { method: 'DELETE' })

      expect(res.status).toBe(204)
      expect(prisma.node.delete).toHaveBeenCalledWith({ where: { id: 40 } })
    })

    it('should return 409 when node has active servers', async () => {
      const node = { ...makeMockNode({ id: 41 }), servers: [{ id: 100 }, { id: 101 }] }
      prisma.node.findUnique.mockResolvedValue(node)

      const app = buildApp()
      const res = await app.request('/nodes/41', { method: 'DELETE' })
      const body = await res.json()

      expect(res.status).toBe(409)
      expect(body.errors[0].code).toBe('ConflictError')
      expect(body.errors[0].detail).toContain('active servers')
      expect(prisma.node.delete).not.toHaveBeenCalled()
    })

    it('should return 404 for non-existent node', async () => {
      prisma.node.findUnique.mockResolvedValue(null)

      const app = buildApp()
      const res = await app.request('/nodes/999', { method: 'DELETE' })
      const body = await res.json()

      expect(res.status).toBe(404)
      expect(body.errors[0].code).toBe('NotFoundError')
    })
  })
})
