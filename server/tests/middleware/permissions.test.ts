import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import {
  authenticateServerAccess,
  requirePermission,
  validateServerState,
} from '../../src/middleware/permissions'
import { onError } from '../../src/middleware/errorHandler'
import {
  createTestHono,
  createMockPrisma,
  MOCK_ADMIN,
  MOCK_USER,
} from '../helpers/test-app'
import type { Env, HonoVariables } from '../../src/types/env'

type AppType = { Bindings: Env; Variables: HonoVariables }

const FAKE_SERVER = {
  id: 1,
  uuid: 'abc-123',
  uuidShort: 'abc123',
  ownerId: 2, // owned by MOCK_USER
  status: null,
  node: { id: 1, maintenanceMode: false },
  allocation: { id: 1 },
  egg: { id: 1 },
}

describe('permissions middleware', () => {
  let prisma: ReturnType<typeof createMockPrisma>

  beforeEach(() => {
    prisma = createMockPrisma()
    vi.clearAllMocks()
  })

  describe('authenticateServerAccess', () => {
    function buildApp(user: typeof MOCK_ADMIN | null) {
      const result = createTestHono({
        user: user ?? undefined,
        prisma,
      })
      result.app.onError(onError)
      result.app.get('/servers/:server', authenticateServerAccess, (c) => {
        return c.json({
          ok: true,
          serverId: (c.var.server as any)?.id,
          permissions: c.var.serverPermissions,
        })
      })
      return result.app
    }

    it('should grant admin user wildcard permissions on any server', async () => {
      const serverOwnedByOther = { ...FAKE_SERVER, ownerId: 99 }
      prisma.server.findFirst.mockResolvedValue(serverOwnedByOther)

      const app = buildApp(MOCK_ADMIN)
      const res = await app.request('/servers/abc-123')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.permissions).toEqual(['*'])
    })

    it('should grant owner wildcard permissions', async () => {
      prisma.server.findFirst.mockResolvedValue(FAKE_SERVER)

      const app = buildApp(MOCK_USER) // MOCK_USER.id === 2, FAKE_SERVER.ownerId === 2
      const res = await app.request('/servers/abc-123')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.permissions).toEqual(['*'])
    })

    it('should load subuser permissions for a non-owner, non-admin user', async () => {
      const serverOwnedByOther = { ...FAKE_SERVER, ownerId: 99 }
      prisma.server.findFirst.mockResolvedValue(serverOwnedByOther)
      prisma.subuser.findFirst.mockResolvedValue({
        id: 5,
        permissions: ['control.start', 'control.stop', 'file.read'],
      })

      const app = buildApp(MOCK_USER)
      const res = await app.request('/servers/abc-123')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.permissions).toEqual(['control.start', 'control.stop', 'file.read'])
    })

    it('should return 404 when user is not owner and not a subuser', async () => {
      const serverOwnedByOther = { ...FAKE_SERVER, ownerId: 99 }
      prisma.server.findFirst.mockResolvedValue(serverOwnedByOther)
      prisma.subuser.findFirst.mockResolvedValue(null)

      const app = buildApp(MOCK_USER)
      const res = await app.request('/servers/abc-123')

      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body.errors[0].detail).toBe('Server not found.')
    })

    it('should return 404 when server does not exist', async () => {
      prisma.server.findFirst.mockResolvedValue(null)

      const app = buildApp(MOCK_USER)
      const res = await app.request('/servers/nonexistent')

      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body.errors[0].detail).toBe('Server not found.')
    })

    it('should handle numeric server IDs in the query', async () => {
      prisma.server.findFirst.mockResolvedValue(FAKE_SERVER)

      const app = buildApp(MOCK_USER)
      await app.request('/servers/1')

      expect(prisma.server.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ id: 1 }),
            ]),
          }),
        }),
      )
    })
  })

  describe('requirePermission', () => {
    /**
     * Builds a minimal app where serverPermissions are injected
     * via middleware before requirePermission runs.
     */
    function buildPermApp(permissions: string[]) {
      const result = createTestHono({ user: MOCK_USER })
      result.app.onError(onError)
      result.app.use('/test', async (c, next) => {
        c.set('serverPermissions', permissions)
        await next()
      })
      result.app.get('/test', requirePermission('control.start'), (c) => {
        return c.json({ ok: true })
      })
      return result.app
    }

    function buildMultiPermApp(
      requiredPerms: string[],
      userPerms: string[],
    ) {
      const result = createTestHono({ user: MOCK_USER })
      result.app.onError(onError)
      result.app.use('/test', async (c, next) => {
        c.set('serverPermissions', userPerms)
        await next()
      })
      result.app.get('/test', requirePermission(...requiredPerms), (c) => {
        return c.json({ ok: true })
      })
      return result.app
    }

    it('should pass when user has wildcard "*" permission', async () => {
      const app = buildPermApp(['*'])
      const res = await app.request('/test')
      expect(res.status).toBe(200)
    })

    it('should pass with exact permission match', async () => {
      const app = buildPermApp(['control.start', 'control.stop'])
      const res = await app.request('/test')
      expect(res.status).toBe(200)
    })

    it('should pass with prefix wildcard match (control.*)', async () => {
      const app = buildMultiPermApp(['control.*'], ['control.start', 'control.stop'])
      const res = await app.request('/test')
      expect(res.status).toBe(200)
    })

    it('should reject when user lacks required permission (403)', async () => {
      const app = buildPermApp(['file.read', 'file.write'])
      const res = await app.request('/test')

      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.errors[0].detail).toBe(
        'You do not have permission to perform this action.',
      )
    })

    it('should reject when permissions array is empty (403)', async () => {
      const app = buildPermApp([])
      const res = await app.request('/test')
      expect(res.status).toBe(403)
    })

    it('should pass when any of multiple required permissions match', async () => {
      const app = buildMultiPermApp(
        ['admin.delete', 'control.start'],
        ['control.start'],
      )
      const res = await app.request('/test')
      expect(res.status).toBe(200)
    })

    it('should reject when serverPermissions is not set', async () => {
      const result = createTestHono({ user: MOCK_USER })
      result.app.onError(onError)
      // No middleware sets serverPermissions
      result.app.get('/test', requirePermission('control.start'), (c) => {
        return c.json({ ok: true })
      })
      const res = await result.app.request('/test')
      expect(res.status).toBe(403)
    })
  })

  describe('validateServerState', () => {
    function buildStateApp(server: any) {
      const result = createTestHono({ user: MOCK_USER })
      result.app.onError(onError)
      result.app.use('/test', async (c, next) => {
        if (server) c.set('server', server)
        await next()
      })
      result.app.get('/test', validateServerState, (c) => {
        return c.json({ ok: true })
      })
      return result.app
    }

    it('should pass for a normal server', async () => {
      const app = buildStateApp({ id: 1, status: null, node: { maintenanceMode: false } })
      const res = await app.request('/test')
      expect(res.status).toBe(200)
    })

    it('should reject suspended server (409)', async () => {
      const app = buildStateApp({ id: 1, status: 'suspended', node: { maintenanceMode: false } })
      const res = await app.request('/test')

      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.errors[0].code).toBe('ServerStateConflictError')
    })

    it('should reject server on node in maintenance (409)', async () => {
      const app = buildStateApp({ id: 1, status: null, node: { maintenanceMode: true } })
      const res = await app.request('/test')

      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.errors[0].code).toBe('ServerStateConflictError')
    })

    it('should reject server with restoring_backup status (409)', async () => {
      const app = buildStateApp({ id: 1, status: 'restoring_backup', node: { maintenanceMode: false } })
      const res = await app.request('/test')
      expect(res.status).toBe(409)
    })

    it('should return 404 when server is not set on context', async () => {
      const app = buildStateApp(null)
      const res = await app.request('/test')
      expect(res.status).toBe(404)
    })

    it('should pass for server with running status', async () => {
      const app = buildStateApp({ id: 1, status: 'running', node: { maintenanceMode: false } })
      const res = await app.request('/test')
      expect(res.status).toBe(200)
    })
  })

  describe('no user context (unauthenticated)', () => {
    it('should fail when no user is set and authenticateServerAccess reads user', async () => {
      prisma.server.findFirst.mockResolvedValue(FAKE_SERVER)

      const result = createTestHono({ prisma })
      // No user injected
      result.app.onError(onError)
      result.app.get('/servers/:server', authenticateServerAccess, (c) => {
        return c.json({ ok: true })
      })

      const res = await result.app.request('/servers/abc-123')
      // Without a user, c.var.user! will be undefined, causing a runtime error
      // which the error handler catches as a 500
      expect(res.status).toBeGreaterThanOrEqual(400)
    })
  })
})
