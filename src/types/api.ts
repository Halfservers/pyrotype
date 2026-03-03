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

// Generic fractal wrappers for admin API
export interface FractalItem<T> {
  object: string;
  attributes: T;
}

export interface PaginatedResponse<T> {
  object: 'list';
  data: FractalItem<T>[];
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
