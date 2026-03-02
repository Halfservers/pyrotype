import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(50),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

export function getPaginationOffset(params: PaginationParams): { skip: number; take: number } {
  return {
    skip: (params.page - 1) * params.per_page,
    take: params.per_page,
  };
}
