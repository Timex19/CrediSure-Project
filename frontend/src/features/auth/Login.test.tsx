import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { expect, it, vi } from 'vitest'
import { Login } from './Login'
import { AuthContext } from './context'

it('validates fields, focuses errors and prevents duplicate submissions', async () => {
  let finish!: () => void
  const signIn = vi.fn(
    (_email: string, _password: string, _signal: AbortSignal) =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  render(
    <MemoryRouter>
      <AuthContext.Provider
        value={{
          session: null,
          notice: '',
          signIn,
          signOut: vi.fn(),
          expire: vi.fn(),
        }}
      >
        <Login />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: /^Sign in$/ }))
  expect(screen.getByText('Enter your email address.')).toBeInTheDocument()
  expect(screen.getByLabelText('Email address')).toHaveFocus()
  expect(signIn).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: 'admin@example.com' },
  })
  fireEvent.change(screen.getByLabelText('Password', { exact: true }), {
    target: { value: ' password with spaces ' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
  expect(screen.getByLabelText('Password', { exact: true })).toHaveAttribute(
    'type',
    'text',
  )
  fireEvent.click(screen.getByRole('button', { name: /^Sign in$/ }))
  expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled()
  expect(signIn.mock.calls[0][1]).toBe(' password with spaces ')
  await act(async () => finish())
})
