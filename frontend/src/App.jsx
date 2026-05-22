import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Suspense, lazy, useEffect, useState } from 'react'
import { SavedBooksProvider } from './context/SavedBooksContext'
import { BookCardSkeleton, HeroSkeleton, NavbarSkeleton } from './components/Skeletons'

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
          <MainLayout hideChrome fullBleed>
            <UnifiedReaderPage />
          </MainLayout>
        ) : (
          <Routes>
            <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
            <Route path="/books" element={<MainLayout><BooksPage /></MainLayout>} />
            <Route path="/categories" element={<MainLayout><CategoriesPage /></MainLayout>} />
            <Route path="/recommended" element={<MainLayout><RecommendedPage /></MainLayout>} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/admin/login" element={<Navigate to="/login" replace />} />
            <Route path="/admin/dashboard" element={<RequireAdmin><AdminDashboardPage /></RequireAdmin>} />
            <Route path="/admin/add-book" element={<RequireAdmin><AdminAddBookPage /></RequireAdmin>} />
            <Route path="/admin/manage-books" element={<RequireAdmin><AdminManageBooksPage /></RequireAdmin>} />
            <Route path="/admin/analytics" element={<RequireAdmin><AdminAnalyticsPage /></RequireAdmin>} />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
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
