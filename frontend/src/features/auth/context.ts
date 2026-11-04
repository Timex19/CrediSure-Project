import { createContext, useContext } from 'react'
import type { Session } from '../../lib/api'

export interface AuthState {
  session: Session | null; notice: string
  signIn: (email: string, password: string, signal: AbortSignal) => Promise<void>
  signOut: () => Promise<void>
  expire: (token: string) => void
}
export const AuthContext = createContext<AuthState | null>(null)
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider is required')
  return value
}
