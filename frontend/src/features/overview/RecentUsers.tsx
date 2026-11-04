import { ArrowUpRight, Users } from 'lucide-react'
import { Link } from 'react-router'
import { UserAvatar } from '../../components/UserAvatar'
import { ErrorState } from '../../components/Feedback'
import type { UserPage } from '../../lib/api'
import { useResource } from '../../lib/useResource'
import styles from './Overview.module.css'

const dates = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  timeZone: 'UTC',
})

export function RecentUsers() {
  const { data, loading, error, retry } = useResource<UserPage>(
    '/users?page=1&page_size=10',
  )
  return (
    <section
      className={`panel ${styles.recent}`}
      aria-labelledby="recent-title"
    >
      <div className={styles.panelHeading}>
        <div>
          <h2 id="recent-title">Recently joined</h2>
          <p>The newest people in your workspace.</p>
        </div>
        <Link to="/users" className={styles.directoryLink}>
          Open directory
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
      {error ? (
        <ErrorState message={error} retry={retry} />
      ) : (
        <>
          <div className={styles.recentRows} aria-busy={loading}>
            {loading ? (
              Array.from({ length: 4 }, (_, index) => (
                <div
                  className={styles.recentRow}
                  key={index}
                  aria-hidden="true"
                >
                  <span className={`skeleton ${styles.avatarSkeleton}`} />
                  <span className={`skeleton ${styles.nameSkeleton}`} />
                </div>
              ))
            ) : !data?.items.length ? (
              <div className="empty-state">
                <span className="empty-icon">
                  <Users aria-hidden="true" />
                </span>
                <h3>Your directory starts here</h3>
                <p>Recently joined users will appear here when available.</p>
              </div>
            ) : (
              data.items.slice(0, 4).map((user) => (
                <div key={user.id} className={styles.recentRow}>
                  <UserAvatar id={user.id} name={user.full_name} />
                  <div className={styles.recentIdentity}>
                    <span>{user.full_name}</span>
                    <small>{user.email}</small>
                  </div>
                  <span className={`badge ${user.status}`}>
                    <span className={`status-dot ${user.status}`} />
                    {user.status[0].toUpperCase() + user.status.slice(1)}
                  </span>
                  <time className={styles.joined} dateTime={user.joined_date}>
                    {dates.format(new Date(user.joined_date + 'T00:00:00Z'))}
                  </time>
                </div>
              ))
            )}
          </div>
          <div className={styles.recentFooter}>
            <span>Newest joined first</span>
            <span>
              {loading
                ? 'Loading users…'
                : `${data?.total ?? 0} people in your directory`}
            </span>
          </div>
        </>
      )}
    </section>
  )
}
