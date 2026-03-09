import type { PaginationDataSet, FractalPaginatedResponse } from '@/types/api';

type QueryBuilderFilterValue = string | number | boolean | null;

export interface QueryBuilderParams<
  FilterKeys extends string = string,
  SortKeys extends string = string,
> {
  page?: number;
  filters?: {
    [K in FilterKeys]?: QueryBuilderFilterValue | Readonly<QueryBuilderFilterValue[]>;
  };
  sorts?: {
    [K in SortKeys]?: -1 | 0 | 1 | 'asc' | 'desc' | null;
  };
}

export function getPaginationSet(data: FractalPaginatedResponse['meta']['pagination']): PaginationDataSet {
  return {
    total: data.total,
    count: data.count,
    perPage: data.per_page,
    currentPage: data.current_page,
    totalPages: data.total_pages,
  };
}

export function withQueryBuilderParams(data?: QueryBuilderParams): Record<string, string> {
  if (!data) return {};

  const params: Record<string, string> = {};

  if (data.filters) {
    for (const [key, value] of Object.entries(data.filters)) {
      if (value != null && value !== '') {
        params[`filter[${key}]`] = String(value);
      }
    }
  }

  if (data.sorts) {
    const sortParts: string[] = [];
    for (const [key, value] of Object.entries(data.sorts)) {
      if (value && ['asc', 'desc', 1, -1].includes(value as string | number)) {
        sortParts.push((value === -1 || value === 'desc' ? '-' : '') + key);
      }
    }
    if (sortParts.length) params.sort = sortParts.join(',');
  }

  if (data.page) params.page = String(data.page);

  return params;
}
