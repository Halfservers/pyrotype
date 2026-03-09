import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import {
  createTestHono,
  createMockPrisma,
  jsonRequest,
  MOCK_ADMIN,
  MOCK_USER,
} from '../helpers/test-app'
import * as accountController from '../../src/controllers/client/accountController'
import * as apiKeyController from '../../src/controllers/client/apiKeyController'
import * as sshKeyController from '../../src/controllers/client/sshKeyController'
import * as notificationController from '../../src/controllers/client/notificationController'
import { onError } from '../../src/middleware/errorHandler'

// Mock crypto utilities so tests do not depend on bcrypt cost rounds
vi.mock('../../src/utils/crypto', () => ({
  verifyPassword: vi.fn(async (plain: string, _hash: string) => plain === 'correct-password'),
  hashPassword: vi.fn(async (p: string) => `hashed:${p}`),
}))

// Mock API key generation helpers
vi.mock('../../src/services/auth/apiKey', () => ({
  generateApiKeyIdentifier: vi.fn(() => 'mock-identifier'),
  generateApiKeyToken: vi.fn(async () => ({ plain: 'mock-plain-token', hashed: 'mock-hashed-token' })),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type SetupOpts = {
  user?: typeof MOCK_ADMIN | null
  prisma?: ReturnType<typeof createMockPrisma>
}

/** Build a fresh Hono app with account-related routes and the error handler. */
function buildApp(opts?: SetupOpts) {
  const { app, prisma, kv, queue } = createTestHono({
    user: opts?.user !== undefined ? opts.user : MOCK_ADMIN,
    prisma: opts?.prisma,
  })

  // Account
  app.get('/account', accountController.index)
  app.put('/account/email', accountController.updateEmail)
  app.put('/account/password', accountController.updatePassword)

  // API keys
  app.get('/account/api-keys', apiKeyController.index)
  app.post('/account/api-keys', apiKeyController.store)
  app.delete('/account/api-keys/:identifier', apiKeyController.deleteKey)

  // SSH keys
  app.get('/account/ssh-keys', sshKeyController.index)
  app.post('/account/ssh-keys', sshKeyController.store)
  app.post('/account/ssh-keys/remove', sshKeyController.deleteSSHKey)

  // Notifications
  app.get('/account/notifications', notificationController.index)
  app.post('/account/notifications/mark-read', notificationController.markRead)
  app.post('/account/notifications/mark-all-read', notificationController.markAllRead)
  app.delete('/account/notifications/:id', notificationController.deleteFn)

  app.onError(onError)

  return { app, prisma, kv, queue }
}

// ===========================================================================
// GET /account
// ===========================================================================

describe('Client Account Endpoints', () => {
  describe('GET /account', () => {
    it('should return user info for an authenticated request', async () => {
      const { app } = buildApp()
      const res = await app.request('/account')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.object).toBe('user')
      expect(body.attributes.id).toBe(MOCK_ADMIN.id)
      expect(body.attributes.uuid).toBe(MOCK_ADMIN.uuid)
      expect(body.attributes.username).toBe(MOCK_ADMIN.username)
      expect(body.attributes.email).toBe(MOCK_ADMIN.email)
      expect(body.attributes.root_admin).toBe(true)
      expect(body.attributes).toHaveProperty('language')
      expect(body.attributes).toHaveProperty('use_totp')
      expect(body.attributes).toHaveProperty('name_first')
      expect(body.attributes).toHaveProperty('name_last')
      expect(body.attributes).toHaveProperty('created_at')
      expect(body.attributes).toHaveProperty('updated_at')
    })

    it('should not expose the password hash', async () => {
      const { app } = buildApp()
      const res = await app.request('/account')

      const text = await res.text()
      expect(text).not.toContain('password')
      expect(text).not.toContain('$2a$')
    })

    it('should return the regular user attributes when logged in as non-admin', async () => {
      const { app } = buildApp({ user: MOCK_USER })
      const res = await app.request('/account')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.attributes.root_admin).toBe(false)
      expect(body.attributes.username).toBe('testuser')
    })
  })

  // =========================================================================
  // PUT /account/email
  // =========================================================================

  describe('PUT /account/email', () => {
    it('should return 204 when email and password are valid', async () => {
      const prisma = createMockPrisma()
      prisma.user.findUnique.mockResolvedValue(null) // no duplicate
      const { app } = buildApp({ prisma })

      const res = await jsonRequest(app, 'PUT', '/account/email', {
        email: 'new@example.com',
        password: 'correct-password',
      })

      expect(res.status).toBe(204)
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: MOCK_ADMIN.id },
          data: { email: 'new@example.com' },
        }),
      )
    })

    it('should return 422 when email is missing', async () => {
      const { app } = buildApp()
      const res = await jsonRequest(app, 'PUT', '/account/email', {
        password: 'correct-password',
      })

      expect(res.status).toBe(422)
    })

    it('should return 422 when password is missing', async () => {
      const { app } = buildApp()
      const res = await jsonRequest(app, 'PUT', '/account/email', {
        email: 'new@example.com',
      })

      expect(res.status).toBe(422)
    })

    it('should return 400 when password is incorrect', async () => {
      const { app } = buildApp()
      const res = await jsonRequest(app, 'PUT', '/account/email', {
        email: 'new@example.com',
        password: 'wrong-password',
      })

      expect(res.status).toBe(400)
    })

    it('should return 422 when email is already taken by another user', async () => {
      const prisma = createMockPrisma()
      prisma.user.findUnique.mockResolvedValue({ id: 999 }) // different user
      const { app } = buildApp({ prisma })

      const res = await jsonRequest(app, 'PUT', '/account/email', {
        email: 'taken@example.com',
        password: 'correct-password',
      })

      expect(res.status).toBe(422)
    })

    it('should allow keeping the same email (own record)', async () => {
      const prisma = createMockPrisma()
      prisma.user.findUnique.mockResolvedValue({ id: MOCK_ADMIN.id })
      const { app } = buildApp({ prisma })

      const res = await jsonRequest(app, 'PUT', '/account/email', {
        email: MOCK_ADMIN.email,
        password: 'correct-password',
      })

      expect(res.status).toBe(204)
    })
  })

  // =========================================================================
  // PUT /account/password
  // =========================================================================

  describe('PUT /account/password', () => {
    it('should return 204 when all fields are valid', async () => {
      const prisma = createMockPrisma()
      const { app } = buildApp({ prisma })

      const res = await jsonRequest(app, 'PUT', '/account/password', {
        current_password: 'correct-password',
        password: 'new-secure-pass',
        password_confirmation: 'new-secure-pass',
      })

      expect(res.status).toBe(204)
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: MOCK_ADMIN.id },
          data: { password: 'hashed:new-secure-pass' },
        }),
      )
    })

    it('should return 422 when fields are missing', async () => {
      const { app } = buildApp()
      const res = await jsonRequest(app, 'PUT', '/account/password', {
        current_password: 'correct-password',
      })

      expect(res.status).toBe(422)
    })

    it('should return 422 when confirmation does not match', async () => {
      const { app } = buildApp()
      const res = await jsonRequest(app, 'PUT', '/account/password', {
        current_password: 'correct-password',
        password: 'new-secure-pass',
        password_confirmation: 'mismatch',
      })

      expect(res.status).toBe(422)
    })

    it('should return 422 when new password is shorter than 8 characters', async () => {
      const { app } = buildApp()
      const res = await jsonRequest(app, 'PUT', '/account/password', {
        current_password: 'correct-password',
        password: 'short',
        password_confirmation: 'short',
      })

      expect(res.status).toBe(422)
    })

    it('should return 400 when current password is wrong', async () => {
      const { app } = buildApp()
      const res = await jsonRequest(app, 'PUT', '/account/password', {
        current_password: 'wrong-password',
        password: 'new-secure-pass',
        password_confirmation: 'new-secure-pass',
      })

      expect(res.status).toBe(400)
    })

    it('should return 422 when body is empty', async () => {
      const { app } = buildApp()
      const res = await jsonRequest(app, 'PUT', '/account/password', {})

      expect(res.status).toBe(422)
    })
  })

  // =========================================================================
  // API Keys
  // =========================================================================

  describe('GET /account/api-keys', () => {
    it('should return a list of API keys', async () => {
      const prisma = createMockPrisma()
      const mockKey = {
        id: 1,
        identifier: 'abc123',
        memo: 'test key',
        allowedIps: ['127.0.0.1'],
        lastUsedAt: new Date('2025-06-01'),
        createdAt: new Date('2025-01-01'),
      }
      prisma.apiKey.findMany.mockResolvedValue([mockKey])
      const { app } = buildApp({ prisma })

      const res = await app.request('/account/api-keys')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.object).toBe('list')
      expect(body.data).toHaveLength(1)
      expect(body.data[0].object).toBe('api_key')
      expect(body.data[0].attributes.identifier).toBe('abc123')
      expect(body.data[0].attributes.description).toBe('test key')
      expect(body.data[0].attributes.allowed_ips).toEqual(['127.0.0.1'])
    })

    it('should return an empty list when no keys exist', async () => {
      const { app } = buildApp()
      const res = await app.request('/account/api-keys')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.object).toBe('list')
      expect(body.data).toHaveLength(0)
    })
  })

  describe('POST /account/api-keys', () => {
    it('should create a new API key and return the secret token', async () => {
      const prisma = createMockPrisma()
      prisma.apiKey.count.mockResolvedValue(0)
      prisma.apiKey.create.mockResolvedValue({
        id: 1,
        identifier: 'mock-identifier',
        memo: 'my key',
        allowedIps: [],
        lastUsedAt: null,
        createdAt: new Date('2025-01-01'),
      })
      const { app } = buildApp({ prisma })

      const res = await jsonRequest(app, 'POST', '/account/api-keys', {
        description: 'my key',
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.object).toBe('api_key')
      expect(body.attributes.identifier).toBe('mock-identifier')
      expect(body.meta.secret_token).toBe('mock-plain-token')
    })

    it('should return 400 when the user has reached the 25-key limit', async () => {
      const prisma = createMockPrisma()
      prisma.apiKey.count.mockResolvedValue(25)
      const { app } = buildApp({ prisma })

      const res = await jsonRequest(app, 'POST', '/account/api-keys', {
        description: 'one too many',
      })

      expect(res.status).toBe(400)
    })
  })

  describe('DELETE /account/api-keys/:identifier', () => {
    it('should return 204 when the key exists and belongs to the user', async () => {
      const prisma = createMockPrisma()
      prisma.apiKey.findFirst.mockResolvedValue({ id: 10 })
      const { app } = buildApp({ prisma })

      const res = await app.request('/account/api-keys/abc123', { method: 'DELETE' })

      expect(res.status).toBe(204)
      expect(prisma.apiKey.delete).toHaveBeenCalledWith({ where: { id: 10 } })
    })

    it('should return 404 when the key does not exist', async () => {
      const prisma = createMockPrisma()
      prisma.apiKey.findFirst.mockResolvedValue(null)
      const { app } = buildApp({ prisma })

      const res = await app.request('/account/api-keys/nonexistent', { method: 'DELETE' })

      expect(res.status).toBe(404)
    })
  })

  // =========================================================================
  // SSH Keys
  // =========================================================================

  describe('GET /account/ssh-keys', () => {
    it('should return a list of SSH keys', async () => {
      const prisma = createMockPrisma()
      const mockSSHKey = {
        id: 1,
        name: 'My Laptop',
        fingerprint: 'SHA256:abc123',
        publicKey: 'ssh-ed25519 AAAA...',
        createdAt: new Date('2025-01-01'),
      }
      prisma.userSSHKey.findMany.mockResolvedValue([mockSSHKey])
      const { app } = buildApp({ prisma })

      const res = await app.request('/account/ssh-keys')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.object).toBe('list')
      expect(body.data).toHaveLength(1)
      expect(body.data[0].object).toBe('ssh_key')
      expect(body.data[0].attributes.name).toBe('My Laptop')
      expect(body.data[0].attributes.fingerprint).toBe('SHA256:abc123')
      expect(body.data[0].attributes.public_key).toBe('ssh-ed25519 AAAA...')
    })

    it('should return an empty list when no keys exist', async () => {
      const { app } = buildApp()
      const res = await app.request('/account/ssh-keys')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toHaveLength(0)
    })
  })

  describe('POST /account/ssh-keys', () => {
    // A valid base64-encoded key body (32 bytes of zeroes) for the fingerprint computation
    const validBase64Key = btoa(String.fromCharCode(...new Uint8Array(32)))
    const validPublicKey = `ssh-rsa ${validBase64Key} user@host`

    it('should create a new SSH key', async () => {
      const prisma = createMockPrisma()
      prisma.userSSHKey.findFirst.mockResolvedValue(null) // no duplicate
      prisma.userSSHKey.create.mockResolvedValue({
        id: 1,
        name: 'Work Key',
        fingerprint: 'SHA256:computed',
        publicKey: validPublicKey,
        createdAt: new Date('2025-01-01'),
      })
      const { app } = buildApp({ prisma })

      const res = await jsonRequest(app, 'POST', '/account/ssh-keys', {
        name: 'Work Key',
        public_key: validPublicKey,
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.object).toBe('ssh_key')
      expect(body.attributes.name).toBe('Work Key')
    })

    it('should return 422 when name is missing', async () => {
      const { app } = buildApp()
      const res = await jsonRequest(app, 'POST', '/account/ssh-keys', {
        public_key: 'ssh-rsa AAAA...',
      })

      expect(res.status).toBe(422)
    })

    it('should return 422 when public_key is missing', async () => {
      const { app } = buildApp()
      const res = await jsonRequest(app, 'POST', '/account/ssh-keys', {
        name: 'Test',
      })

      expect(res.status).toBe(422)
    })
  })

  describe('POST /account/ssh-keys/remove', () => {
    it('should soft-delete an SSH key and return 204', async () => {
      const prisma = createMockPrisma()
      prisma.userSSHKey.findFirst.mockResolvedValue({ id: 5 })
      const { app } = buildApp({ prisma })

      const res = await jsonRequest(app, 'POST', '/account/ssh-keys/remove', {
        fingerprint: 'SHA256:abc',
      })

      expect(res.status).toBe(204)
      expect(prisma.userSSHKey.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 5 },
          data: { deletedAt: expect.any(Date) },
        }),
      )
    })

    it('should return 204 even when the key is not found (idempotent)', async () => {
      const prisma = createMockPrisma()
      prisma.userSSHKey.findFirst.mockResolvedValue(null)
      const { app } = buildApp({ prisma })

      const res = await jsonRequest(app, 'POST', '/account/ssh-keys/remove', {
        fingerprint: 'SHA256:missing',
      })

      expect(res.status).toBe(204)
      expect(prisma.userSSHKey.update).not.toHaveBeenCalled()
    })

    it('should return 422 when fingerprint is missing', async () => {
      const { app } = buildApp()
      const res = await jsonRequest(app, 'POST', '/account/ssh-keys/remove', {})

      expect(res.status).toBe(422)
    })
  })

  // =========================================================================
  // Notifications
  // =========================================================================

  describe('GET /account/notifications', () => {
    it('should return paginated notifications', async () => {
      const prisma = createMockPrisma()
      const mockNotification = {
        id: 'notif-1',
        type: 'info',
        data: { message: 'hello' },
        readAt: null,
        createdAt: new Date('2025-06-01'),
      }
      prisma.notification.findMany.mockResolvedValue([mockNotification])
      prisma.notification.count
        .mockResolvedValueOnce(1) // total
        .mockResolvedValueOnce(1) // unread
      const { app } = buildApp({ prisma })

      const res = await app.request('/account/notifications')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.object).toBe('list')
      expect(body.data).toHaveLength(1)
      expect(body.data[0].id).toBe('notif-1')
      expect(body.data[0].type).toBe('info')
      expect(body.data[0].read_at).toBeNull()
      expect(body.meta.pagination.total).toBe(1)
      expect(body.meta.unread_count).toBe(1)
    })

    it('should return empty list when no notifications exist', async () => {
      const prisma = createMockPrisma()
      prisma.notification.findMany.mockResolvedValue([])
      prisma.notification.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
      const { app } = buildApp({ prisma })

      const res = await app.request('/account/notifications')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toHaveLength(0)
      expect(body.meta.pagination.total).toBe(0)
    })

    it('should respect pagination query params', async () => {
      const prisma = createMockPrisma()
      prisma.notification.findMany.mockResolvedValue([])
      prisma.notification.count
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(10)
      const { app } = buildApp({ prisma })

      const res = await app.request('/account/notifications?page=2&per_page=5')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.meta.pagination.current_page).toBe(2)
      expect(body.meta.pagination.per_page).toBe(5)
      expect(body.meta.pagination.total_pages).toBe(10)
    })
  })

  describe('POST /account/notifications/mark-read', () => {
    it('should mark specified notifications as read and return 204', async () => {
      const prisma = createMockPrisma()
      const { app } = buildApp({ prisma })

      const res = await jsonRequest(app, 'POST', '/account/notifications/mark-read', {
        ids: ['notif-1', 'notif-2'],
      })

      expect(res.status).toBe(204)
      expect(prisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['notif-1', 'notif-2'] },
          }),
        }),
      )
    })

    it('should return 422 when ids is not an array', async () => {
      const { app } = buildApp()
      const res = await jsonRequest(app, 'POST', '/account/notifications/mark-read', {
        ids: 'notif-1',
      })

      expect(res.status).toBe(422)
    })

    it('should return 422 when ids is an empty array', async () => {
      const { app } = buildApp()
      const res = await jsonRequest(app, 'POST', '/account/notifications/mark-read', {
        ids: [],
      })

      expect(res.status).toBe(422)
    })
  })

  describe('POST /account/notifications/mark-all-read', () => {
    it('should mark all notifications as read and return 204', async () => {
      const prisma = createMockPrisma()
      const { app } = buildApp({ prisma })

      const res = await jsonRequest(app, 'POST', '/account/notifications/mark-all-read', {})

      expect(res.status).toBe(204)
      expect(prisma.notification.updateMany).toHaveBeenCalled()
    })
  })

  describe('DELETE /account/notifications/:id', () => {
    it('should delete a notification and return 204', async () => {
      const prisma = createMockPrisma()
      prisma.notification.findFirst.mockResolvedValue({ id: 'notif-1' })
      const { app } = buildApp({ prisma })

      const res = await app.request('/account/notifications/notif-1', { method: 'DELETE' })

      expect(res.status).toBe(204)
      expect(prisma.notification.delete).toHaveBeenCalledWith({ where: { id: 'notif-1' } })
    })

    it('should return 404 when notification does not exist', async () => {
      const prisma = createMockPrisma()
      prisma.notification.findFirst.mockResolvedValue(null)
      const { app } = buildApp({ prisma })

      const res = await app.request('/account/notifications/nonexistent', { method: 'DELETE' })

      expect(res.status).toBe(404)
    })
  })

  // =========================================================================
  // Unauthenticated access
  // =========================================================================

  describe('Unauthenticated access', () => {
    function buildUnauthApp() {
      const { app, prisma } = createTestHono({ user: null })

      app.get('/account', accountController.index)
      app.put('/account/email', accountController.updateEmail)
      app.put('/account/password', accountController.updatePassword)
      app.get('/account/api-keys', apiKeyController.index)
      app.get('/account/ssh-keys', sshKeyController.index)
      app.get('/account/notifications', notificationController.index)
      app.onError(onError)

      return { app, prisma }
    }

    it('GET /account should fail when user is not set', async () => {
      const { app } = buildUnauthApp()
      const res = await app.request('/account')

      // The controller accesses c.var.user! which will be undefined,
      // causing an error when accessing properties on it
      expect(res.status).toBeGreaterThanOrEqual(400)
    })

    it('PUT /account/email should fail when user is not set', async () => {
      const { app } = buildUnauthApp()
      const res = await jsonRequest(app, 'PUT', '/account/email', {
        email: 'x@y.com',
        password: 'p',
      })

      expect(res.status).toBeGreaterThanOrEqual(400)
    })

    it('GET /account/api-keys should fail when user is not set', async () => {
      const { app } = buildUnauthApp()
      const res = await app.request('/account/api-keys')

      expect(res.status).toBeGreaterThanOrEqual(400)
    })

    it('GET /account/ssh-keys should fail when user is not set', async () => {
      const { app } = buildUnauthApp()
      const res = await app.request('/account/ssh-keys')

      expect(res.status).toBeGreaterThanOrEqual(400)
    })

    it('GET /account/notifications should fail when user is not set', async () => {
      const { app } = buildUnauthApp()
      const res = await app.request('/account/notifications')

      expect(res.status).toBeGreaterThanOrEqual(400)
    })
  })
})
