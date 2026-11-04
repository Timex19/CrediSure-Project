import { useEffect, useState } from 'react'
import {
  Search,
  Users as UsersIcon,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { useSearchParams } from 'react-router'
import type { UserPage } from '../../lib/api'
import { useResource } from '../../lib/useResource'
import { ErrorState, RequestStatus } from '../../components/Feedback'
import { readQuery } from './query'
import styles from './Users.module.css'

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export function Users() {
  const [params, setParams] = useSearchParams()
  const query = readQuery(params)
  const [settledSearch, setSettledSearch] = useState(query.search)
  const updating = settledSearch !== query.search
  useEffect(() => {
    const timer = setTimeout(() => setSettledSearch(query.search), 300)
    return () => clearTimeout(timer)
  }, [query.search])
  const apiParams = new URLSearchParams({
    page: String(query.page),
    page_size: String(query.page_size),
  })
  if (settledSearch.trim()) apiParams.set('search', settledSearch.trim())
  if (query.status) apiParams.set('status', query.status)
  const resource = useResource<UserPage>(
    updating ? null : `/users?${apiParams}`,
  )
  const { data, loading, error } = resource

  function update(changes: Partial<typeof query>, replace = false) {
    const next = { ...query, ...changes }
    const updated = new URLSearchParams()
    if (next.search) updated.set('search', next.search)
    if (next.status) updated.set('status', next.status)
    if (next.page > 1) updated.set('page', String(next.page))
    if (next.page_size !== 10) updated.set('page_size', String(next.page_size))
    setParams(updated, { replace })
  }
  useEffect(() => {
    if (data && data.total_pages > 0 && query.page > data.total_pages) {
      const next = new URLSearchParams(params)
      next.set('page', String(data.total_pages))
      setParams(next, { replace: true })
    }
  }, [data, query.page, params, setParams])

  function clear() {
    setSettledSearch('')
    update({ search: '', status: '', page: 1 })
  }
  const filtered = !!query.search.trim() || !!query.status

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR PEOPLE</p>
          <h1 id="page-title" tabIndex={-1}>
            User directory
          </h1>
          <p>A clear view of everyone in your workspace.</p>
        </div>
        <span className={styles.readonly}>
          <span className="status-dot active" />
          Read-only directory
        </span>
      </div>
      <section className="panel" aria-label="User directory">
        <div className={styles.tableHeading}>
          <div>
            <h2>
              All users
              {data && <span className={styles.count}>{data.total}</span>}
            </h2>
            <p>Search your directory and explore account statuses.</p>
          </div>
          <RequestStatus {...resource} updating={updating} />
        </div>
        <div className={styles.toolbar}>
          <div className={styles.search}>
            <label htmlFor="user-search" className="sr-only">
              Search users by name or email
            </label>
            <Search size={18} aria-hidden="true" />
            <input
              id="user-search"
              type="search"
              placeholder="Search by name or email…"
              maxLength={100}
              value={query.search}
              onChange={(event) =>
                update({ search: event.target.value, page: 1 }, true)
              }
            />
          </div>
          <div className={styles.filter}>
            <SlidersHorizontal size={16} aria-hidden="true" />
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={query.status}
              onChange={(event) => {
                setSettledSearch(query.search)
                update({ status: event.target.value, page: 1 })
              }}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          {filtered && (
            <button
              className={`button text-button ${styles.clear}`}
              onClick={clear}
            >
              <X size={14} aria-hidden="true" />
              Clear filters
            </button>
          )}
        </div>
        {error ? (
          <ErrorState message={error} retry={resource.retry} />
        ) : !loading && data?.items.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">
              <UsersIcon aria-hidden="true" />
            </span>
            <h3>{filtered ? 'No users match your filters' : 'No users yet'}</h3>
            <p>
              {filtered
                ? 'Try a different name, email, or account status.'
                : 'Your directory will appear here when users are available.'}
            </p>
            {filtered && (
              <button className="button secondary" onClick={clear}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div
            className={styles.tableScroll}
            role="region"
            aria-label="Users table, scroll horizontally for more columns"
            tabIndex={0}
            aria-busy={loading}
          >
            <table>
              <caption className="sr-only">
                Directory users, newest joined first
              </caption>
              <thead>
                <tr>
                  <th scope="col">Full name</th>
                  <th scope="col">Email address</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Joined date</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }, (_, row) => (
                      <tr key={row} aria-hidden="true">
                        {Array.from({ length: 5 }, (_, cell) => (
                          <td key={cell}>
                            <span
                              className={`skeleton ${styles.cellSkeleton}`}
                            />
                          </td>
                        ))}
                      </tr>
                    ))
                  : data?.items.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div className={styles.name}>
                            <span className={`avatar ${styles.userAvatar}`}>
                              {user.full_name
                                .split(' ')
                                .map((word) => word[0])
                                .slice(0, 2)
                                .join('')}
                            </span>
                            <strong>{user.full_name}</strong>
                          </div>
                        </td>
                        <td className={styles.email}>{user.email}</td>
                        <td>
                          <span
                            className={
                              user.role === 'admin'
                                ? styles.adminRole
                                : styles.memberRole
                            }
                          >
                            {user.role === 'admin' ? 'Admin' : 'Member'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${user.status}`}>
                            <span className={`status-dot ${user.status}`} />
                            {user.status[0].toUpperCase() +
                              user.status.slice(1)}
                          </span>
                        </td>
                        <td className={styles.date}>
                          {dateFormatter.format(
                            new Date(user.joined_date + 'T00:00:00Z'),
                          )}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
            {loading && <span className="sr-only">Loading users…</span>}
          </div>
        )}
        <div className={styles.pagination}>
          <span>
            {loading
              ? 'Loading users…'
              : data
                ? data.total
                  ? `Showing ${(data.page - 1) * data.page_size + 1}–${Math.min(data.page * data.page_size, data.total)} of ${data.total} users`
                  : '0 users'
                : 'Results unavailable'}
          </span>
          <div className={styles.pageControls}>
            <div className={styles.pageSize}>
              <label htmlFor="page-size">Rows per page</label>
              <select
                id="page-size"
                value={query.page_size}
                onChange={(event) => {
                  setSettledSearch(query.search)
                  update({ page_size: Number(event.target.value), page: 1 })
                }}
              >
                {[10, 25, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.pageNavigation}>
              <span>
                {data && data.total_pages > 0
                  ? `Page ${data.page} of ${data.total_pages}`
                  : 'No pages'}
              </span>
              <button
                className="icon-button bordered"
                aria-label="Previous page"
                disabled={loading || !data || data.page <= 1}
                onClick={() => update({ page: query.page - 1 })}
              >
                <ChevronLeft size={17} aria-hidden="true" />
              </button>
              <button
                className="icon-button bordered"
                aria-label="Next page"
                disabled={loading || !data || data.page >= data.total_pages}
                onClick={() => update({ page: query.page + 1 })}
              >
                <ChevronRight size={17} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>
      <p className={styles.tableNote}>
        Showing synthetic assessment data. Dates are displayed as day, month,
        year.
      </p>
    </>
  )
}
