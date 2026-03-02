import { z } from 'zod';

export const createNodeSchema = z.object({
  name: z.string().min(1).max(255),
  fqdn: z.string().min(1),
  scheme: z.enum(['http', 'https']).default('https'),
  memory: z.number().int().positive(),
  memory_overallocate: z.number().int().default(0),
  disk: z.number().int().positive(),
  disk_overallocate: z.number().int().default(0),
  daemon_listen: z.number().int().default(8080),
  daemon_sftp: z.number().int().default(2022),
  daemon_base: z.string().default('/var/lib/pterodactyl/volumes'),
  location_id: z.number().int().positive(),
  daemon_type: z.enum(['wings', 'elytra']).default('wings'),
});

export const updateNodeSchema = createNodeSchema.partial();
