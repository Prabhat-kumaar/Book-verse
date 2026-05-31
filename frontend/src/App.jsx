import { Navigate, Outlet, Route, Routes, useNavigate, useLocation } from 'react-router-dom'
import React, { Suspense, useEffect, useState } from 'react'
import apiClient from './lib/apiClient'
import MainLayout from './layout/MainLayout'

const isDev = import.meta.env.DEV
const VISIT_DEDUPE_TTL_MS = 2000
const recentVisitRequests = new Map()

const HomePage = React.lazy(() => import('./pages/HomePage'))
const UnifiedReaderPage = React.lazy(() => import('./pages/UnifiedReaderPage'))
const AdminDashboardPage = React.lazy(() => import('./pages/AdminDashboardPage'))
const AdminAddBookPage = React.lazy(() => import('./pages/AdminAddBookPage'))
const AdminManageBooksPage = React.lazy(() => import('./pages/AdminManageBooksPage'))
const AdminAnalyticsPage = React.lazy(() => import('./pages/AdminAnalyticsPage'))
const LoginPage = React.lazy(() => import('./pages/LoginPage'))
const SignUpPage = React.lazy(() => import('./pages/SignUpPage'))
const BooksPage = React.lazy(() => import('./pages/BooksPage'))
const CategoriesPage = React.lazy(() => import('./pages/CategoriesPage'))
const RecommendedPage = React.lazy(() => import('./pages/RecommendedPage'))
const SavedBooksPage = React.lazy(() => import('./pages/SavedBooksPage'))
const ProfileDashboardPage = React.lazy(() => import('./pages/ProfileDashboardPage'))
const BookDetailPage = React.lazy(() => import('./pages/BookDetailPage'))

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
    <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-700">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"
        role="status"
        aria-label="Loading"
      />
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
      const visitKey = `${sessionId}:${location.pathname}`
      const lastRecordedAt = recentVisitRequests.get(visitKey) || 0
      if (Date.now() - lastRecordedAt < VISIT_DEDUPE_TTL_MS) return
      recentVisitRequests.set(visitKey, Date.now())

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
          <Route path="/profile" element={<RequireAuth><MainLayout><ProfileDashboardPage /></MainLayout></RequireAuth>} />
          <Route path="/me" element={<Navigate to="/profile" replace />} />
          <Route path="/saved-books" element={<RequireAuth><MainLayout><SavedBooksPage /></MainLayout></RequireAuth>} />
          <Route path="*" element={<MainLayout><HomePage /></MainLayout>} />
        </Routes>
      )}
    </Suspense>
  )
}

export default App
