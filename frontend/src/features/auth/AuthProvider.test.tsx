import { StrictMode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { api, ApiError } from '../../lib/api'
import type { Session } from '../../lib/api'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './context'
import { SESSION_STORAGE_KEY } from './sessionStorage'

vi.mock('../../lib/api', async (original) => ({
  ...(await original<typeof import('../../lib/api')>()),
  api: vi.fn(),
}))

function session(
  expiresAt = new Date(Date.now() + 60_000).toISOString(),
): Session {
  return {
    access_token: 'fictional-session-token-for-testing',
    token_type: 'bearer',
    expires_at: expiresAt,
    administrator: { id: 1, email: 'admin@example.com' },
  }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
function Probe() {
  const { session, signIn, signOut, notice } = useAuth()
  return (
    <>
      <p>
        {session ? `Signed in: ${session.administrator.email}` : 'Signed out'}
      </p>
      <p data-testid="notice">{notice}</p>
      <button
        onClick={() => {
          void signIn(
            'admin@example.com',
            'fictional-password',
            new AbortController().signal,
          )
        }}
      >
        Log in
      </button>
      <button
        onClick={() => {
          void signOut()
        }}
      >
        Log out
      </button>
    </>
  )
}
function saved(value = session()) {
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(value))
  return value
}
beforeEach(() => {
  window.sessionStorage.clear()
  vi.mocked(api).mockReset()
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

it('validates saved credentials before rendering protected children and retains the expiry', async () => {
  const original = saved()
  const validation = deferred<{ id: number; email: string }>()
  vi.mocked(api).mockReturnValueOnce(validation.promise)
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
  expect(
    screen.getByRole('heading', { name: 'Restoring your session' }),
  ).toBeInTheDocument()
  expect(screen.queryByText(/Signed in:/)).not.toBeInTheDocument()
  expect(vi.mocked(api).mock.calls[0][0]).toBe('/auth/me')
  await act(async () =>
    validation.resolve({ id: 1, email: 'verified@example.com' }),
  )
  expect(
    screen.getByText('Signed in: verified@example.com'),
  ).toBeInTheDocument()
  expect(
    JSON.parse(window.sessionStorage.getItem(SESSION_STORAGE_KEY)!).expires_at,
  ).toBe(original.expires_at)
})

it('persists only allowlisted session fields after login and clears them before logout completes', async () => {
  const logout = deferred<void>()
  vi.mocked(api)
    .mockResolvedValueOnce({ ...session(), password: 'must-not-be-persisted' })
    .mockReturnValueOnce(logout.promise)
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
  await act(async () =>
    fireEvent.click(screen.getByRole('button', { name: 'Log in' })),
  )
  const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY)!
  expect(stored).toContain('fictional-session-token-for-testing')
  expect(stored).not.toContain('password')
  fireEvent.click(screen.getByRole('button', { name: 'Log out' }))
  expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  expect(screen.getByText('Signed out')).toBeInTheDocument()
  await act(async () => logout.reject(new ApiError('Offline')))
  expect(screen.getByTestId('notice')).toHaveTextContent(
    'Server session revocation could not be confirmed',
  )
})

it.each([
  '{broken-json',
  JSON.stringify({ ...session(), expires_at: 'invalid' }),
  JSON.stringify(session(new Date(Date.now() - 1_000).toISOString())),
])('discards invalid or expired storage without trusting it: %s', (raw) => {
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, raw)
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
  expect(screen.getByText('Signed out')).toBeInTheDocument()
  expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  expect(api).not.toHaveBeenCalled()
})

it('clears a revoked session when server validation rejects it', async () => {
  saved()
  vi.mocked(api).mockRejectedValueOnce(new ApiError('Revoked', 401))
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
  await act(async () => {})
  expect(screen.getByText('Signed out')).toBeInTheDocument()
  expect(screen.getByTestId('notice')).toHaveTextContent(
    'Your session has ended',
  )
  expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
})

it('keeps a saved session on a temporary network failure and validates it on retry', async () => {
  saved()
  vi.mocked(api)
    .mockRejectedValueOnce(new ApiError('Offline'))
    .mockResolvedValueOnce({ id: 1, email: 'admin@example.com' })
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
  await act(async () => {})
  expect(screen.getByRole('alert')).toHaveTextContent('Offline')
  expect(screen.queryByText(/Signed in:/)).not.toBeInTheDocument()
  expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).not.toBeNull()
  await act(async () =>
    fireEvent.click(screen.getByRole('button', { name: 'Retry' })),
  )
  expect(screen.getByText('Signed in: admin@example.com')).toBeInTheDocument()
})

it('lets the user clear saved sign-in after a failed restoration', async () => {
  saved()
  vi.mocked(api)
    .mockRejectedValueOnce(new ApiError('Offline'))
    .mockResolvedValueOnce(undefined)
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
  await act(async () => {})
  await act(async () =>
    fireEvent.click(screen.getByRole('button', { name: 'Return to sign in' })),
  )
  expect(screen.getByText('Signed out')).toBeInTheDocument()
  expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
})

it('ignores an aborted StrictMode restore response', async () => {
  saved()
  const old = deferred<{ id: number; email: string }>()
  const next = deferred<{ id: number; email: string }>()
  vi.mocked(api)
    .mockReturnValueOnce(old.promise)
    .mockReturnValueOnce(next.promise)
  render(
    <StrictMode>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </StrictMode>,
  )
  expect(vi.mocked(api).mock.calls[0][1]?.signal?.aborted).toBe(true)
  await act(async () => next.resolve({ id: 1, email: 'verified@example.com' }))
  await act(async () => old.resolve({ id: 99, email: 'stale@example.com' }))
  expect(
    screen.getByText('Signed in: verified@example.com'),
  ).toBeInTheDocument()
})

it('clears the saved session at the original expiry', async () => {
  vi.useFakeTimers()
  vi.mocked(api).mockResolvedValueOnce(
    session(new Date(Date.now() + 1_000).toISOString()),
  )
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
  await act(async () =>
    fireEvent.click(screen.getByRole('button', { name: 'Log in' })),
  )
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1_000)
  })
  expect(screen.getByText('Signed out')).toBeInTheDocument()
  expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
})

it('keeps login usable and explains when browser storage is unavailable', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Blocked', 'SecurityError')
  })
  vi.mocked(api).mockResolvedValueOnce(session())
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
  await act(async () =>
    fireEvent.click(screen.getByRole('button', { name: 'Log in' })),
  )
  expect(screen.getByText('Signed in: admin@example.com')).toBeInTheDocument()
  expect(screen.getByTestId('notice')).toHaveTextContent(
    'could not save your sign-in',
  )
})
