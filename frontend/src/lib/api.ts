const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
const configuredTimeout = Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS || 10000)
const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 10000

export class ApiError extends Error {
  status: number
  constructor(message: string, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function api<T>(path: string, options: {
  token?: string; method?: 'GET' | 'POST'; body?: unknown; signal?: AbortSignal
} = {}): Promise<T> {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => { timedOut = true; controller.abort() }, timeoutMs)
  const signal = options.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method || 'GET', signal, cache: 'no-store',
      headers: {
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new ApiError(payload?.error?.message || 'The request failed. Please try again.', response.status)
    }
    return response.status === 204 ? undefined as T : await response.json() as T
  } catch (error) {
    if (options.signal?.aborted) throw error
    if (timedOut) throw new ApiError('The request timed out. Please try again.')
    if (error instanceof ApiError) throw error
    throw new ApiError('Unable to reach the server. Check your connection and try again.')
  } finally {
    clearTimeout(timer)
  }
}

export interface Administrator { id: number; email: string }
export interface Session {
  access_token: string; token_type: string; expires_at: string; administrator: Administrator
}
export interface Summary {
  total_users: number; active_users: number; inactive_users: number; pending_users: number
}
export interface DirectoryUser {
  id: number; full_name: string; email: string; role: 'admin' | 'member'
  status: 'active' | 'inactive' | 'pending'; joined_date: string
}
export interface UserPage {
  items: DirectoryUser[]; total: number; page: number; page_size: number; total_pages: number
}
