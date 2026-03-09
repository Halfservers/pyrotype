import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fractalItem,
  fractalList,
  fractalPaginated,
} from '../../src/utils/response'

describe('fractalItem', () => {
  it('wraps attributes with object type', () => {
    const result = fractalItem('server', { id: 1, name: 'Test' })

    expect(result).toEqual({
      object: 'server',
      attributes: { id: 1, name: 'Test' },
    })
  })

  it('preserves the exact object string', () => {
    const result = fractalItem('custom_object', { foo: 'bar' })
    expect(result.object).toBe('custom_object')
  })

  it('handles empty attributes', () => {
    const result = fractalItem('empty', {})
    expect(result).toEqual({ object: 'empty', attributes: {} })
  })

  it('handles complex nested attributes', () => {
    const attrs = {
      id: 1,
      relationships: {
        allocations: { object: 'list', data: [] },
      },
    }
    const result = fractalItem('server', attrs)
    expect(result.attributes).toEqual(attrs)
  })

  it('handles null and undefined attribute values', () => {
    const result = fractalItem('server', { id: null, name: undefined })
    expect(result.attributes.id).toBeNull()
    expect(result.attributes.name).toBeUndefined()
  })
})

describe('fractalList', () => {
  it('wraps array of items correctly', () => {
    const items = [
      { id: 1, name: 'Server A' },
      { id: 2, name: 'Server B' },
    ]
    const result = fractalList('server', items)

    expect(result.object).toBe('list')
    expect(result.data).toHaveLength(2)
    expect(result.data[0]).toEqual({
      object: 'server',
      attributes: { id: 1, name: 'Server A' },
    })
    expect(result.data[1]).toEqual({
      object: 'server',
      attributes: { id: 2, name: 'Server B' },
    })
  })

  it('handles empty array', () => {
    const result = fractalList('server', [])

    expect(result.object).toBe('list')
    expect(result.data).toEqual([])
    expect(result.data).toHaveLength(0)
  })

  it('handles single item array', () => {
    const result = fractalList('node', [{ id: 1 }])

    expect(result.data).toHaveLength(1)
    expect(result.data[0].object).toBe('node')
  })

  it('each data element has object and attributes keys', () => {
    const result = fractalList('egg', [{ name: 'Vanilla' }, { name: 'Paper' }])

    for (const item of result.data) {
      expect(item).toHaveProperty('object', 'egg')
      expect(item).toHaveProperty('attributes')
    }
  })
})

describe('fractalPaginated', () => {
  it('includes pagination metadata', () => {
    const items = [{ id: 1 }, { id: 2 }]
    const result = fractalPaginated('server', items, 50, 1, 25)

    expect(result.object).toBe('list')
    expect(result.data).toHaveLength(2)
    expect(result.meta.pagination).toEqual({
      total: 50,
      count: 2,
      per_page: 25,
      current_page: 1,
      total_pages: 2,
      links: {},
    })
  })

  it('calculates total_pages correctly', () => {
    const result = fractalPaginated('server', [], 100, 1, 25)
    expect(result.meta.pagination.total_pages).toBe(4)
  })

  it('calculates total_pages with non-even division', () => {
    const result = fractalPaginated('server', [], 101, 1, 25)
    expect(result.meta.pagination.total_pages).toBe(5) // Math.ceil(101/25)
  })

  it('count reflects actual items in page, not total', () => {
    // Last page with only 3 items out of 53 total
    const lastPageItems = [{ id: 51 }, { id: 52 }, { id: 53 }]
    const result = fractalPaginated('server', lastPageItems, 53, 3, 25)

    expect(result.meta.pagination.count).toBe(3)
    expect(result.meta.pagination.total).toBe(53)
    expect(result.meta.pagination.current_page).toBe(3)
  })

  it('handles empty list with zero total', () => {
    const result = fractalPaginated('server', [], 0, 1, 25)

    expect(result.data).toEqual([])
    expect(result.meta.pagination.total).toBe(0)
    expect(result.meta.pagination.count).toBe(0)
    expect(result.meta.pagination.total_pages).toBe(0)
    expect(result.meta.pagination.current_page).toBe(1)
  })

  it('handles large pagination values', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }))
    const result = fractalPaginated('server', items, 1_000_000, 500, 100)

    expect(result.meta.pagination.total).toBe(1_000_000)
    expect(result.meta.pagination.count).toBe(100)
    expect(result.meta.pagination.per_page).toBe(100)
    expect(result.meta.pagination.current_page).toBe(500)
    expect(result.meta.pagination.total_pages).toBe(10_000)
  })

  it('wraps each item with fractalItem structure', () => {
    const items = [{ name: 'Alpha' }, { name: 'Beta' }]
    const result = fractalPaginated('location', items, 2, 1, 10)

    for (const item of result.data) {
      expect(item).toHaveProperty('object', 'location')
      expect(item).toHaveProperty('attributes')
    }
  })

  it('links is an empty object by default', () => {
    const result = fractalPaginated('server', [{ id: 1 }], 1, 1, 10)
    expect(result.meta.pagination.links).toEqual({})
  })

  it('per_page of 1 gives total_pages equal to total', () => {
    const result = fractalPaginated('server', [{ id: 1 }], 7, 1, 1)
    expect(result.meta.pagination.total_pages).toBe(7)
  })
})
