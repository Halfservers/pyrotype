import { describe, it, expect, vi } from 'vitest'
import {
  createTestHono,
  createMockPrisma,
  MOCK_USER,
  MOCK_ADMIN,
} from '../helpers/test-app'
import * as clientController from '../../src/controllers/client/clientController'
import { onError } from '../../src/middleware/errorHandler'

function buildApp(opts?: {
  user?: typeof MOCK_USER
  prisma?: ReturnType<typeof createMockPrisma>
}) {
  const ctx = createTestHono({
    user: opts?.user ?? MOCK_USER,
    prisma: opts?.prisma,
  })
  ctx.app.get('/', clientController.index)
  ctx.app.get('/permissions', clientController.permissions)
  ctx.app.onError(onError)
  return ctx
}

function mockServer(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    uuid: 'server-uuid-1',
    uuidShort: 'srv1',
    name: 'Test Server',
    description: 'A test server',
    ownerId: MOCK_USER.id,
    status: 'running',
    memory: 1024,
    overheadMemory: 0,
    swap: 0,
    disk: 5000,
    io: 500,
    cpu: 100,
    threads: null,
    oomDisabled: false,
    startup: 'java -jar server.jar',
    image: 'ghcr.io/pterodactyl/yolks:java_17',
    installedAt: new Date('2025-01-01'),
    allocationId: 1,
    databaseLimit: 2,
    allocationLimit: 1,
    backupLimit: 3,
    backupStorageLimit: 0,
    node: {
      name: 'Node 1',
      fqdn: 'node1.example.com',
      daemonSFTP: 2022,
      maintenanceMode: false,
      daemonType: 'elytra',
      backupDisk: 'wings',
    },
    egg: {
      uuid: 'egg-uuid-1',
      features: ['eula'],
    },
    allocations: [
      { id: 1, ip: '10.0.0.1', ipAlias: null, port: 25565, notes: null },
    ],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// GET / (server listing)
// ---------------------------------------------------------------------------

describe('Client Server Endpoints', () => {
  describe('GET / (server listing)', () => {
    it('should return paginated server list', async () => {
      const prisma = createMockPrisma()
      const srv = mockServer()
      prisma.server.findMany.mockResolvedValue([srv])
      prisma.server.count.mockResolvedValue(1)
      // getAccessibleServerIds calls
      prisma.subuser.findMany.mockResolvedValue([])
      const { app } = buildApp({ prisma })

      const res = await app.request('/')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.object).toBe('list')
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.meta.pagination).toBeDefined()
      expect(body.meta.pagination.total).toBe(1)
      expect(body.meta.pagination.current_page).toBe(1)
      expect(body.meta.pagination.per_page).toBe(50)
    })

    it('should return proper server attributes', async () => {
      const prisma = createMockPrisma()
      const srv = mockServer()
      prisma.server.findMany.mockResolvedValue([srv])
      prisma.server.count.mockResolvedValue(1)
      prisma.subuser.findMany.mockResolvedValue([])
      const { app } = buildApp({ prisma })

      const res = await app.request('/')

      expect(res.status).toBe(200)
      const body = await res.json()
      const attrs = body.data[0].attributes
      expect(attrs.identifier).toBe('srv1')
      expect(attrs.uuid).toBe('server-uuid-1')
      expect(attrs.name).toBe('Test Server')
      expect(attrs.server_owner).toBe(true)
      expect(attrs.node).toBe('Node 1')
      expect(attrs.sftp_details).toEqual({ ip: 'node1.example.com', port: 2022 })
      expect(attrs.limits).toBeDefined()
      expect(attrs.limits.memory).toBe(1024)
      expect(attrs.feature_limits).toBeDefined()
      expect(attrs.feature_limits.databases).toBe(2)
      expect(attrs.status).toBe('running')
      expect(attrs.is_suspended).toBe(false)
      expect(attrs.is_installing).toBe(false)
      expect(attrs.relationships.allocations.object).toBe('list')
      expect(attrs.relationships.allocations.data).toHaveLength(1)
    })

    it('should respect pagination query params', async () => {
      const prisma = createMockPrisma()
      prisma.server.findMany.mockResolvedValue([])
      prisma.server.count.mockResolvedValue(0)
      prisma.subuser.findMany.mockResolvedValue([])
      const { app } = buildApp({ prisma })

      const res = await app.request('/?page=2&per_page=5')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.meta.pagination.current_page).toBe(2)
      expect(body.meta.pagination.per_page).toBe(5)
    })

    it('should return empty data for large page number', async () => {
      const prisma = createMockPrisma()
      prisma.server.findMany.mockResolvedValue([])
      prisma.server.count.mockResolvedValue(0)
      prisma.subuser.findMany.mockResolvedValue([])
      const { app } = buildApp({ prisma })

      const res = await app.request('/?page=99999')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toEqual([])
    })

    it('should filter servers by type=owner', async () => {
      const prisma = createMockPrisma()
      prisma.server.findMany.mockResolvedValue([])
      prisma.server.count.mockResolvedValue(0)
      const { app } = buildApp({ prisma })

      await app.request('/?type=owner')

      expect(prisma.server.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ownerId: MOCK_USER.id }),
        }),
      )
    })

    it('should return empty set for non-admin requesting type=admin', async () => {
      const prisma = createMockPrisma()
      const { app } = buildApp({ prisma })

      const res = await app.request('/?type=admin')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toEqual([])
      expect(body.meta.pagination.total).toBe(0)
    })

    it('should return empty set for non-admin requesting type=admin-all', async () => {
      const prisma = createMockPrisma()
      const { app } = buildApp({ prisma })

      const res = await app.request('/?type=admin-all')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toEqual([])
    })

    it('should allow admin to use type=admin-all', async () => {
      const prisma = createMockPrisma()
      prisma.server.findMany.mockResolvedValue([])
      prisma.server.count.mockResolvedValue(0)
      const { app } = buildApp({ user: MOCK_ADMIN, prisma })

      const res = await app.request('/?type=admin-all')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.object).toBe('list')
    })

    it('should apply text filter with filter[*] param', async () => {
      const prisma = createMockPrisma()
      prisma.server.findMany.mockResolvedValue([])
      prisma.server.count.mockResolvedValue(0)
      prisma.subuser.findMany.mockResolvedValue([])
      const { app } = buildApp({ prisma })

      await app.request('/?filter[*]=myserver')

      expect(prisma.server.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'myserver' } },
            ]),
          }),
        }),
      )
    })

    it('should mark is_suspended for suspended servers', async () => {
      const prisma = createMockPrisma()
      const srv = mockServer({ status: 'suspended' })
      prisma.server.findMany.mockResolvedValue([srv])
      prisma.server.count.mockResolvedValue(1)
      prisma.subuser.findMany.mockResolvedValue([])
      const { app } = buildApp({ prisma })

      const res = await app.request('/')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data[0].attributes.is_suspended).toBe(true)
    })

    it('should mark is_installing when installedAt is null', async () => {
      const prisma = createMockPrisma()
      const srv = mockServer({ installedAt: null })
      prisma.server.findMany.mockResolvedValue([srv])
      prisma.server.count.mockResolvedValue(1)
      prisma.subuser.findMany.mockResolvedValue([])
      const { app } = buildApp({ prisma })

      const res = await app.request('/')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data[0].attributes.is_installing).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // GET /permissions
  // -------------------------------------------------------------------------

  describe('GET /permissions', () => {
    it('should return system permissions schema', async () => {
      const { app } = buildApp()

      const res = await app.request('/permissions')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.object).toBe('system_permissions')
      expect(body.attributes).toHaveProperty('permissions')
      const perms = body.attributes.permissions
      expect(perms).toHaveProperty('websocket')
      expect(perms).toHaveProperty('control')
      expect(perms).toHaveProperty('user')
      expect(perms).toHaveProperty('file')
      expect(perms).toHaveProperty('backup')
      expect(perms).toHaveProperty('allocation')
      expect(perms).toHaveProperty('startup')
      expect(perms).toHaveProperty('database')
      expect(perms).toHaveProperty('schedule')
      expect(perms).toHaveProperty('settings')
      expect(perms).toHaveProperty('activity')
    })

    it('should return permissions with descriptions and keys', async () => {
      const { app } = buildApp()

      const res = await app.request('/permissions')

      const body = await res.json()
      const perms = body.attributes.permissions
      for (const [, value] of Object.entries(perms)) {
        const group = value as { description: string; keys: Record<string, string> }
        expect(typeof group.description).toBe('string')
        expect(typeof group.keys).toBe('object')
      }
    })
  })
})
