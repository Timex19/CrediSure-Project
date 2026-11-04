import { expect, it } from 'vitest'
import { readQuery } from './query'

it('uses safe defaults for invalid URL parameters', () => {
  expect(
    readQuery(new URLSearchParams('page=-1&page_size=500&status=unknown')),
  ).toEqual({ search: '', status: '', page: 1, page_size: 10 })
  expect(
    readQuery(new URLSearchParams('page=Infinity&search=' + 'a'.repeat(101)))
      .search,
  ).toHaveLength(100)
})

it('preserves supported search, status and pagination parameters', () => {
  expect(
    readQuery(
      new URLSearchParams('search=Amara&status=active&page=3&page_size=25'),
    ),
  ).toEqual({ search: 'Amara', status: 'active', page: 3, page_size: 25 })
})
