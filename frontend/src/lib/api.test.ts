import { afterEach, expect, it, vi } from 'vitest'
import { api } from './api'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

it('times out an unresponsive request with actionable feedback', async () => {
  vi.useFakeTimers()
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          )
        }),
    ),
  )
  const result = api('/users').catch((error) => error)
  await vi.advanceTimersByTimeAsync(10000)
  expect(await result).toMatchObject({
    message: expect.stringContaining('timed out'),
  })
})

it('preserves cancellation so it is not reported as a connection failure', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          )
        }),
    ),
  )
  const controller = new AbortController()
  const result = api('/users', { signal: controller.signal }).catch(
    (error) => error,
  )
  controller.abort()
  expect(await result).toMatchObject({ name: 'AbortError' })
})
