import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const uuidParamSchema = z.object({
  uuid: z.string().uuid(),
});

export const serverParamSchema = z.object({
  server: z.string(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(50),
  filter: z.string().optional(),
  sort: z.string().optional(),
  type: z.string().optional(),
});
