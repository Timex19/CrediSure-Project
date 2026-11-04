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
import styles from './Overview.module.css'

const metrics = [
  {
    key: 'total_users',
    label: 'Total users',
    hint: 'Everyone in your directory',
    icon: Users,
    color: 'blue',
  },
  {
    key: 'active_users',
    label: 'Active users',
    hint: 'Currently active accounts',
    icon: UserCheck,
    color: 'green',
  },
  {
    key: 'inactive_users',
    label: 'Inactive users',
    hint: 'Currently inactive accounts',
    icon: UserMinus,
    color: 'gray',
  },
  {
    key: 'pending_users',
    label: 'Pending users',
    hint: 'Awaiting activation',
    icon: Clock3,
    color: 'amber',
  },
] as const

export function Overview() {
  const resource = useResource<Summary>('/dashboard/summary')
  const { data, error, loading } = resource
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">WORKSPACE OVERVIEW</p>
          <h1 id="page-title" tabIndex={-1}>
            A little clarity for your day.
          </h1>
          <p>Here’s a snapshot of the people in your workspace.</p>
        </div>
        <Link className="button primary" to="/users">
          View users
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <div className="section-bar">
        <h2>
          At a glance <span className="subtle-label">All users</span>
        </h2>
        <RequestStatus {...resource} />
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
          {metrics.map(({ key, label, hint, icon: Icon, color }) => (
            <article className={styles.card} key={key}>
              <div className={styles.cardTop}>
                <span className={`metric-icon ${color}`}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className={styles.metricLabel}>{label}</span>
              </div>
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
        <section className={`panel ${styles.directory}`}>
          <div className={styles.directoryHeading}>
            <span className="metric-icon blue">
              <Users size={22} aria-hidden="true" />
            </span>
            <span className="subtle-label">USER DIRECTORY</span>
          </div>
          <h2>
            The right people.
            <br />
            All in one place.
          </h2>
          <p>
            Find a familiar name, check an account status, or get a clear view
            of your entire directory.
          </p>
          <Link className="button secondary" to="/users">
            Explore directory
            <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
          <div className={styles.directoryArt} aria-hidden="true">
            <div>
              <span>AO</span>
              <i />
              <b className="badge active">Active</b>
            </div>
            <div>
              <span>DB</span>
              <i />
              <b className="badge pending">Pending</b>
            </div>
            <div>
              <span>CE</span>
              <i />
              <b className="badge active">Active</b>
            </div>
          </div>
        </section>
        <section className={`panel ${styles.statusGuide}`}>
          <p className="eyebrow">UNDERSTANDING YOUR DATA</p>
          <h2>A status for every stage.</h2>
          <p>Account statuses help you understand who’s in your workspace.</p>
          <dl>
            {[
              {
                status: 'active',
                title: 'Active',
                description: 'Accounts marked as currently active.',
              },
              {
                status: 'inactive',
                title: 'Inactive',
                description: 'Accounts marked as currently inactive.',
              },
              {
                status: 'pending',
                title: 'Pending',
                description: 'Accounts awaiting activation.',
              },
            ].map((item) => (
              <div key={item.status}>
                <dt>
                  <span className={`status-dot ${item.status}`} />
                  {item.title}
                </dt>
                <dd>{item.description}</dd>
              </div>
            ))}
          </dl>
          <div className={styles.note}>
            <ShieldCheck size={17} aria-hidden="true" />
            <span>Overview counts always reflect the full directory.</span>
          </div>
        </section>
      </div>
      <p className={styles.footnote}>
        A focused view of your workspace. Directory data is synthetic and
        read-only.
      </p>
    </>
  )
}
