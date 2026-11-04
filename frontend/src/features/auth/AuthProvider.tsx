import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'
import { api, ApiError } from '../../lib/api'
import type { Administrator, Session } from '../../lib/api'
import { AuthContext } from './context'
import {
  clearStoredSession,
  readStoredSession,
  storeSession,
} from './sessionStorage'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(readStoredSession)
  const [session, setSession] = useState<Session | null>(null)
  const [notice, setNotice] = useState(initial.notice)
  const [restoring, setRestoring] = useState(!!initial.session)
  const [restoreError, setRestoreError] = useState('')
  const [restoreAttempt, setRestoreAttempt] = useState(0)
  const candidate = useRef(initial.session)
  const current = useRef<Session | null>(null)

  const expire = useCallback((token: string) => {
    if (current.current?.access_token !== token) return
    clearStoredSession()
    current.current = null
    setSession(null)
    setNotice('Your session has ended. Please sign in again.')
  }, [])

  useEffect(() => {
    const saved = candidate.current
    if (!saved) return
    const controller = new AbortController()
    api<Administrator>('/auth/me', {
      token: saved.access_token,
      signal: controller.signal,
    })
      .then((administrator) => {
        if (controller.signal.aborted) return
        if (Date.parse(saved.expires_at) <= Date.now()) {
          clearStoredSession()
          candidate.current = null
          setNotice('Your session has ended. Please sign in again.')
          setRestoring(false)
          return
        }
        const restored = { ...saved, administrator }
        current.current = restored
        candidate.current = null
        setSession(restored)
        setNotice(
          storeSession(restored)
            ? ''
            : 'This browser could not save your sign-in. Reloading may require signing in again.',
        )
        setRestoring(false)
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        if (error instanceof ApiError && error.status === 401) {
          clearStoredSession()
          candidate.current = null
          setNotice('Your session has ended. Please sign in again.')
        } else {
          setRestoreError(
            error instanceof Error
              ? error.message
              : 'Unable to validate your saved session.',
          )
        }
        setRestoring(false)
      })
    return () => controller.abort()
  }, [restoreAttempt])

  useEffect(() => {
    if (!session) return
    const timer = setTimeout(
      () => expire(session.access_token),
      Math.max(0, Date.parse(session.expires_at) - Date.now()),
    )
    return () => clearTimeout(timer)
  }, [session, expire])

  const signIn = async (
    email: string,
    password: string,
    signal: AbortSignal,
  ) => {
    const next = await api<Session>('/auth/login', {
      method: 'POST',
      body: { email, password },
      signal,
    })
    if (signal.aborted) return
    current.current = next
    candidate.current = null
    setNotice(
      storeSession(next)
        ? ''
        : 'This browser could not save your sign-in. Reloading may require signing in again.',
    )
    setSession(next)
  }

  const signOut = async () => {
    const previous = current.current ?? candidate.current
    const cleared = clearStoredSession()
    current.current = null
    candidate.current = null
    setRestoreError('')
    setRestoring(false)
    setSession(null)
    setNotice(
      cleared
        ? 'You have signed out.'
        : 'You have signed out locally. Close this tab to clear its saved sign-in.',
    )
    if (!previous) return
    try {
      await api('/auth/logout', {
        method: 'POST',
        token: previous.access_token,
      })
    } catch (error) {
      if (
        !current.current &&
        !(error instanceof ApiError && error.status === 401)
      ) {
        setNotice(
          'You have signed out locally. Server session revocation could not be confirmed; it will expire automatically.',
        )
      }
    }
  }

  return (
    <AuthContext.Provider value={{ session, notice, signIn, signOut, expire }}>
      {restoring ? (
        <main className="empty-state session-recovery" role="status">
          <LoaderCircle className="spin" size={24} aria-hidden="true" />
          <h1>Restoring your session</h1>
          <p>Checking your sign-in before opening your workspace…</p>
        </main>
      ) : restoreError ? (
        <main className="empty-state session-recovery">
          <h1>We couldn’t restore your session</h1>
          <p role="alert">{restoreError}</p>
          <div className="session-recovery-actions">
            <button
              className="button primary"
              onClick={() => {
                setRestoreError('')
                setRestoring(true)
                setRestoreAttempt((value) => value + 1)
              }}
            >
              Retry
            </button>
            <button
              className="button secondary"
              onClick={() => {
                void signOut()
              }}
            >
              Return to sign in
            </button>
          </div>
        </main>
      ) : (
        children
      )}
    </AuthContext.Provider>
  )
}
