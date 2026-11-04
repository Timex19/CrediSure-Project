import {
  BrowserRouter,
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
} from 'react-router'
import { AuthProvider } from './features/auth/AuthProvider'
import { useAuth } from './features/auth/context'
import { Login } from './features/auth/Login'
import { Overview } from './features/overview/Overview'
import { Users } from './features/users/Users'
import { Shell } from './app/Shell'

function Protected() {
  const { session } = useAuth()
  return session ? <Outlet /> : <Navigate to="/login" replace />
}

function NotFound() {
  return (
    <section className="empty-state panel">
      <p className="eyebrow">404</p>
      <h1 id="page-title" tabIndex={-1}>
        Page not found
      </h1>
      <p>This page doesn't exist. Head back to your workspace.</p>
      <Link className="button primary" to="/overview">
        Back to overview
      </Link>
    </section>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Protected />}>
            <Route element={<Shell />}>
              <Route path="/" element={<Navigate to="/overview" replace />} />
              <Route path="/overview" element={<Overview />} />
              <Route path="/users" element={<Users />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
