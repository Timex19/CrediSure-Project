import { AlertCircle, Check, LoaderCircle, RefreshCw } from 'lucide-react'

export function RequestStatus({ loading, error, updatedAt, updating = false }: {
  loading: boolean; error?: string; updatedAt?: Date; updating?: boolean
}) {
  const label = updating ? 'Updating' : loading ? 'Loading' : error ? 'Failed' : updatedAt ? 'Updated' : 'Not loaded'
  return <div className={`request-status ${error ? 'failed' : ''}`} role="status" aria-live="polite">
    <span className="status-caption">API request</span>
    {loading || updating ? <LoaderCircle size={14} className="spin" aria-hidden="true" /> : error ? <AlertCircle size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
    <span>{label}{!loading && !error && updatedAt && <> at <time dateTime={updatedAt.toISOString()}>{updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></>}</span>
  </div>
}

export function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <div className="empty-state" role="alert">
    <span className="empty-icon error-icon"><AlertCircle aria-hidden="true" /></span>
    <h3>We couldn’t load this data</h3><p>{message}</p>
    <button className="button secondary" onClick={retry}><RefreshCw size={16} aria-hidden="true" />Retry</button>
  </div>
}
