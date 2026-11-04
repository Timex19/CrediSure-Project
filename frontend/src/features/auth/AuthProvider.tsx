import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { api, ApiError } from '../../lib/api'
import type { Session } from '../../lib/api'
import { AuthContext } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [notice, setNotice] = useState('')
  const current = useRef<Session | null>(null)

  const expire = useCallback((token: string) => {
    if (current.current?.access_token !== token) return
    current.current = null
    setSession(null)
    setNotice('Your session has ended. Please sign in again.')
  }, [])

  useEffect(() => {
    if (!session) return
    const timer = setTimeout(() => expire(session.access_token), Math.max(0, Date.parse(session.expires_at) - Date.now()))
    return () => clearTimeout(timer)
  }, [session, expire])

  const signIn = async (email: string, password: string, signal: AbortSignal) => {
    const next = await api<Session>('/auth/login', { method: 'POST', body: { email, password }, signal })
    if (signal.aborted) return
    current.current = next
    setNotice('')
    setSession(next)
  }

  const signOut = async () => {
    const previous = current.current
    current.current = null
    setSession(null)
    setNotice('You have signed out.')
    if (!previous) return
    try {
      await api('/auth/logout', { method: 'POST', token: previous.access_token })
    } catch (error) {
      if (!current.current && !(error instanceof ApiError && error.status === 401)) {
        setNotice('You have signed out locally. Server session revocation could not be confirmed; it will expire automatically.')
      }
    }
  }

  return <AuthContext.Provider value={{ session, notice, signIn, signOut, expire }}>{children}</AuthContext.Provider>
}
