import type { Session } from '../../lib/api'

export const SESSION_STORAGE_KEY = 'credisure.session.v1'

export function clearStoredSession(): boolean {
  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

export function storeSession(session: Session): boolean {
  try {
    // Persist only session fields, never credentials or protected directory data.
    window.sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        access_token: session.access_token,
        token_type: session.token_type,
        expires_at: session.expires_at,
        administrator: {
          id: session.administrator.id,
          email: session.administrator.email,
        },
      }),
    )
    return true
  } catch {
    return false
  }
}

export function readStoredSession(): {
  session: Session | null
  notice: string
} {
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return { session: null, notice: '' }
    const value = JSON.parse(raw)
    if (
      typeof value?.access_token !== 'string' ||
      value.access_token.length < 16 ||
      value.access_token.length > 256 ||
      value.token_type !== 'bearer' ||
      typeof value.expires_at !== 'string' ||
      !Number.isFinite(Date.parse(value.expires_at)) ||
      Date.parse(value.expires_at) <= Date.now() ||
      Date.parse(value.expires_at) - Date.now() > 86_400_000 ||
      !Number.isInteger(value.administrator?.id) ||
      value.administrator.id <= 0 ||
      typeof value.administrator.email !== 'string' ||
      !value.administrator.email ||
      value.administrator.email.length > 254
    ) {
      clearStoredSession()
      return {
        session: null,
        notice: 'Your saved session has ended. Please sign in again.',
      }
    }
    return {
      session: {
        access_token: value.access_token,
        token_type: value.token_type,
        expires_at: value.expires_at,
        administrator: {
          id: value.administrator.id,
          email: value.administrator.email,
        },
      },
      notice: '',
    }
  } catch {
    clearStoredSession()
    return {
      session: null,
      notice: 'Your saved sign-in could not be read. Please sign in again.',
    }
  }
}
