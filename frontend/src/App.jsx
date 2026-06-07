import { Navigate, Outlet, Route, Routes, useNavigate, useLocation } from 'react-router-dom'
import React, { Suspense, useEffect, useState } from 'react'
import apiClient from './lib/apiClient'
import MainLayout from './layout/MainLayout'
import { initGA, trackPageView } from './utils/analytics'

const isDev = import.meta.env.DEV
const VISIT_DEDUPE_TTL_MS = 1800000
const CHUNK_RELOAD_KEY = 'readify_chunk_reload_at'
const CHUNK_RELOAD_TTL_MS = 30000
const recentVisitRequests = new Map()

function isRouteChunkError(error) {
  const message = String(error?.message || error || '')
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(message)
}

function shouldReloadForChunkError() {
  try {
    const lastReloadAt = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0)
    if (lastReloadAt && Date.now() - lastReloadAt < CHUNK_RELOAD_TTL_MS) return false
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()))
    return true
  } catch {
    return true
  }
}

function lazyWithRetry(importer) {
  return React.lazy(() => importer().catch((error) => {
    if (isRouteChunkError(error) && shouldReloadForChunkError()) {
      window.location.reload()
      return new Promise(() => {})
    }
    throw error
  }))
}

const HomePage = lazyWithRetry(() => import('./pages/HomePage'))
const UnifiedReaderPage = lazyWithRetry(() => import('./pages/UnifiedReaderPage'))
const AdminDashboardPage = lazyWithRetry(() => import('./pages/AdminDashboardPage'))
const AdminAddBookPage = lazyWithRetry(() => import('./pages/AdminAddBookPage'))
const AdminManageBooksPage = lazyWithRetry(() => import('./pages/AdminManageBooksPage'))
const AdminAnalyticsPage = lazyWithRetry(() => import('./pages/AdminAnalyticsPage'))
const AdminUsersPage = lazyWithRetry(() => import('./pages/AdminUsersPage'))
const LoginPage = lazyWithRetry(() => import('./pages/LoginPage'))
const SignUpPage = lazyWithRetry(() => import('./pages/SignUpPage'))
const BooksPage = lazyWithRetry(() => import('./pages/BooksPage'))
const BlogPage = lazyWithRetry(() => import('./pages/BlogPage'))
const BlogDetailPage = lazyWithRetry(() => import('./pages/BlogDetailPage'))
const AdminBlogPage = lazyWithRetry(() => import('./pages/admin/AdminBlogPage'))
const AdminBlogCreateEditPage = lazyWithRetry(() => import('./pages/admin/AdminBlogCreateEditPage'))
const AdminBlogAnalyticsPage = lazyWithRetry(() => import('./pages/admin/AdminBlogAnalyticsPage'))
const CategoriesPage = lazyWithRetry(() => import('./pages/CategoriesPage'))
const RecommendedPage = lazyWithRetry(() => import('./pages/RecommendedPage'))
const SavedBooksPage = lazyWithRetry(() => import('./pages/SavedBooksPage'))
const ProfileDashboardPage = lazyWithRetry(() => import('./pages/ProfileDashboardPage'))
const BookDetailPage = lazyWithRetry(() => import('./pages/BookDetailPage'))
const BookReadPage = lazyWithRetry(() => import('./pages/BookReadPage'))

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    if (isDev) console.error('[AppErrorBoundary]', error, errorInfo)
  }

  render() {
    if (this.state.error) {
      return <AppErrorFallback error={this.state.error} />
    }

    return this.props.children
  }
}

function AppErrorFallback({ error }) {
  const isChunkError = isRouteChunkError(error)

  return (
    <div className="min-h-screen bg-[#050914] bg-[radial-gradient(circle_at_12%_8%,rgba(56,96,255,0.22),transparent_34%),radial-gradient(circle_at_86%_4%,rgba(120,80,255,0.2),transparent_30%),linear-gradient(165deg,#05070f_0%,#0a0f1f_46%,#06070d_100%)] px-4 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col items-center justify-center text-center">
        <div className="w-full rounded-2xl border border-white/10 bg-slate-900/90 p-5 shadow-2xl backdrop-blur-xl">
          <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-300">
            Readify AI
          </p>
          <h1 className="mt-3 text-2xl font-bold leading-tight">
            {isChunkError ? 'Updating your reading space' : 'Something went wrong'}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            {isChunkError
              ? 'A fresh app update is available. Reload once and you will be back in.'
              : 'The app hit a temporary error. You can reload or continue from the main pages.'}
          </p>

          <div className="mt-5 grid gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-indigo-950/30 transition hover:from-indigo-400 hover:to-violet-500"
            >
              Reload App
            </button>
            <div className="grid grid-cols-2 gap-2">
              <a href="/" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-bold text-slate-100 transition hover:bg-white/10">
                Home
              </a>
              <a href="/login" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-bold text-slate-100 transition hover:bg-white/10">
                Sign in
              </a>
            </div>
            <a href="/signup" className="rounded-xl border border-indigo-300/30 bg-indigo-500/10 px-3 py-2.5 text-sm font-bold text-indigo-100 transition hover:bg-indigo-500/20">
              Create free account
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function readAuthUser() {
  try {
    const raw = localStorage.getItem('authUser')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function RequireAuth({ children }) {
  const token = localStorage.getItem('authToken')
  if (!token) return <Navigate to="/login" replace />
  return children
}

function RequireAdmin({ children }) {
  const token = localStorage.getItem('authToken')
  const user = readAuthUser()
  if (!token) return <Navigate to="/login" replace />
  if (user?.role !== 'admin') return <Navigate to="/" replace />
  return children
}

function RouteFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#050914] text-slate-200">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-indigo-400"
        role="status"
        aria-label="Loading"
      />
    </div>
  )
}

function parseReaderBookId(hash = '') {
  if (!hash.startsWith('#reader')) return ''
  const queryString = hash.includes('?') ? hash.split('?')[1] : ''
  const params = new URLSearchParams(queryString)
  return params.get('bookId') || ''
}

function App() {
  const navigate = useNavigate()
  const [hash, setHash] = useState(window.location.hash)
  const [hashReaderRedirecting, setHashReaderRedirecting] = useState(false)

  useEffect(() => {
    const onHashChange = () => {
      setHash(window.location.hash)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [])

  const location = useLocation()

  // Defer GA4 script initialization until after the page load / LCP window is complete
  useEffect(() => {
    const deferGA = () => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => initGA(), { timeout: 3000 })
      } else {
        setTimeout(initGA, 2000)
      }
    }

    if (document.readyState === 'complete') {
      deferGA()
    } else {
      window.addEventListener('load', deferGA, { once: true })
      return () => window.removeEventListener('load', deferGA)
    }
    return undefined
  }, [])

  useEffect(() => {
    // Generate or fetch session ID from localStorage
    let sessionId = localStorage.getItem('readify_session_id')
    if (!sessionId) {
      sessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
      localStorage.setItem('readify_session_id', sessionId)
    }

    const recordVisit = async () => {
      const visitKey = `${sessionId}:${location.pathname}`
      const lastRecordedAt = recentVisitRequests.get(visitKey) || 0
      if (Date.now() - lastRecordedAt < VISIT_DEDUPE_TTL_MS) return
      recentVisitRequests.set(visitKey, Date.now())

      // Record in GA4 using the batched queue utility
      trackPageView(location.pathname)

      try {
        const authUser = readAuthUser()

        await apiClient.post('/analytics/visit', {
          path: location.pathname,
          sessionId,
          userRole: authUser?.role || 'guest',
        })
      } catch (err) {
        if (isDev) console.error('Failed to record page visit:', err)
      }
    }
    recordVisit()
  }, [location.pathname])

  useEffect(() => {
    const hashToPath = {
      '#admin': '/admin/dashboard',
      '#admin/login': '/login',
      '#admin/add-book': '/admin/add-book',
      '#admin/manage-books': '/admin/manage-books',
      '#admin/analytics': '/admin/analytics',
      '#admin/users': '/admin/users',
    }

    const targetPath = hashToPath[hash]
    if (!targetPath) return
    navigate(targetPath, { replace: true })
  }, [hash, navigate])

  const isReaderRoute = hash.startsWith('#reader')

  useEffect(() => {
    if (!isReaderRoute) {
      setHashReaderRedirecting(false)
      return undefined
    }

    const bookId = parseReaderBookId(hash)
    if (!bookId) return undefined

    let cancelled = false
    setHashReaderRedirecting(true)

    const redirectOldReaderLink = async () => {
      try {
        const response = await apiClient.get(`/api/books/${encodeURIComponent(bookId)}`)
        const book = response.data?.data || response.data?.book || response.data
        if (!cancelled && book?.slug) {
          navigate(`/read/${book.slug}/`, { replace: true })
        }
      } catch (err) {
        if (isDev) console.error('Failed to redirect old reader link:', err)
      } finally {
        if (!cancelled) setHashReaderRedirecting(false)
      }
    }

    redirectOldReaderLink()

    return () => {
      cancelled = true
    }
  }, [hash, isReaderRoute, navigate])

  return (
    <AppErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
        {isReaderRoute && hashReaderRedirecting ? (
          <RouteFallback />
        ) : isReaderRoute ? (
          <RequireAuth>
            <MainLayout hideChrome fullBleed>
              <UnifiedReaderPage />
            </MainLayout>
          </RequireAuth>
        ) : (
          <Routes>
            <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
            <Route path="/books" element={<MainLayout><BooksPage /></MainLayout>} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogDetailPage />} />
            <Route path="/book/:id" element={<MainLayout><BookDetailPage /></MainLayout>} />
            <Route path="/read/:bookSlug" element={<RequireAuth><MainLayout hideChrome fullBleed><BookReadPage /></MainLayout></RequireAuth>} />
            <Route path="/reader" element={<Navigate to="/read" replace />} />
            <Route path="/categories" element={<MainLayout><CategoriesPage /></MainLayout>} />
            <Route path="/recommended" element={<MainLayout><RecommendedPage /></MainLayout>} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/admin/login" element={<Navigate to="/login" replace />} />
            <Route path="/admin" element={<RequireAdmin><Outlet /></RequireAdmin>}>
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="add-book" element={<AdminAddBookPage />} />
              <Route path="manage-books" element={<AdminManageBooksPage />} />
              <Route path="blogs" element={<AdminBlogPage />} />
              <Route path="blogs/create" element={<AdminBlogCreateEditPage />} />
              <Route path="blogs/:id/edit" element={<AdminBlogCreateEditPage />} />
              <Route path="blogs/analytics" element={<AdminBlogAnalyticsPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>
            <Route path="/profile" element={<RequireAuth><MainLayout><ProfileDashboardPage /></MainLayout></RequireAuth>} />
            <Route path="/me" element={<Navigate to="/profile" replace />} />
            <Route path="/saved-books" element={<RequireAuth><MainLayout><SavedBooksPage /></MainLayout></RequireAuth>} />
            <Route path="*" element={<MainLayout><HomePage /></MainLayout>} />
          </Routes>
        )}
      </Suspense>
    </AppErrorBoundary>
  )
}

export default App
