import { describe, it, expect, vi } from 'vitest'
import {
  createTestHono,
  createMockPrisma,
  jsonRequest,
  MOCK_USER,
} from '../helpers/test-app'
import * as apiKeyController from '../../src/controllers/client/apiKeyController'
import { onError } from '../../src/middleware/errorHandler'

// Mock crypto utilities
vi.mock('../../src/utils/crypto', () => ({
  verifyPassword: vi.fn(async () => true),
  hashPassword: vi.fn(async (p: string) => `hashed:${p}`),
}))

// Mock API key generation helpers
vi.mock('../../src/services/auth/apiKey', () => ({
  generateApiKeyIdentifier: vi.fn(() => 'mock-identifier'),
  generateApiKeyToken: vi.fn(async () => ({
    plain: 'mock-plain-token',
    hashed: 'mock-hashed-token',
  })),
}))

function buildApp(prisma?: ReturnType<typeof createMockPrisma>) {
  const ctx = createTestHono({ user: MOCK_USER, prisma })
  ctx.app.get('/account/api-keys', apiKeyController.index)
  ctx.app.post('/account/api-keys', apiKeyController.store)
  ctx.app.delete('/account/api-keys/:identifier', apiKeyController.deleteKey)
  ctx.app.onError(onError)
  return ctx
}

// ---------------------------------------------------------------------------
// GET /account/api-keys
// ---------------------------------------------------------------------------

describe('Client API Key Endpoints', () => {
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
      const { app } = buildApp(prisma)

      const res = await app.request('/account/api-keys')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.object).toBe('list')
      expect(body.data).toHaveLength(1)
      expect(body.data[0].object).toBe('api_key')
      expect(body.data[0].attributes.identifier).toBe('abc123')
      expect(body.data[0].attributes.description).toBe('test key')
      expect(body.data[0].attributes.allowed_ips).toEqual(['127.0.0.1'])
      expect(body.data[0].attributes.last_used_at).toBe('2025-06-01T00:00:00.000Z')
      expect(body.data[0].attributes.created_at).toBe('2025-01-01T00:00:00.000Z')
    })

    it('should return an empty list when no keys exist', async () => {
      const { app } = buildApp()
      const res = await app.request('/account/api-keys')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.object).toBe('list')
      expect(body.data).toHaveLength(0)
    })

    it('should filter keys by userId and keyType', async () => {
      const prisma = createMockPrisma()
      prisma.apiKey.findMany.mockResolvedValue([])
      const { app } = buildApp(prisma)

      await app.request('/account/api-keys')

      expect(prisma.apiKey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: MOCK_USER.id, keyType: 1 },
        }),
      )
    })
  })

  // -------------------------------------------------------------------------
  // POST /account/api-keys
  // -------------------------------------------------------------------------

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
      const { app } = buildApp(prisma)

      const res = await jsonRequest(app, 'POST', '/account/api-keys', {
        description: 'my key',
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.object).toBe('api_key')
      expect(body.attributes.identifier).toBe('mock-identifier')
      expect(body.attributes.description).toBe('my key')
      expect(body.meta.secret_token).toBe('mock-plain-token')
    })

    it('should create API key with allowed_ips', async () => {
      const prisma = createMockPrisma()
      prisma.apiKey.count.mockResolvedValue(0)
      prisma.apiKey.create.mockResolvedValue({
        id: 1,
        identifier: 'mock-identifier',
        memo: 'restricted',
        allowedIps: ['127.0.0.1', '10.0.0.1'],
        lastUsedAt: null,
        createdAt: new Date('2025-01-01'),
      })
      const { app } = buildApp(prisma)

      const res = await jsonRequest(app, 'POST', '/account/api-keys', {
        description: 'restricted',
        allowed_ips: ['127.0.0.1', '10.0.0.1'],
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.attributes.allowed_ips).toEqual(['127.0.0.1', '10.0.0.1'])
    })

    it('should create API key without description', async () => {
      const prisma = createMockPrisma()
      prisma.apiKey.count.mockResolvedValue(0)
      prisma.apiKey.create.mockResolvedValue({
        id: 1,
        identifier: 'mock-identifier',
        memo: null,
        allowedIps: [],
        lastUsedAt: null,
        createdAt: new Date('2025-01-01'),
      })
      const { app } = buildApp(prisma)

      const res = await jsonRequest(app, 'POST', '/account/api-keys', {})

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.object).toBe('api_key')
      expect(body.meta.secret_token).toBe('mock-plain-token')
    })

    it('should return 400 when the user has reached the 25-key limit', async () => {
      const prisma = createMockPrisma()
      prisma.apiKey.count.mockResolvedValue(25)
      const { app } = buildApp(prisma)

      const res = await jsonRequest(app, 'POST', '/account/api-keys', {
        description: 'one too many',
      })

      expect(res.status).toBe(400)
    })
  })

  // -------------------------------------------------------------------------
  // DELETE /account/api-keys/:identifier
  // -------------------------------------------------------------------------

  describe('DELETE /account/api-keys/:identifier', () => {
    it('should return 204 when the key exists and belongs to the user', async () => {
      const prisma = createMockPrisma()
      prisma.apiKey.findFirst.mockResolvedValue({ id: 10 })
      const { app } = buildApp(prisma)

      const res = await app.request('/account/api-keys/abc123', { method: 'DELETE' })

      expect(res.status).toBe(204)
      expect(prisma.apiKey.delete).toHaveBeenCalledWith({ where: { id: 10 } })
    })

    it('should return 404 when the key does not exist', async () => {
      const prisma = createMockPrisma()
      prisma.apiKey.findFirst.mockResolvedValue(null)
      const { app } = buildApp(prisma)

      const res = await app.request('/account/api-keys/nonexistent', { method: 'DELETE' })

      expect(res.status).toBe(404)
    })

    it('should query by userId, keyType, and identifier', async () => {
      const prisma = createMockPrisma()
      prisma.apiKey.findFirst.mockResolvedValue({ id: 5 })
      const { app } = buildApp(prisma)

      await app.request('/account/api-keys/test-id', { method: 'DELETE' })

      expect(prisma.apiKey.findFirst).toHaveBeenCalledWith({
        where: {
          userId: MOCK_USER.id,
          keyType: 1,
          identifier: 'test-id',
        },
      })
    })
  })
})
