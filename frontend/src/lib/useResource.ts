import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../features/auth/context'
import { api, ApiError } from './api'

interface Resource<T> {
  key: string
  data?: T
  error?: string
  updatedAt?: Date
  loading: boolean
}

export function useResource<T>(path: string | null) {
  const { session, expire } = useAuth()
  const token = session?.access_token
  const [attempt, setAttempt] = useState(0)
  const key = `${token}:${path}:${attempt}`
  const [state, setState] = useState<Resource<T>>({ key: '', loading: true })
  const retry = useCallback(() => setAttempt((value) => value + 1), [])

  useEffect(() => {
    if (!path || !token) return
    const controller = new AbortController()
    api<T>(path, { token, signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ key, data, updatedAt: new Date(), loading: false })
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        if (error instanceof ApiError && error.status === 401) expire(token)
        else
          setState({
            key,
            error:
              error instanceof Error ? error.message : 'The request failed.',
            loading: false,
          })
      })
    return () => controller.abort()
  }, [path, token, key, attempt, expire])

  const visible: Resource<T> =
    state.key === key && path ? state : { key, loading: true }
  return {
    data: visible.data,
    error: visible.error,
    updatedAt: visible.updatedAt,
    loading: visible.loading,
    retry,
  }
}
