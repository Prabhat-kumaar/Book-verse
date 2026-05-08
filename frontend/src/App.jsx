import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import MainLayout from './layout/MainLayout'
import HomePage from './pages/HomePage'
import PdfReaderPage from './pages/PdfReaderPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminAddBookPage from './pages/AdminAddBookPage'
import AdminManageBooksPage from './pages/AdminManageBooksPage'
import AdminAnalyticsPage from './pages/AdminAnalyticsPage'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'

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

  if (isReaderRoute) {
    return <PdfReaderPage />
  }

  return (
    <Routes>
      <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />
      <Route path="/admin/dashboard" element={<RequireAdmin><AdminDashboardPage /></RequireAdmin>} />
      <Route path="/admin/add-book" element={<RequireAdmin><AdminAddBookPage /></RequireAdmin>} />
      <Route path="/admin/manage-books" element={<RequireAdmin><AdminManageBooksPage /></RequireAdmin>} />
      <Route path="/admin/analytics" element={<RequireAdmin><AdminAnalyticsPage /></RequireAdmin>} />
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/me" element={<RequireAuth><MainLayout><HomePage /></MainLayout></RequireAuth>} />
      <Route path="*" element={<MainLayout><HomePage /></MainLayout>} />
    </Routes>
  )
}

export default App
