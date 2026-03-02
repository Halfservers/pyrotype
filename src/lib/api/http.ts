import axios, { type AxiosInstance } from 'axios';

let onRequestStart: (() => void) | null = null;
let onRequestEnd: (() => void) | null = null;

export function setProgressCallbacks(start: () => void, end: () => void) {
  onRequestStart = start;
  onRequestEnd = end;
}

const http: AxiosInstance = axios.create({
  withCredentials: true,
  timeout: 20000,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

http.interceptors.request.use((req) => {
  if (!req.url?.endsWith('/resources')) onRequestStart?.();
  return req;
});

http.interceptors.response.use(
  (resp) => {
    if (!resp.request?.url?.endsWith('/resources')) onRequestEnd?.();
    return resp;
  },
  (error) => {
    onRequestEnd?.();
    throw error;
  },
);

export default http;

export function httpErrorToHuman(error: any): string {
  if (error.response && error.response.data) {
    let { data } = error.response;

    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        // bad json
      }
    }

    if (data.errors && data.errors[0] && data.errors[0].detail) {
      return data.errors[0].detail;
    }

    if (data.error && typeof data.error === 'string') {
      return data.error;
    }
  }

  return error.message;
}

export interface FractalResponseData {
  object: string;
  attributes: {
    [k: string]: any;
    relationships?: Record<string, FractalResponseData | FractalResponseList | null | undefined>;
  };
}

export interface FractalResponseList {
  object: 'list';
  data: FractalResponseData[];
}

export interface FractalPaginatedResponse extends FractalResponseList {
  meta: {
    pagination: {
      total: number;
      count: number;
      per_page: number;
      current_page: number;
      total_pages: number;
    };
  };
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationDataSet;
}

export interface PaginationDataSet {
  total: number;
  count: number;
  perPage: number;
  currentPage: number;
  totalPages: number;
}

export function getPaginationSet(data: any): PaginationDataSet {
  return {
    total: data.total,
    count: data.count,
    perPage: data.per_page,
    currentPage: data.current_page,
    totalPages: data.total_pages,
  };
}

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

export const withQueryBuilderParams = (data?: QueryBuilderParams): Record<string, unknown> => {
  if (!data) return {};

  const filters = Object.keys(data.filters || {}).reduce(
    (obj, key) => {
      const value = data.filters?.[key];
      return !value || value === '' ? obj : { ...obj, [`filter[${key}]`]: value };
    },
    {} as NonNullable<QueryBuilderParams['filters']>,
  );

  const sorts = Object.keys(data.sorts || {}).reduce((arr, key) => {
    const value = data.sorts?.[key];
    if (!value || !['asc', 'desc', 1, -1].includes(value)) {
      return arr;
    }
    return [...arr, (value === -1 || value === 'desc' ? '-' : '') + key];
  }, [] as string[]);

  return {
    ...filters,
    sort: !sorts.length ? undefined : sorts.join(','),
    page: data.page,
  };
};
