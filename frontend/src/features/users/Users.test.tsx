import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { api } from '../../lib/api'
import { Users } from './Users'

const auth = vi.hoisted(() => ({
  session: { access_token: 'test-session' },
  expire: vi.fn(),
}))
vi.mock('../auth/context', () => ({ useAuth: () => auth }))
vi.mock('../../lib/api', async (original) => ({
  ...(await original<typeof import('../../lib/api')>()),
  api: vi.fn(),
}))
afterEach(() => {
  vi.useRealTimers()
  vi.mocked(api).mockReset()
})

it('debounces search, resets page, preserves page size and applies status immediately', async () => {
  vi.useFakeTimers()
  vi.mocked(api).mockResolvedValue({
    items: [],
    total: 80,
    total_pages: 4,
    page: 2,
    page_size: 25,
  })
  render(
    <MemoryRouter initialEntries={['/users?page=2&page_size=25']}>
      <Users />
    </MemoryRouter>,
  )
  await act(async () => {})
  expect(vi.mocked(api).mock.calls[0][0]).toContain('page=2')
  const search = screen.getByLabelText('Search users by name or email')
  fireEvent.change(search, { target: { value: 'a' } })
  fireEvent.change(search, { target: { value: 'am' } })
  fireEvent.change(search, { target: { value: 'amara' } })
  expect(screen.getByRole('status')).toHaveTextContent('Updating')
  await act(async () => {
    await vi.advanceTimersByTimeAsync(299)
  })
  expect(api).toHaveBeenCalledTimes(1)
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1)
  })
  expect(api).toHaveBeenCalledTimes(2)
  expect(vi.mocked(api).mock.calls[1][0]).toBe(
    '/users?page=1&page_size=25&search=amara',
  )
  await act(async () =>
    fireEvent.change(screen.getByLabelText('Status'), {
      target: { value: 'active' },
    }),
  )
  expect(vi.mocked(api).mock.calls.at(-1)?.[0]).toContain('status=active')
})
