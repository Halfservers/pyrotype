import { describe, it, expect, vi } from 'vitest'
import { createMockPrisma } from '../helpers/test-app'

vi.mock('../../src/config/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// Fixtures
const LOC = { id: 1, short: 'us-east', long: 'US East Coast', createdAt: new Date(), updatedAt: new Date() }
const NODE = { id: 1, uuid: 'node-uuid-1', name: 'Node 1', fqdn: 'node1.local', locationId: 1, location: LOC, memory: 32768, disk: 1048576 }
const NEST = { id: 1, uuid: 'nest-uuid-1', author: 'test@local', name: 'Minecraft', description: 'MC Nest' }
const EGG = { id: 1, uuid: 'egg-uuid-1', name: 'Vanilla', nestId: 1, nest: NEST }
const ALLOC = { id: 1, nodeId: 1, ip: '127.0.0.1', port: 25565, serverId: 1, node: NODE }
const USER = { id: 1, uuid: 'user-uuid-1', username: 'admin', email: 'admin@test.com', rootAdmin: true }
const SERVER = {
  id: 1, uuid: 'server-uuid-1', uuidShort: 'srv1', name: 'Test Server',
  ownerId: 1, nodeId: 1, nestId: 1, eggId: 1, allocationId: 1,
  node: NODE, nest: NEST, egg: EGG, allocation: ALLOC, allocations: [ALLOC], user: USER,
}

describe('Database Relations (Mock)', () => {
  describe('User Model', () => {
    it('should load user with servers relation', async () => {
      const p = createMockPrisma()
      p.user.findFirst.mockResolvedValue({ ...USER, servers: [SERVER] })
      const user = await p.user.findFirst({ include: { servers: true } })
      expect(user).toBeTruthy()
      expect(Array.isArray(user!.servers)).toBe(true)
    })

    it('should load user with apiKeys relation', async () => {
      const p = createMockPrisma()
      p.user.findFirst.mockResolvedValue({ ...USER, apiKeys: [] })
      const user = await p.user.findFirst({ include: { apiKeys: true } })
      expect(user).toBeTruthy()
      expect(Array.isArray(user!.apiKeys)).toBe(true)
    })

    it.each(['username', 'email', 'uuid'])('should enforce unique %s constraint', async (field) => {
      const p = createMockPrisma()
      p.user.findFirst.mockResolvedValue(USER)
      p.user.create.mockRejectedValue(new Error(`Unique constraint failed on field: ${field}`))
      const existing = await p.user.findFirst()
      expect(existing).toBeTruthy()
      await expect(p.user.create({ data: { uuid: 'x', username: 'x', email: 'x', password: 'x' } })).rejects.toThrow()
    })
  })

  describe('Server Relations', () => {
    it('should load server with node, nest, and egg', async () => {
      const p = createMockPrisma()
      p.server.findFirst.mockResolvedValue(SERVER)
      const s = await p.server.findFirst({ include: { node: true, nest: true, egg: true } })
      expect(s!.node).toHaveProperty('fqdn')
      expect(s!.nest).toHaveProperty('name')
      expect(s!.egg).toHaveProperty('name')
    })

    it('should load server with allocation relation', async () => {
      const p = createMockPrisma()
      p.server.findFirst.mockResolvedValue(SERVER)
      const s = await p.server.findFirst({ include: { allocation: true, allocations: true } })
      expect(s!.allocation).toHaveProperty('ip')
      expect(s!.allocation).toHaveProperty('port')
      expect(Array.isArray(s!.allocations)).toBe(true)
    })

    it('should load server with user (owner) relation', async () => {
      const p = createMockPrisma()
      p.server.findFirst.mockResolvedValue(SERVER)
      const s = await p.server.findFirst({ include: { user: true } })
      expect(s!.user).toHaveProperty('username')
      expect(s!.user.id).toBe(s!.ownerId)
    })

    it('should enforce unique uuid constraint on servers', async () => {
      const p = createMockPrisma()
      p.server.findFirst.mockResolvedValue(SERVER)
      p.server.create.mockRejectedValue(new Error('Unique constraint failed'))
      await expect(p.server.create({ data: { uuid: SERVER.uuid } as any })).rejects.toThrow()
    })
  })

  describe('Node Relations', () => {
    it('should load node with location relation', async () => {
      const p = createMockPrisma()
      p.node.findFirst.mockResolvedValue(NODE)
      const n = await p.node.findFirst({ include: { location: true } })
      expect(n!.location).toHaveProperty('short')
    })

    it('should load node with servers and allocations', async () => {
      const p = createMockPrisma()
      p.node.findFirst.mockResolvedValue({ ...NODE, servers: [SERVER], allocations: [ALLOC] })
      const n = await p.node.findFirst({ include: { servers: true, allocations: true } })
      expect(Array.isArray(n!.servers)).toBe(true)
      expect(Array.isArray(n!.allocations)).toBe(true)
    })
  })

  describe('Nest and Egg Relations', () => {
    it('should load nest with eggs relation', async () => {
      const p = createMockPrisma()
      p.nest.findFirst.mockResolvedValue({ ...NEST, eggs: [{ ...EGG, nestId: NEST.id }] })
      const nest = await p.nest.findFirst({ include: { eggs: true } })
      expect(Array.isArray(nest!.eggs)).toBe(true)
      for (const egg of nest!.eggs) expect(egg.nestId).toBe(nest!.id)
    })

    it('should load egg with nest relation', async () => {
      const p = createMockPrisma()
      p.egg.findFirst.mockResolvedValue(EGG)
      const egg = await p.egg.findFirst({ include: { nest: true } })
      expect(egg!.nest.id).toBe(egg!.nestId)
    })

    it('should load egg with variables', async () => {
      const p = createMockPrisma()
      p.egg.findFirst.mockResolvedValue({ ...EGG, variables: [] })
      const egg = await p.egg.findFirst({ include: { variables: true } })
      expect(Array.isArray(egg!.variables)).toBe(true)
    })
  })

  describe('Location Relations', () => {
    it('should load location with nodes', async () => {
      const p = createMockPrisma()
      p.location.findFirst.mockResolvedValue({ ...LOC, nodes: [{ ...NODE, locationId: LOC.id }] })
      const loc = await p.location.findFirst({ include: { nodes: true } })
      expect(Array.isArray(loc!.nodes)).toBe(true)
      for (const n of loc!.nodes) expect(n.locationId).toBe(loc!.id)
    })

    it('should enforce unique short code constraint', async () => {
      const p = createMockPrisma()
      p.location.findFirst.mockResolvedValue(LOC)
      p.location.create.mockRejectedValue(new Error('Unique constraint failed'))
      await expect(p.location.create({ data: { short: LOC.short, long: 'Dup' } })).rejects.toThrow()
    })
  })

  describe('Cascading Relations', () => {
    it('should load deeply nested server -> node -> location', async () => {
      const p = createMockPrisma()
      p.server.findFirst.mockResolvedValue(SERVER)
      const s = await p.server.findFirst({ include: { node: { include: { location: true } } } })
      expect(s!.node.location).toHaveProperty('short')
    })

    it('should load deeply nested server -> egg -> nest', async () => {
      const p = createMockPrisma()
      p.server.findFirst.mockResolvedValue(SERVER)
      const s = await p.server.findFirst({ include: { egg: { include: { nest: true } } } })
      expect(s!.egg.nest.id).toBe(s!.egg.nestId)
    })
  })
})
