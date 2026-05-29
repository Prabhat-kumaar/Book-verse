import { Navigate, Outlet, Route, Routes, useNavigate, useLocation } from 'react-router-dom'
import { Suspense, lazy, useEffect, useState } from 'react'
import { SavedBooksProvider } from './context/SavedBooksContext'
import apiClient from './lib/apiClient'
import { BookCardSkeleton, HeroSkeleton, NavbarSkeleton } from './components/Skeletons'

const isDev = import.meta.env.DEV

const MainLayout = lazy(() => import('./layout/MainLayout'))
const HomePage = lazy(() => import('./pages/HomePage'))
const UnifiedReaderPage = lazy(() => import('./pages/UnifiedReaderPage'))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'))
const AdminAddBookPage = lazy(() => import('./pages/AdminAddBookPage'))
const AdminManageBooksPage = lazy(() => import('./pages/AdminManageBooksPage'))
const AdminAnalyticsPage = lazy(() => import('./pages/AdminAnalyticsPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignUpPage = lazy(() => import('./pages/SignUpPage'))
const BooksPage = lazy(() => import('./pages/BooksPage'))
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'))
const RecommendedPage = lazy(() => import('./pages/RecommendedPage'))
const SavedBooksPage = lazy(() => import('./pages/SavedBooksPage'))
const ProfileDashboardPage = lazy(() => import('./pages/ProfileDashboardPage'))
const BookDetailPage = lazy(() => import('./pages/BookDetailPage'))

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
    <div className="min-h-screen px-3 pt-3 sm:px-6">
      <NavbarSkeleton />
      <main className="mx-auto mt-6 w-full max-w-7xl space-y-6">
        <HeroSkeleton />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(4)].map((_, idx) => (
            <BookCardSkeleton key={`route-skeleton-${idx}`} />
          ))}
        </div>
      </main>
    </div>
  )
}

function App() {
  const navigate = useNavigate()
  const [hash, setHash] = useState(window.location.hash)

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

  useEffect(() => {
    // Generate or fetch session ID from sessionStorage
    let sessionId = sessionStorage.getItem('readify_session_id')
    if (!sessionId) {
      sessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
      sessionStorage.setItem('readify_session_id', sessionId)
    }

    const recordVisit = async () => {
      try {
        await apiClient.post('/analytics/visit', {
          path: location.pathname,
          sessionId
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
    }

    const targetPath = hashToPath[hash]
    if (!targetPath) return
    navigate(targetPath, { replace: true })
  }, [hash, navigate])

  const isReaderRoute = hash.startsWith('#reader')

  return (
    <SavedBooksProvider>
      <Suspense fallback={<RouteFallback />}>
        {isReaderRoute ? (
          <RequireAuth>
            <MainLayout hideChrome fullBleed>
              <UnifiedReaderPage />
            </MainLayout>
          </RequireAuth>
        ) : (
          <Routes>
            <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
            <Route path="/books" element={<MainLayout><BooksPage /></MainLayout>} />
            <Route path="/book/:id" element={<MainLayout><BookDetailPage /></MainLayout>} />
            <Route path="/categories" element={<MainLayout><CategoriesPage /></MainLayout>} />
            <Route path="/recommended" element={<MainLayout><RecommendedPage /></MainLayout>} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/admin/login" element={<Navigate to="/login" replace />} />
            <Route path="/admin" element={<RequireAdmin><Outlet /></RequireAdmin>}>
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="add-book" element={<AdminAddBookPage />} />
              <Route path="manage-books" element={<AdminManageBooksPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>
            <Route path="/me" element={<RequireAuth><MainLayout><ProfileDashboardPage /></MainLayout></RequireAuth>} />
            <Route path="/saved-books" element={<RequireAuth><MainLayout><SavedBooksPage /></MainLayout></RequireAuth>} />
            <Route path="*" element={<MainLayout><HomePage /></MainLayout>} />
          </Routes>
        )}
      </Suspense>
    </SavedBooksProvider>
  )
}

export default App
