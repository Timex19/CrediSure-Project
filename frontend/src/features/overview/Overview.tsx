import {
  ArrowRight,
  ArrowUpRight,
  Users,
  UserCheck,
  UserMinus,
  Clock3,
  ShieldCheck,
} from 'lucide-react'
import { Link } from 'react-router'
import type { Summary } from '../../lib/api'
import { useResource } from '../../lib/useResource'
import { ErrorState, RequestStatus } from '../../components/Feedback'
import { RecentUsers } from './RecentUsers'
import styles from './Overview.module.css'

const metrics = [
  {
    key: 'total_users',
    label: 'Total users',
    hint: 'Your entire workspace',
    icon: Users,
    color: 'accent',
    status: '',
  },
  {
    key: 'active_users',
    label: 'Active users',
    hint: 'Currently active accounts',
    icon: UserCheck,
    color: 'green',
    status: 'active',
  },
  {
    key: 'inactive_users',
    label: 'Inactive users',
    hint: 'Currently inactive accounts',
    icon: UserMinus,
    color: 'gray',
    status: 'inactive',
  },
  {
    key: 'pending_users',
    label: 'Pending users',
    hint: 'Awaiting activation',
    icon: Clock3,
    color: 'amber',
    status: 'pending',
  },
] as const

export function Overview() {
  const resource = useResource<Summary>('/dashboard/summary')
  const { data, error, loading } = resource
  const total = data?.total_users || 0
  const activeShare = total && data ? (data.active_users / total) * 100 : 0
  const inactiveShare = total && data ? (data.inactive_users / total) * 100 : 0
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">WORKSPACE OVERVIEW</p>
          <h1 id="page-title" tabIndex={-1}>
            A little clarity for your day.
          </h1>
          <p>Your people, your workspace. Everything in perspective.</p>
        </div>
        <Link className="button primary" to="/users">
          <Users size={16} aria-hidden="true" />
          View users
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <div className="section-bar">
        <h2>
          At a glance <span className="subtle-label">Full directory</span>
        </h2>
        <RequestStatus {...resource} caption="Summary request" />
      </div>
      {error ? (
        <section className="panel">
          <ErrorState message={error} retry={resource.retry} />
        </section>
      ) : (
        <div
          className={styles.cards}
          aria-busy={loading}
          aria-label="User summary"
        >
          {metrics.map(({ key, label, hint, icon: Icon, color, status }) => (
            <article
              className={`${styles.card} ${key === 'total_users' ? styles.featured : ''}`}
              key={key}
            >
              <div className={styles.cardTop}>
                <span className={`metric-icon ${color}`}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <Link
                  to={status ? `/users?status=${status}` : '/users'}
                  aria-label={`View ${label.toLowerCase()}`}
                  className={styles.cardLink}
                >
                  <ArrowUpRight size={18} aria-hidden="true" />
                </Link>
              </div>
              <h2 className={styles.metricLabel}>{label}</h2>
              {loading ? (
                <span
                  className={`skeleton ${styles.valueSkeleton}`}
                  aria-label="Loading count"
                />
              ) : (
                <strong className={styles.value}>
                  {data?.[key].toLocaleString()}
                </strong>
              )}
              <p>{hint}</p>
            </article>
          ))}
        </div>
      )}
      <div className={styles.lower}>
        <RecentUsers />
        <section
          className={`panel ${styles.distribution}`}
          aria-labelledby="distribution-title"
        >
          <div className={styles.panelHeading}>
            <div>
              <h2 id="distribution-title">Account distribution</h2>
              <p>A clearer picture of your workspace.</p>
            </div>
            <span className={styles.smallIcon}>
              <ShieldCheck size={19} aria-hidden="true" />
            </span>
          </div>
          {loading ? (
            <div
              className={styles.distributionLoading}
              aria-label="Loading account distribution"
            >
              <span className={`skeleton ${styles.chartSkeleton}`} />
            </div>
          ) : error ? (
            <p className={styles.unavailable}>
              Account distribution will appear when the summary is available.
            </p>
          ) : (
            <>
              <div className={styles.chartWrap}>
                <div
                  className={styles.donut}
                  style={{
                    background: total
                      ? `conic-gradient(var(--primary) 0% ${activeShare}%, var(--chart-inactive) ${activeShare}% ${activeShare + inactiveShare}%, var(--chart-pending) ${activeShare + inactiveShare}% 100%)`
                      : 'var(--border)',
                  }}
                  role="img"
                  aria-label={
                    total
                      ? `${data?.active_users} active, ${data?.inactive_users} inactive, ${data?.pending_users} pending users`
                      : 'No users in the directory'
                  }
                >
                  <div>
                    <span>{total ? `${Math.round(activeShare)}%` : '0'}</span>
                    <small>{total ? 'active accounts' : 'users yet'}</small>
                  </div>
                </div>
              </div>
              <div className={styles.legend}>
                {metrics.slice(1).map((metric) => (
                  <Link key={metric.key} to={`/users?status=${metric.status}`}>
                    <span className={`status-dot ${metric.status}`} />
                    <span>{metric.label.replace(' users', '')}</span>
                    <b>{data?.[metric.key]}</b>
                    <ArrowUpRight size={13} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
      <div className={styles.contextNote}>
        <ShieldCheck size={16} aria-hidden="true" />
        <p>
          One directory, one source of truth. Summary counts always reflect all
          users.
        </p>
        <span>Synthetic assessment data</span>
      </div>
    </>
  )
}
