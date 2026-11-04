import { useEffect, useRef, useState } from 'react'
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useAuth } from '../features/auth/context'
import styles from './Shell.module.css'
import { Brand } from '../components/Brand'

const currentYear = new Date().getFullYear()

function Navigation({ close }: { close?: () => void }) {
  const { session, signOut } = useAuth()
  return (
    <>
      <NavLink to="/overview" className="brand" onClick={close}>
        <Brand />
      </NavLink>
      <p className={styles.navLabel}>WORKSPACE</p>
      <nav aria-label="Main navigation" className={styles.nav}>
        <NavLink to="/overview" onClick={close}>
          <LayoutDashboard size={19} aria-hidden="true" />
          Overview
          <ChevronRight
            className={styles.chevron}
            size={15}
            aria-hidden="true"
          />
        </NavLink>
        <NavLink to="/users" onClick={close}>
          <Users size={19} aria-hidden="true" />
          Users
          <ChevronRight
            className={styles.chevron}
            size={15}
            aria-hidden="true"
          />
        </NavLink>
      </nav>
      <div className={styles.sidebarBottom}>
        <div className={styles.workspaceNote}>
          <ShieldCheck size={22} aria-hidden="true" />
          <strong>Your workspace at a glance</strong>
          <span>Clear information. Better oversight.</span>
        </div>
        <div className={styles.account}>
          <span className="avatar">
            {session?.administrator.email[0].toUpperCase()}
          </span>
          <div>
            <strong>Administrator</strong>
            <span title={session?.administrator.email}>
              {session?.administrator.email}
            </span>
          </div>
        </div>
        <button
          className={styles.logout}
          onClick={() => {
            close?.()
            void signOut()
          }}
        >
          <LogOut size={17} aria-hidden="true" />
          Sign out
        </button>
      </div>
    </>
  )
}

export function Shell() {
  const { notice } = useAuth()
  const location = useLocation()
  const title =
    location.pathname === '/users'
      ? 'Users'
      : location.pathname === '/overview'
        ? 'Overview'
        : 'Page not found'
  const dialog = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const close = () => dialog.current?.close()
  useEffect(() => {
    document.title = `${title} · CrediSure`
    document.getElementById('page-title')?.focus()
  }, [title])
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const resize = () => {
      if (media.matches) dialog.current?.close()
    }
    media.addEventListener('change', resize)
    return () => media.removeEventListener('change', resize)
  }, [])

  return (
    <div className={styles.app}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className={styles.sidebar}>
        <Navigation />
      </aside>
      <dialog
        ref={dialog}
        id="mobile-navigation"
        aria-label="Navigation menu"
        className={styles.drawer}
        onClose={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return
          const controls = event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href]',
          )
          const first = controls[0]
          const last = controls[controls.length - 1]
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last?.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first?.focus()
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close()
        }}
      >
        <div className={styles.drawerInner}>
          <button
            className={`icon-button ${styles.close}`}
            aria-label="Close navigation"
            onClick={close}
          >
            <X size={20} aria-hidden="true" />
          </button>
          <Navigation close={close} />
        </div>
      </dialog>
      <div className={styles.workspace}>
        <header className={styles.header}>
          <div className={styles.breadcrumb}>
            <button
              className={`icon-button ${styles.menu}`}
              aria-label="Open navigation"
              aria-controls="mobile-navigation"
              aria-expanded={open}
              onClick={() => {
                dialog.current?.showModal()
                setOpen(true)
              }}
            >
              <Menu size={21} aria-hidden="true" />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} aria-hidden="true" />
            <strong>{title}</strong>
          </div>
          <div className={styles.headerAccount}>
            <span>Administrator</span>
            <span className="avatar small">AD</span>
          </div>
        </header>
        <main id="main" className={styles.main}>
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
          <Outlet />
        </main>
        <footer className={styles.footer}>
          <span>© {currentYear} CrediSure</span>
          <span>Assessment workspace · Synthetic data</span>
        </footer>
      </div>
    </div>
  )
}
