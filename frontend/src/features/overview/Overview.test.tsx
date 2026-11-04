import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { api, ApiError } from '../../lib/api'
import { Overview } from './Overview'

const auth = vi.hoisted(() => ({
  session: { access_token: 'test-session' },
  expire: vi.fn(),
}))
vi.mock('../auth/context', () => ({ useAuth: () => auth }))
vi.mock('../../lib/api', async (original) => ({
  ...(await original<typeof import('../../lib/api')>()),
  api: vi.fn(),
}))
afterEach(() => vi.mocked(api).mockReset())

const summary = {
  total_users: 2,
  active_users: 1,
  inactive_users: 1,
  pending_users: 0,
}
const page = {
  items: [
    {
      id: 1,
      full_name: 'Amara Okafor',
      email: 'amara@example.com',
      status: 'active',
      role: 'member',
      joined_date: '2026-01-05',
    },
  ],
  total: 2,
  page: 1,
  page_size: 10,
  total_pages: 1,
}

it('uses API counts for the account mix and shows recent users from the directory', async () => {
  vi.mocked(api).mockImplementation(async (path) =>
    path === '/dashboard/summary' ? summary : page,
  )
  render(
    <MemoryRouter>
      <Overview />
    </MemoryRouter>,
  )
  await act(async () => {})
  expect(
    screen.getByRole('img', { name: '1 active, 1 inactive, 0 pending users' }),
  ).toBeInTheDocument()
  expect(screen.getByText('50%')).toBeInTheDocument()
  expect(screen.getByText('Amara Okafor')).toBeInTheDocument()
  expect(
    screen.getByRole('link', { name: 'View active users' }),
  ).toHaveAttribute('href', '/users?status=active')
})

it('handles a zero-user summary without invalid percentages', async () => {
  vi.mocked(api).mockImplementation(async (path) =>
    path === '/dashboard/summary'
      ? { total_users: 0, active_users: 0, inactive_users: 0, pending_users: 0 }
      : { ...page, total: 0, items: [] },
  )
  render(
    <MemoryRouter>
      <Overview />
    </MemoryRouter>,
  )
  await act(async () => {})
  expect(
    screen.getByRole('img', { name: 'No users in the directory' }),
  ).toBeInTheDocument()
  expect(screen.getByText('Your directory starts here')).toBeInTheDocument()
  expect(screen.queryByText('NaN%')).not.toBeInTheDocument()
})

it('retries recent-user failures independently of the available summary', async () => {
  let failed = true
  vi.mocked(api).mockImplementation(async (path) => {
    if (path === '/dashboard/summary') return summary
    if (failed) throw new ApiError('Directory unavailable')
    return page
  })
  render(
    <MemoryRouter>
      <Overview />
    </MemoryRouter>,
  )
  await act(async () => {})
  expect(screen.getByRole('alert')).toHaveTextContent('Directory unavailable')
  expect(screen.getByText('50%')).toBeInTheDocument()
  failed = false
  await act(async () =>
    fireEvent.click(screen.getByRole('button', { name: 'Retry' })),
  )
  expect(screen.getByText('Amara Okafor')).toBeInTheDocument()
})
