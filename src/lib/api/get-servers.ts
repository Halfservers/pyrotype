import { api } from '@/lib/http';
import type { PaginatedResult } from '@/types/api';
import { getPaginationSet } from '@/lib/fractal';
import { type Server, rawDataToServerObject } from '@/lib/api/server/get-server';

interface QueryParams {
  query?: string;
  page?: number;
  type?: string;
}

export default async ({ query, ...params }: QueryParams): Promise<PaginatedResult<Server>> => {
  const data: any = await api.get('/api/client', {
    'filter[*]': query,
    ...params,
  });
  return {
    items: (data.data || []).map((datum: any) => rawDataToServerObject(datum)),
    pagination: getPaginationSet(data.meta.pagination),
  };
};
