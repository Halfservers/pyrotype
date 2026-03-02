export interface FractalItem<T> {
  object: string;
  attributes: T;
}

export interface FractalList<T> {
  object: 'list';
  data: FractalItem<T>[];
}

export interface FractalPaginated<T> {
  object: 'list';
  data: FractalItem<T>[];
  meta: {
    pagination: {
      total: number;
      count: number;
      per_page: number;
      current_page: number;
      total_pages: number;
      links: Record<string, string>;
    };
  };
}

export function fractalItem<T>(object: string, attributes: T): FractalItem<T> {
  return { object, attributes };
}

export function fractalList<T>(object: string, items: T[]): FractalList<T> {
  return {
    object: 'list',
    data: items.map((item) => fractalItem(object, item)),
  };
}

export function fractalPaginated<T>(
  object: string,
  items: T[],
  total: number,
  page: number,
  perPage: number,
): FractalPaginated<T> {
  return {
    object: 'list',
    data: items.map((item) => fractalItem(object, item)),
    meta: {
      pagination: {
        total,
        count: items.length,
        per_page: perPage,
        current_page: page,
        total_pages: Math.ceil(total / perPage),
        links: {},
      },
    },
  };
}
