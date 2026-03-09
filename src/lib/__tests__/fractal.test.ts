import { describe, it, expect } from 'vitest';

import { getPaginationSet, withQueryBuilderParams } from '../fractal';

describe('getPaginationSet', () => {
  it('maps snake_case pagination fields to camelCase', () => {
    const input = {
      total: 100,
      count: 25,
      per_page: 25,
      current_page: 2,
      total_pages: 4,
    };

    expect(getPaginationSet(input)).toEqual({
      total: 100,
      count: 25,
      perPage: 25,
      currentPage: 2,
      totalPages: 4,
    });
  });

  it('handles single-page results', () => {
    const input = {
      total: 3,
      count: 3,
      per_page: 50,
      current_page: 1,
      total_pages: 1,
    };

    const result = getPaginationSet(input);
    expect(result.total).toBe(3);
    expect(result.totalPages).toBe(1);
  });
});

describe('withQueryBuilderParams', () => {
  it('returns empty object for undefined input', () => {
    expect(withQueryBuilderParams()).toEqual({});
    expect(withQueryBuilderParams(undefined)).toEqual({});
  });

  it('returns empty object for empty params', () => {
    expect(withQueryBuilderParams({})).toEqual({});
  });

  it('converts filters to filter[key] format', () => {
    const result = withQueryBuilderParams({
      filters: { name: 'test', status: 'active' },
    });

    expect(result).toEqual({
      'filter[name]': 'test',
      'filter[status]': 'active',
    });
  });

  it('skips null filter values', () => {
    const result = withQueryBuilderParams({
      filters: { name: 'test', status: null },
    });

    expect(result).toEqual({ 'filter[name]': 'test' });
    expect(result).not.toHaveProperty('filter[status]');
  });

  it('skips empty string filter values', () => {
    const result = withQueryBuilderParams({
      filters: { name: '', status: 'active' },
    });

    expect(result).toEqual({ 'filter[status]': 'active' });
  });

  it('converts boolean and numeric filter values to strings', () => {
    const result = withQueryBuilderParams({
      filters: { enabled: true, count: 5 },
    });

    expect(result['filter[enabled]']).toBe('true');
    expect(result['filter[count]']).toBe('5');
  });

  it('converts ascending sorts without prefix', () => {
    const result = withQueryBuilderParams({
      sorts: { name: 'asc' },
    });

    expect(result.sort).toBe('name');
  });

  it('converts ascending sorts with numeric 1', () => {
    const result = withQueryBuilderParams({
      sorts: { name: 1 },
    });

    expect(result.sort).toBe('name');
  });

  it('converts descending sorts with - prefix', () => {
    const result = withQueryBuilderParams({
      sorts: { name: 'desc' },
    });

    expect(result.sort).toBe('-name');
  });

  it('converts descending sorts with numeric -1', () => {
    const result = withQueryBuilderParams({
      sorts: { name: -1 },
    });

    expect(result.sort).toBe('-name');
  });

  it('combines multiple sorts with comma', () => {
    const result = withQueryBuilderParams({
      sorts: { name: 'asc', created: 'desc' },
    });

    expect(result.sort).toBe('name,-created');
  });

  it('skips null and 0 sort values', () => {
    const result = withQueryBuilderParams({
      sorts: { name: 'asc', ignored: null, also_ignored: 0 },
    });

    expect(result.sort).toBe('name');
  });

  it('sets page parameter', () => {
    const result = withQueryBuilderParams({ page: 3 });
    expect(result.page).toBe('3');
  });

  it('omits page when not set or zero', () => {
    const result = withQueryBuilderParams({ page: 0 });
    expect(result).not.toHaveProperty('page');
  });

  it('combines filters, sorts, and page together', () => {
    const result = withQueryBuilderParams({
      filters: { status: 'running' },
      sorts: { name: 'asc', memory: -1 },
      page: 2,
    });

    expect(result).toEqual({
      'filter[status]': 'running',
      sort: 'name,-memory',
      page: '2',
    });
  });
});
