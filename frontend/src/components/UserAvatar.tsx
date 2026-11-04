import type { CSSProperties } from 'react'
import styles from './UserAvatar.module.css'

/** Local fictional demo portraits, assigned consistently by synthetic user ID. */
export function UserAvatar({
  id,
  name,
  size = 44,
}: {
  id: number
  name: string
  size?: number
}) {
  const portrait = (Math.abs(id - 1) + 1) % 16
  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <span
      className={styles.avatar}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span>{initials}</span>
      <img
        src={`${import.meta.env.BASE_URL}images/demo-portraits.webp`}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        style={
          {
            '--portrait-x': portrait % 4,
            '--portrait-y': Math.floor(portrait / 4),
          } as CSSProperties
        }
        onError={(event) => {
          event.currentTarget.hidden = true
        }}
      />
    </span>
  )
}
