import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.number().min(1).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  sorts: z.record(z.string(), z.unknown()).optional(),
});

export type PaginationData = z.infer<typeof paginationSchema>;
