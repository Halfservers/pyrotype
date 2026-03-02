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

export interface PaginationDataSet {
  total: number;
  count: number;
  perPage: number;
  currentPage: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationDataSet;
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
