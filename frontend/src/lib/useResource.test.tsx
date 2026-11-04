import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from './api'
import { useResource } from './useResource'

const auth = vi.hoisted(() => ({
  session: { access_token: 'test-session' },
  expire: vi.fn(),
}))
vi.mock('../features/auth/context', () => ({ useAuth: () => auth }))
vi.mock('./api', async (original) => ({
  ...(await original<typeof import('./api')>()),
  api: vi.fn(),
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

describe('page request lifecycle', () => {
  beforeEach(() => {
    vi.mocked(api).mockReset()
    auth.expire.mockReset()
  })

  it('ignores older responses and cancels superseded requests', async () => {
    const old = deferred<{ value: number }>()
    const next = deferred<{ value: number }>()
    vi.mocked(api)
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(next.promise)
    const { result, rerender } = renderHook(
      ({ path }) => useResource<{ value: number }>(path),
      { initialProps: { path: '/old' } },
    )
    rerender({ path: '/new' })
    expect(vi.mocked(api).mock.calls[0][1]?.signal?.aborted).toBe(true)
    await act(async () => next.resolve({ value: 2 }))
    expect(result.current.data?.value).toBe(2)
    await act(async () => old.resolve({ value: 1 }))
    expect(result.current.data?.value).toBe(2)
  })

  it('clears old data while waiting for debounce and retries the current request', async () => {
    vi.mocked(api)
      .mockResolvedValueOnce({ value: 1 })
      .mockRejectedValueOnce(new ApiError('Offline'))
      .mockResolvedValueOnce({ value: 2 })
    const { result, rerender } = renderHook(
      ({ path }: { path: string | null }) =>
        useResource<{ value: number }>(path),
      { initialProps: { path: '/first' as string | null } },
    )
    await act(async () => {})
    expect(result.current.data?.value).toBe(1)
    rerender({ path: null })
    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeUndefined()
    rerender({ path: '/second' })
    await act(async () => {})
    expect(result.current.error).toBe('Offline')
    await act(async () => result.current.retry())
    expect(result.current.data?.value).toBe(2)
    expect(vi.mocked(api).mock.calls.at(-1)?.[0]).toBe('/second')
  })

  it('expires the matching session on an unauthorized response', async () => {
    vi.mocked(api).mockRejectedValueOnce(new ApiError('Expired', 401))
    renderHook(() => useResource('/protected'))
    await act(async () => {})
    expect(auth.expire).toHaveBeenCalledWith('test-session')
  })
})
