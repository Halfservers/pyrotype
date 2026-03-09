import { describe, it, expect, vi } from 'vitest'
import {
  createTestHono,
  createMockPrisma,
  jsonRequest,
  MOCK_USER,
} from '../helpers/test-app'
import * as sshKeyController from '../../src/controllers/client/sshKeyController'
import { onError } from '../../src/middleware/errorHandler'

function buildApp(prisma?: ReturnType<typeof createMockPrisma>) {
  const ctx = createTestHono({ user: MOCK_USER, prisma })
  ctx.app.get('/account/ssh-keys', sshKeyController.index)
  ctx.app.post('/account/ssh-keys', sshKeyController.store)
  ctx.app.post('/account/ssh-keys/remove', sshKeyController.deleteSSHKey)
  ctx.app.onError(onError)
  return ctx
}

// A valid base64-encoded key body for fingerprint computation
const validBase64Key = btoa(String.fromCharCode(...new Uint8Array(32)))
const validPublicKey = `ssh-rsa ${validBase64Key} user@host`

// ---------------------------------------------------------------------------
// GET /account/ssh-keys
// ---------------------------------------------------------------------------

describe('Client SSH Key Endpoints', () => {
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
      const { app } = buildApp(prisma)

      const res = await app.request('/account/ssh-keys')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.object).toBe('list')
      expect(body.data).toHaveLength(1)
      expect(body.data[0].object).toBe('ssh_key')
      expect(body.data[0].attributes.name).toBe('My Laptop')
      expect(body.data[0].attributes.fingerprint).toBe('SHA256:abc123')
      expect(body.data[0].attributes.public_key).toBe('ssh-ed25519 AAAA...')
      expect(body.data[0].attributes.created_at).toBe('2025-01-01T00:00:00.000Z')
    })

    it('should return an empty list when no keys exist', async () => {
      const { app } = buildApp()
      const res = await app.request('/account/ssh-keys')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.object).toBe('list')
      expect(body.data).toHaveLength(0)
    })

    it('should filter by userId and non-deleted keys', async () => {
      const prisma = createMockPrisma()
      prisma.userSSHKey.findMany.mockResolvedValue([])
      const { app } = buildApp(prisma)

      await app.request('/account/ssh-keys')

      expect(prisma.userSSHKey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: MOCK_USER.id, deletedAt: null },
        }),
      )
    })
  })

  // -------------------------------------------------------------------------
  // POST /account/ssh-keys
  // -------------------------------------------------------------------------

  describe('POST /account/ssh-keys', () => {
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
      const { app } = buildApp(prisma)

      const res = await jsonRequest(app, 'POST', '/account/ssh-keys', {
        name: 'Work Key',
        public_key: validPublicKey,
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.object).toBe('ssh_key')
      expect(body.attributes.name).toBe('Work Key')
      expect(body.attributes.public_key).toBe(validPublicKey)
    })

    it('should return 422 when name is missing', async () => {
      const { app } = buildApp()

      const res = await jsonRequest(app, 'POST', '/account/ssh-keys', {
        public_key: validPublicKey,
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

    it('should return 422 when body is empty', async () => {
      const { app } = buildApp()

      const res = await jsonRequest(app, 'POST', '/account/ssh-keys', {})

      expect(res.status).toBe(422)
    })

    it('should return 422 for duplicate SSH key fingerprint', async () => {
      const prisma = createMockPrisma()
      prisma.userSSHKey.findFirst.mockResolvedValue({ id: 99 }) // existing key
      const { app } = buildApp(prisma)

      const res = await jsonRequest(app, 'POST', '/account/ssh-keys', {
        name: 'Duplicate Key',
        public_key: validPublicKey,
      })

      expect(res.status).toBe(422)
    })

    it('should store key data with correct userId', async () => {
      const prisma = createMockPrisma()
      prisma.userSSHKey.findFirst.mockResolvedValue(null)
      prisma.userSSHKey.create.mockResolvedValue({
        id: 1,
        name: 'My Key',
        fingerprint: 'SHA256:test',
        publicKey: validPublicKey,
        createdAt: new Date('2025-01-01'),
      })
      const { app } = buildApp(prisma)

      await jsonRequest(app, 'POST', '/account/ssh-keys', {
        name: 'My Key',
        public_key: validPublicKey,
      })

      expect(prisma.userSSHKey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: MOCK_USER.id,
          name: 'My Key',
          publicKey: validPublicKey,
          fingerprint: expect.stringMatching(/^SHA256:/),
        }),
      })
    })
  })

  // -------------------------------------------------------------------------
  // POST /account/ssh-keys/remove
  // -------------------------------------------------------------------------

  describe('POST /account/ssh-keys/remove', () => {
    it('should soft-delete an existing SSH key and return 204', async () => {
      const prisma = createMockPrisma()
      prisma.userSSHKey.findFirst.mockResolvedValue({ id: 5 })
      const { app } = buildApp(prisma)

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
      const { app } = buildApp(prisma)

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

    it('should query by userId and non-deleted keys', async () => {
      const prisma = createMockPrisma()
      prisma.userSSHKey.findFirst.mockResolvedValue(null)
      const { app } = buildApp(prisma)

      await jsonRequest(app, 'POST', '/account/ssh-keys/remove', {
        fingerprint: 'SHA256:test',
      })

      expect(prisma.userSSHKey.findFirst).toHaveBeenCalledWith({
        where: {
          userId: MOCK_USER.id,
          fingerprint: 'SHA256:test',
          deletedAt: null,
        },
      })
    })
  })
})
