import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../../src/config/database';

describe('Database Relations', () => {
  describe('User Model', () => {
    it('should load user with servers relation', async () => {
      const user = await prisma.user.findFirst({
        include: { servers: true },
      });

      expect(user).toBeTruthy();
      expect(user).toHaveProperty('servers');
      expect(Array.isArray(user!.servers)).toBe(true);
    });

    it('should load user with apiKeys relation', async () => {
      const user = await prisma.user.findFirst({
        include: { apiKeys: true },
      });

      expect(user).toBeTruthy();
      expect(user).toHaveProperty('apiKeys');
      expect(Array.isArray(user!.apiKeys)).toBe(true);
    });

    it('should enforce unique username constraint', async () => {
      const existingUser = await prisma.user.findFirst();
      expect(existingUser).toBeTruthy();

      await expect(
        prisma.user.create({
          data: {
            uuid: 'test-unique-username-' + Date.now(),
            username: existingUser!.username, // duplicate
            email: `unique_test_${Date.now()}@test.com`,
            password: 'hashed_password',
          },
        }),
      ).rejects.toThrow();
    });

    it('should enforce unique email constraint', async () => {
      const existingUser = await prisma.user.findFirst();
      expect(existingUser).toBeTruthy();

      await expect(
        prisma.user.create({
          data: {
            uuid: 'test-unique-email-' + Date.now(),
            username: `unique_user_${Date.now()}`,
            email: existingUser!.email, // duplicate
            password: 'hashed_password',
          },
        }),
      ).rejects.toThrow();
    });

    it('should enforce unique uuid constraint', async () => {
      const existingUser = await prisma.user.findFirst();
      expect(existingUser).toBeTruthy();

      await expect(
        prisma.user.create({
          data: {
            uuid: existingUser!.uuid, // duplicate
            username: `unique_user_uuid_${Date.now()}`,
            email: `unique_uuid_${Date.now()}@test.com`,
            password: 'hashed_password',
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe('Server Relations', () => {
    it('should load server with node, nest, and egg relations', async () => {
      const server = await prisma.server.findFirst({
        include: {
          node: true,
          nest: true,
          egg: true,
        },
      });

      // If there are servers in the DB, verify relations
      if (server) {
        expect(server.node).toBeTruthy();
        expect(server.node).toHaveProperty('name');
        expect(server.node).toHaveProperty('fqdn');

        expect(server.nest).toBeTruthy();
        expect(server.nest).toHaveProperty('name');

        expect(server.egg).toBeTruthy();
        expect(server.egg).toHaveProperty('name');
      }
    });

    it('should load server with allocation relation', async () => {
      const server = await prisma.server.findFirst({
        include: {
          allocation: true,
          allocations: true,
        },
      });

      if (server) {
        expect(server.allocation).toBeTruthy();
        expect(server.allocation).toHaveProperty('ip');
        expect(server.allocation).toHaveProperty('port');
        expect(Array.isArray(server.allocations)).toBe(true);
      }
    });

    it('should load server with user (owner) relation', async () => {
      const server = await prisma.server.findFirst({
        include: { user: true },
      });

      if (server) {
        expect(server.user).toBeTruthy();
        expect(server.user).toHaveProperty('username');
        expect(server.user).toHaveProperty('email');
        expect(server.user.id).toBe(server.ownerId);
      }
    });

    it('should enforce unique uuid constraint on servers', async () => {
      const existingServer = await prisma.server.findFirst();
      if (!existingServer) return; // skip if no servers

      await expect(
        prisma.server.create({
          data: {
            uuid: existingServer.uuid, // duplicate
            uuidShort: 'dup' + Date.now(),
            nodeId: existingServer.nodeId,
            name: 'Duplicate Test',
            ownerId: existingServer.ownerId,
            allocationId: existingServer.allocationId,
            nestId: existingServer.nestId,
            eggId: existingServer.eggId,
            startup: 'test',
            image: 'test',
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe('Node Relations', () => {
    it('should load node with location relation', async () => {
      const node = await prisma.node.findFirst({
        include: { location: true },
      });

      if (node) {
        expect(node.location).toBeTruthy();
        expect(node.location).toHaveProperty('short');
      }
    });

    it('should load node with servers and allocations', async () => {
      const node = await prisma.node.findFirst({
        include: {
          servers: true,
          allocations: true,
        },
      });

      if (node) {
        expect(Array.isArray(node.servers)).toBe(true);
        expect(Array.isArray(node.allocations)).toBe(true);
      }
    });
  });

  describe('Nest and Egg Relations', () => {
    it('should load nest with eggs relation', async () => {
      const nest = await prisma.nest.findFirst({
        include: { eggs: true },
      });

      if (nest) {
        expect(Array.isArray(nest.eggs)).toBe(true);
        for (const egg of nest.eggs) {
          expect(egg.nestId).toBe(nest.id);
        }
      }
    });

    it('should load egg with nest relation', async () => {
      const egg = await prisma.egg.findFirst({
        include: { nest: true },
      });

      if (egg) {
        expect(egg.nest).toBeTruthy();
        expect(egg.nest.id).toBe(egg.nestId);
      }
    });

    it('should load egg with variables', async () => {
      const egg = await prisma.egg.findFirst({
        include: { variables: true },
      });

      if (egg) {
        expect(Array.isArray(egg.variables)).toBe(true);
      }
    });
  });

  describe('Location Relations', () => {
    it('should load location with nodes', async () => {
      const location = await prisma.location.findFirst({
        include: { nodes: true },
      });

      if (location) {
        expect(Array.isArray(location.nodes)).toBe(true);
        for (const node of location.nodes) {
          expect(node.locationId).toBe(location.id);
        }
      }
    });

    it('should enforce unique short code constraint', async () => {
      const existingLocation = await prisma.location.findFirst();
      if (!existingLocation) return;

      await expect(
        prisma.location.create({
          data: {
            short: existingLocation.short, // duplicate
            long: 'Duplicate Test Location',
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe('Allocation Relations', () => {
    it('should load allocation with node relation', async () => {
      const allocation = await prisma.allocation.findFirst({
        include: { node: true },
      });

      if (allocation) {
        expect(allocation.node).toBeTruthy();
        expect(allocation.node.id).toBe(allocation.nodeId);
      }
    });

    it('should load allocation with server relation', async () => {
      const allocation = await prisma.allocation.findFirst({
        where: { serverId: { not: null } },
        include: { server: true },
      });

      if (allocation) {
        expect(allocation.server).toBeTruthy();
      }
    });
  });

  describe('Cascading Relations', () => {
    it('should load deeply nested server -> node -> location', async () => {
      const server = await prisma.server.findFirst({
        include: {
          node: {
            include: {
              location: true,
            },
          },
        },
      });

      if (server) {
        expect(server.node).toBeTruthy();
        expect(server.node.location).toBeTruthy();
        expect(server.node.location).toHaveProperty('short');
      }
    });

    it('should load deeply nested server -> egg -> nest', async () => {
      const server = await prisma.server.findFirst({
        include: {
          egg: {
            include: {
              nest: true,
            },
          },
        },
      });

      if (server) {
        expect(server.egg).toBeTruthy();
        expect(server.egg.nest).toBeTruthy();
        expect(server.egg.nest.id).toBe(server.egg.nestId);
      }
    });
  });
});
