import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff, ShieldCheck, Users, LayoutDashboard, LockKeyhole } from 'lucide-react'
import { Navigate } from 'react-router'
import { useAuth } from './context'
import styles from './Login.module.css'

export function Login() {
  const { session, signIn, notice } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<{ email?: string; password?: string }>({})
  const request = useRef<AbortController | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  useEffect(() => () => request.current?.abort(), [])
  useEffect(() => { document.title = 'Sign in · CrediSure' }, [])
  if (session) return <Navigate to="/overview" replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const errors = {
      email: !email.trim() ? 'Enter your email address.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? 'Enter a valid email address.' : undefined,
      password: !password ? 'Enter your password.' : undefined,
    }
    setFields(errors)
    if (errors.email || errors.password) {
      (errors.email ? emailRef : passwordRef).current?.focus()
      return
    }
    const controller = new AbortController()
    request.current = controller
    setBusy(true); setError('')
    try { await signIn(email.trim(), password, controller.signal) }
    catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Unable to sign in.') }
    finally { if (!controller.signal.aborted) setBusy(false) }
  }

  return <main className={styles.page}>
    <section className={styles.story} aria-label="About CrediSure Dashboard">
      <a href="/login" className="brand"><span className="brand-mark"><ShieldCheck aria-hidden="true" /></span>CrediSure<span className="brand-period">.</span></a>
      <div className={styles.pitch}><span className={styles.eyebrow}>YOUR WORKSPACE, SIMPLIFIED</span><h1>A clear view.<br />A confident next step.</h1><p>Your people and the numbers that matter.<br />One focused workspace to stay on top of it all.</p>
        <div className={styles.preview} aria-hidden="true"><div className={styles.previewTop}><span className={styles.previewDots}>● ● ●</span><span>Workspace overview</span></div><div className={styles.previewBody}><div className={styles.previewRail}><LayoutDashboard /><Users /><ShieldCheck /></div><div className={styles.previewContent}><span className={styles.previewHeading}>Everything in perspective.</span><div className={styles.previewCards}><span /><span /><span /></div><div className={styles.previewRows}>{[0, 1, 2].map(row => <div key={row}><i /><span /><b /></div>)}</div></div></div></div>
      </div>
      <p className={styles.storyFooter}><ShieldCheck size={16} aria-hidden="true" /> Clarity starts with the right information.</p>
    </section>
    <section className={styles.formSide} aria-labelledby="login-title">
      <div className={styles.formWrap}>
        <span className={styles.lock}><LockKeyhole size={24} aria-hidden="true" /></span>
        <p className="eyebrow">WELCOME BACK</p><h2 id="login-title">Sign in to your workspace</h2><p className={styles.subtitle}>Enter your administrator credentials to continue.</p>
        {notice && <div className="notice" role="status">{notice}</div>}
        <form onSubmit={submit} noValidate>
          <div className="field"><label htmlFor="email">Email address</label><input ref={emailRef} id="email" name="email" type="email" autoComplete="username" placeholder="you@company.com" value={email} maxLength={254} onChange={event => setEmail(event.target.value)} aria-invalid={!!fields.email} aria-describedby={fields.email ? 'email-error' : undefined} />{fields.email && <span id="email-error" className="field-error">{fields.email}</span>}</div>
          <div className="field"><label htmlFor="password">Password</label><div className={styles.password}><input ref={passwordRef} id="password" name="password" type={visible ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} maxLength={1024} onChange={event => setPassword(event.target.value)} aria-invalid={!!fields.password} aria-describedby={fields.password ? 'password-error' : undefined} /><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{fields.password && <span id="password-error" className="field-error">{fields.password}</span>}</div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className={`button primary ${styles.submit}`} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}<ArrowRight size={18} aria-hidden="true" /></button>
        </form>
        <p className={styles.hint}><LockKeyhole size={14} aria-hidden="true" /> Administrator access only</p>
      </div>
      <footer className={styles.footer}>CrediSure Dashboard <span>Assessment workspace</span></footer>
    </section>
  </main>
}
