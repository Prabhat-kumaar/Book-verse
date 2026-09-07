import React, { useEffect, useMemo, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MdPeopleAlt,
  MdAdminPanelSettings,
  MdPerson,
  MdSearch,
  MdRefresh,
  MdFileDownload,
  MdLocalFireDepartment,
  MdMenuBook,
  MdAutoAwesome,
  MdCheckCircle,
  MdBlock,
  MdShield,
  MdClose,
  MdContentCopy,
  MdGridView,
  MdTableRows,
  MdTimer,
  MdBookmarkAdded,
  MdInfoOutline,
  MdArrowUpward,
  MdVerified,
  MdLockOpen,
  MdLockOutline,
  MdCheck,
  MdDateRange,
  MdMenu,
} from 'react-icons/md'
import AdminSidebar from '../components/AdminSidebar'
import apiClient from '../lib/apiClient'
import SEO from '../components/SEO'

// Helper: Format date
function formatDate(value) {
  if (!value) return 'N/A'
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Helper: Relative time
function formatTimeAgo(value) {
  if (!value) return ''
  const diffMs = Date.now() - new Date(value).getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 30) return `${diffDays}d ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

// Helper: Format seconds to readable reading time
function formatReadingTime(seconds = 0) {
  if (!seconds || seconds <= 0) return '0 min'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`
  }
  return `${minutes} min`
}

// Helper: Calculate reader tier
function getReaderTier(booksCompleted = 0, currentStreak = 0) {
  if (booksCompleted >= 15 || currentStreak >= 30) {
    return { name: 'Grand Scholar', color: 'from-amber-400 to-yellow-600', text: 'text-amber-300', border: 'border-amber-500/30', bg: 'bg-amber-500/10' }
  }
  if (booksCompleted >= 8 || currentStreak >= 14) {
    return { name: 'Avid Scholar', color: 'from-purple-400 to-indigo-600', text: 'text-purple-300', border: 'border-purple-500/30', bg: 'bg-purple-500/10' }
  }
  if (booksCompleted >= 3 || currentStreak >= 5) {
    return { name: 'Bookworm', color: 'from-cyan-400 to-blue-600', text: 'text-cyan-300', border: 'border-cyan-500/30', bg: 'bg-cyan-500/10' }
  }
  return { name: 'Novice Reader', color: 'from-slate-400 to-slate-600', text: 'text-slate-300', border: 'border-slate-500/30', bg: 'bg-slate-500/10' }
}

function getInitial(user) {
  return (user?.username || user?.email || '?').trim().charAt(0).toUpperCase()
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('All') // 'All' | 'Readers' | 'Admins' | 'Active' | 'Suspended'
  const [sortBy, setSortBy] = useState('newest') // 'newest' | 'oldest' | 'streak' | 'completed' | 'name'
  const [viewMode, setViewMode] = useState('table') // 'table' | 'grid'
  const [toastMessage, setToastMessage] = useState('')
  const [copiedId, setCopiedId] = useState(null)

  // Drawer state (inspect user)
  const [selectedUser, setSelectedUser] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Confirmation Modal state for Ban / Unban
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [userToModify, setUserToModify] = useState(null)
  const [isProcessingAction, setIsProcessingAction] = useState(false)

  const searchInputRef = useRef(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await apiClient.get('/api/users/admin/all')
      const fetched = Array.isArray(response.data?.data) ? response.data.data : []
      setUsers(fetched)
    } catch (fetchError) {
      const msg = fetchError.response?.data?.message || fetchError.message || 'Unable to load user accounts.'
      setError(msg)
      showToast(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // KPI Calculations
  const stats = useMemo(() => {
    const totalUsers = users.length
    const adminCount = users.filter((u) => u.role === 'admin').length
    const readerCount = totalUsers - adminCount
    const bannedCount = users.filter((u) => u.isBanned).length
    const activeCount = totalUsers - bannedCount
    const totalBooksCompleted = users.reduce((acc, u) => acc + (u.booksCompleted || 0), 0)
    const totalBooksStarted = users.reduce((acc, u) => acc + (u.booksStarted || 0), 0)
    const totalReadingSeconds = users.reduce((acc, u) => acc + (u.analytics?.totalReadingSeconds || 0), 0)
    const maxStreak = users.reduce((max, u) => Math.max(max, u.streak?.currentStreak || 0), 0)
    const activeRate = totalUsers > 0 ? Math.round((activeCount / totalUsers) * 100) : 100

    return {
      totalUsers,
      adminCount,
      readerCount,
      bannedCount,
      activeCount,
      totalBooksCompleted,
      totalBooksStarted,
      totalReadingSeconds,
      maxStreak,
      activeRate,
    }
  }, [users])

  // Filter and Sort Logic
  const filteredUsers = useMemo(() => {
    let result = [...users]
    const term = search.trim().toLowerCase()

    if (term) {
      result = result.filter((u) => {
        const username = (u.username || '').toLowerCase()
        const email = (u.email || '').toLowerCase()
        const role = (u.role || '').toLowerCase()
        return username.includes(term) || email.includes(term) || role.includes(term)
      })
    }

    if (selectedFilter === 'Readers') {
      result = result.filter((u) => u.role !== 'admin')
    } else if (selectedFilter === 'Admins') {
      result = result.filter((u) => u.role === 'admin')
    } else if (selectedFilter === 'Active') {
      result = result.filter((u) => !u.isBanned)
    } else if (selectedFilter === 'Suspended') {
      result = result.filter((u) => u.isBanned)
    }

    result.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      if (sortBy === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
      if (sortBy === 'streak') return (b.streak?.currentStreak || 0) - (a.streak?.currentStreak || 0)
      if (sortBy === 'completed') return (b.booksCompleted || 0) - (a.booksCompleted || 0)
      if (sortBy === 'name') return (a.username || '').localeCompare(b.username || '')
      return 0
    })

    return result
  }, [users, search, selectedFilter, sortBy])

  // Handle Ban / Unban Execution
  const handleExecuteBanToggle = async () => {
    if (!userToModify?._id) return

    const shouldBan = !userToModify.isBanned
    try {
      setIsProcessingAction(true)
      const endpoint = shouldBan
        ? `/api/users/admin/${userToModify._id}/ban`
        : `/api/users/admin/${userToModify._id}/unban`

      await apiClient.patch(endpoint)

      setUsers((prev) =>
        prev.map((item) => (item._id === userToModify._id ? { ...item, isBanned: shouldBan } : item))
      )

      if (selectedUser && selectedUser._id === userToModify._id) {
        setSelectedUser((prev) => ({ ...prev, isBanned: shouldBan }))
      }

      showToast(`Reader "${userToModify.username}" successfully ${shouldBan ? 'suspended' : 'reactivated'}.`)
      setConfirmModalOpen(false)
      setUserToModify(null)
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Unable to update user status.'
      showToast(msg)
    } finally {
      setIsProcessingAction(false)
    }
  }

  // Copy to clipboard helper
  const copyToClipboard = (text, id) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    showToast(`Copied to clipboard!`)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Export to CSV
  const exportUsersCSV = () => {
    if (!users.length) {
      showToast('No users to export.')
      return
    }

    const headers = ['ID', 'Username', 'Email', 'Role', 'Status', 'Current Streak', 'Books Completed', 'Books Started', 'Total Reading Time (s)', 'Created At']
    const rows = users.map((u) => [
      `"${u._id}"`,
      `"${u.username || ''}"`,
      `"${u.email || ''}"`,
      `"${u.role || 'user'}"`,
      `"${u.isBanned ? 'Suspended' : 'Active'}"`,
      u.streak?.currentStreak || 0,
      u.booksCompleted || 0,
      u.booksStarted || 0,
      u.analytics?.totalReadingSeconds || 0,
      `"${u.createdAt || ''}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `book-verse-users-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('User directory exported to CSV.')
  }

  // Export to JSON
  const exportUsersJSON = () => {
    if (!users.length) {
      showToast('No users to export.')
      return
    }

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(users, null, 2))
    const link = document.createElement('a')
    link.setAttribute('href', dataStr)
    link.setAttribute('download', `book-verse-users-${new Date().toISOString().slice(0, 10)}.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('User directory exported to JSON.')
  }

  const openInspectDrawer = (user) => {
    setSelectedUser(user)
    setDrawerOpen(true)
  }

  const promptBanToggle = (user) => {
    setUserToModify(user)
    setConfirmModalOpen(true)
  }

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#060811] text-slate-100 font-sans selection:bg-purple-500/30 selection:text-purple-200">
      <SEO title="User Command & Reader Access Studio | Admin Suite" />

      {/* Atmospheric Glow Highlights */}
      <div className="pointer-events-none absolute -left-40 top-10 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-purple-600/15 to-indigo-600/10 blur-[140px]" />
      <div className="pointer-events-none absolute right-0 top-32 h-[450px] w-[450px] rounded-full bg-gradient-to-br from-emerald-600/10 to-teal-600/10 blur-[140px]" />
      <div className="pointer-events-none absolute left-1/3 bottom-10 h-[350px] w-[350px] rounded-full bg-blue-600/10 blur-[130px]" />

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="fixed right-6 top-6 z-[100] flex items-center gap-3 rounded-2xl border border-white/15 bg-[#0f172a]/95 px-5 py-3.5 text-sm font-medium text-white shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300">
              <MdAutoAwesome className="text-base" />
            </div>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1600px] grid-cols-1 gap-4 p-3 sm:p-5 lg:grid-cols-[280px_1fr] lg:gap-6 lg:p-6">
        <AdminSidebar />

        <main className="flex flex-col gap-6 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0c101c]/85 p-4 shadow-2xl backdrop-blur-3xl sm:p-6 lg:p-8">
          {/* Header Area */}
          <div className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-0.5 text-[10px] font-bold tracking-[0.2em] text-purple-300 uppercase">
                  CLUSTER CONTROL / USER COMMAND / v4.19-re3
                </span>
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
              </div>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
                User Command & Reader Access
              </h1>
              <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                Monitor reader velocity, streak retention, tier allocations, and cluster access permissions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={fetchUsers}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-200 transition duration-200 hover:border-purple-400/40 hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
                title="Refresh user accounts"
              >
                <MdRefresh className={`text-base ${loading ? 'animate-spin text-purple-400' : ''}`} />
                <span>Sync Directory</span>
              </button>

              <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.03] p-1">
                <button
                  type="button"
                  onClick={exportUsersCSV}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                  title="Export to CSV"
                >
                  <MdFileDownload className="text-sm text-purple-400" />
                  <span>CSV</span>
                </button>
                <div className="h-4 w-px bg-white/10" />
                <button
                  type="button"
                  onClick={exportUsersJSON}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                  title="Export to JSON"
                >
                  <MdFileDownload className="text-sm text-cyan-400" />
                  <span>JSON</span>
                </button>
              </div>
            </div>
          </div>

          {/* KPI Metrics Strip */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Total Registered */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-950/30 via-[#0e1424] to-[#0a0d18] p-4 shadow-lg backdrop-blur-xl"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300/90">Total Readers</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/15 text-purple-300">
                  <MdPeopleAlt className="text-lg" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{loading ? '—' : stats.totalUsers}</span>
                <span className="text-xs font-medium text-emerald-400">● 100% indexed</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-white/[0.06] pt-2">
                <span>{stats.readerCount} Readers</span>
                <span className="text-purple-300 font-semibold">{stats.adminCount} Admins</span>
              </div>
            </motion.div>

            {/* Card 2: Active Health Rate */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 via-[#0e1424] to-[#0a0d18] p-4 shadow-lg backdrop-blur-xl"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/90">Access Health</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                  <MdShield className="text-lg" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{loading ? '—' : `${stats.activeRate}%`}</span>
                <span className="text-xs font-medium text-emerald-400">Active Rate</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-white/[0.06] pt-2">
                <span className="text-emerald-300 font-medium">{stats.activeCount} Active</span>
                <span className="text-rose-400 font-semibold">{stats.bannedCount} Suspended</span>
              </div>
            </motion.div>

            {/* Card 3: Books Completed */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/30 via-[#0e1424] to-[#0a0d18] p-4 shadow-lg backdrop-blur-xl"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300/90">Catalog Velocity</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
                  <MdBookmarkAdded className="text-lg" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{loading ? '—' : stats.totalBooksCompleted}</span>
                <span className="text-xs font-medium text-cyan-300">Finished</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-white/[0.06] pt-2">
                <span>{stats.totalBooksStarted} Books Started</span>
                <span className="text-cyan-300 font-semibold">
                  {stats.totalBooksStarted > 0
                    ? `${Math.round((stats.totalBooksCompleted / stats.totalBooksStarted) * 100)}% complete`
                    : '0%'}
                </span>
              </div>
            </motion.div>

            {/* Card 4: Top Reading Streak */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/30 via-[#0e1424] to-[#0a0d18] p-4 shadow-lg backdrop-blur-xl"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300/90">Peak Retention</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
                  <MdLocalFireDepartment className="text-lg" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{loading ? '—' : `${stats.maxStreak}d`}</span>
                <span className="text-xs font-medium text-amber-400">Max Streak</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-white/[0.06] pt-2">
                <span>Total Time Logged</span>
                <span className="text-amber-300 font-semibold">{formatReadingTime(stats.totalReadingSeconds)}</span>
              </div>
            </motion.div>
          </div>

          {/* Search, Filter & Controls Toolbar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Search Bar */}
              <div className="relative flex-1">
                <MdSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by username, email, or role... (Press ⌘K or Ctrl+K)"
                  className="w-full rounded-xl border border-white/10 bg-[#090d19]/90 pl-10 pr-24 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition duration-200 focus:border-purple-500/50 focus:bg-[#0c1222] focus:ring-2 focus:ring-purple-500/20"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                  >
                    Clear
                  </button>
                ) : (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                    ⌘K
                  </span>
                )}
              </div>

              {/* Sort selector & View Mode toggle */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span>Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="rounded-xl border border-white/10 bg-[#090d19] px-3 py-2 text-xs font-semibold text-slate-200 outline-none transition focus:border-purple-400/40"
                  >
                    <option value="newest">Newest Registration</option>
                    <option value="oldest">Oldest Registration</option>
                    <option value="streak">Highest Streak 🔥</option>
                    <option value="completed">Most Books Read</option>
                    <option value="name">Username (A-Z)</option>
                  </select>
                </div>

                {/* Grid / Table Toggle */}
                <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                      viewMode === 'table'
                        ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(147,51,234,0.4)]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Table View"
                  >
                    <MdTableRows className="text-sm" />
                    <span className="hidden sm:inline">Table</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                      viewMode === 'grid'
                        ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(147,51,234,0.4)]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Grid View"
                  >
                    <MdGridView className="text-sm" />
                    <span className="hidden sm:inline">Grid</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/[0.05]">
              {[
                { label: 'All Users', key: 'All', count: users.length },
                { label: 'Standard Readers', key: 'Readers', count: stats.readerCount },
                { label: 'Administrators', key: 'Admins', count: stats.adminCount },
                { label: 'Active Readers', key: 'Active', count: stats.activeCount },
                { label: 'Suspended Accounts', key: 'Suspended', count: stats.bannedCount },
              ].map((f) => {
                const isActive = selectedFilter === f.key
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setSelectedFilter(f.key)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition duration-200 ${
                      isActive
                        ? 'border border-purple-400/50 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 text-white shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                        : 'border border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200'
                    }`}
                  >
                    <span>{f.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                        isActive ? 'bg-purple-400/20 text-purple-200' : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      {f.count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              <MdBlock className="text-xl text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* TABLE VIEW */}
          {viewMode === 'table' ? (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#090d18]/90 shadow-2xl backdrop-blur-2xl"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-4">Reader Identity</th>
                      <th className="px-4 py-4">Role & Tier</th>
                      <th className="px-4 py-4">Reading Velocity</th>
                      <th className="px-4 py-4">Streak Retention</th>
                      <th className="px-4 py-4">Reading Time</th>
                      <th className="px-4 py-4">Joined Timeline</th>
                      <th className="px-4 py-4">Access Status</th>
                      <th className="px-5 py-4 text-right">Cluster Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {loading ? (
                      [...Array(6)].map((_, idx) => (
                        <tr key={idx} className="animate-pulse">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-white/10" />
                              <div className="space-y-1.5">
                                <div className="h-4 w-28 rounded bg-white/10" />
                                <div className="h-3 w-36 rounded bg-white/5" />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="h-6 w-20 rounded-full bg-white/10" />
                          </td>
                          <td className="px-4 py-4">
                            <div className="h-4 w-24 rounded bg-white/10" />
                          </td>
                          <td className="px-4 py-4">
                            <div className="h-6 w-16 rounded bg-white/10" />
                          </td>
                          <td className="px-4 py-4">
                            <div className="h-4 w-16 rounded bg-white/10" />
                          </td>
                          <td className="px-4 py-4">
                            <div className="h-4 w-20 rounded bg-white/10" />
                          </td>
                          <td className="px-4 py-4">
                            <div className="h-6 w-18 rounded-full bg-white/10" />
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="ml-auto h-8 w-24 rounded-xl bg-white/10" />
                          </td>
                        </tr>
                      ))
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-6 py-16 text-center">
                          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-2xl text-slate-400">
                            <MdPeopleAlt />
                          </div>
                          <h3 className="mt-3 text-base font-bold text-white">No readers found</h3>
                          <p className="mt-1 text-xs text-slate-400">
                            {search
                              ? `No user records matched "${search}". Try adjusting your filters.`
                              : 'No users registered in the database.'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => {
                        const tier = getReaderTier(user.booksCompleted, user.streak?.currentStreak)
                        const streakDays = user.streak?.currentStreak || 0
                        const isAdmin = user.role === 'admin'
                        const isBanned = Boolean(user.isBanned)

                        return (
                          <tr
                            key={user._id}
                            className="group transition duration-150 hover:bg-white/[0.03]"
                          >
                            {/* Identity */}
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  {user.avatar ? (
                                    <img
                                      src={user.avatar}
                                      alt={user.username}
                                      className="h-10 w-10 rounded-xl object-cover border border-white/15"
                                    />
                                  ) : (
                                    <div
                                      className={`flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-black text-white shadow-inner ${
                                        isAdmin
                                          ? 'border-purple-400/40 bg-gradient-to-tr from-purple-600 to-indigo-600'
                                          : 'border-blue-400/30 bg-gradient-to-tr from-blue-600 to-cyan-700'
                                      }`}
                                    >
                                      {getInitial(user)}
                                    </div>
                                  )}
                                  <span
                                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#090d18] ${
                                      isBanned ? 'bg-rose-500' : 'bg-emerald-400'
                                    }`}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-white group-hover:text-purple-300 transition">
                                      {user.username || 'Anonymous'}
                                    </span>
                                    {isAdmin && (
                                      <span
                                        title="Administrator"
                                        className="rounded bg-purple-500/20 px-1 text-[10px] font-bold text-purple-300"
                                      >
                                        👑 Admin
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <span className="truncate max-w-[170px]">{user.email || 'No email registered'}</span>
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(user._id, user._id)}
                                      className="text-slate-500 hover:text-purple-300 transition"
                                      title="Copy User ID"
                                    >
                                      {copiedId === user._id ? (
                                        <MdCheck className="text-emerald-400" />
                                      ) : (
                                        <MdContentCopy className="text-[11px]" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Role & Tier */}
                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-1">
                                <span
                                  className={`inline-flex w-max items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                                    isAdmin
                                      ? 'border-purple-500/40 bg-purple-500/15 text-purple-300'
                                      : 'border-blue-500/30 bg-blue-500/10 text-blue-300'
                                  }`}
                                >
                                  {isAdmin ? <MdAdminPanelSettings /> : <MdPerson />}
                                  {user.role || 'user'}
                                </span>
                                <span
                                  className={`inline-flex w-max items-center gap-1 rounded-full border px-2 py-0.2 text-[9px] font-bold ${tier.border} ${tier.bg} ${tier.text}`}
                                >
                                  {tier.name}
                                </span>
                              </div>
                            </td>

                            {/* Reading Velocity */}
                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-1 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-emerald-300">
                                    {user.booksCompleted || 0} finished
                                  </span>
                                  <span className="text-slate-500">/</span>
                                  <span className="text-slate-400">{user.booksStarted || 0} started</span>
                                </div>
                                {/* Progress bar */}
                                <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
                                  <div
                                    className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                                    style={{
                                      width: `${
                                        user.booksStarted > 0
                                          ? Math.min(100, Math.round(((user.booksCompleted || 0) / user.booksStarted) * 100))
                                          : 0
                                      }%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Streak Retention */}
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-1.5">
                                <div
                                  className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-black ${
                                    streakDays > 0
                                      ? 'border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                                      : 'border-white/10 bg-white/[0.03] text-slate-500'
                                  }`}
                                >
                                  <MdLocalFireDepartment className={streakDays > 0 ? 'text-amber-400' : 'text-slate-600'} />
                                  <span>{streakDays} {streakDays === 1 ? 'day' : 'days'}</span>
                                </div>
                              </div>
                            </td>

                            {/* Reading Time */}
                            <td className="px-4 py-4 text-xs font-semibold text-slate-300">
                              <div className="flex items-center gap-1">
                                <MdTimer className="text-slate-500 text-sm" />
                                <span>{formatReadingTime(user.analytics?.totalReadingSeconds)}</span>
                              </div>
                            </td>

                            {/* Joined Timeline */}
                            <td className="px-4 py-4 text-xs text-slate-400">
                              <div>{formatDate(user.createdAt)}</div>
                              <div className="text-[10px] text-slate-500">{formatTimeAgo(user.createdAt)}</div>
                            </td>

                            {/* Access Status */}
                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                                  isBanned
                                    ? 'border-rose-500/40 bg-rose-500/15 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                                    : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    isBanned ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'
                                  }`}
                                />
                                {isBanned ? 'Suspended' : 'Active'}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openInspectDrawer(user)}
                                  className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 transition duration-150 hover:border-purple-400/40 hover:bg-purple-600/20 hover:text-white"
                                  title="Inspect Reader Telemetry"
                                >
                                  <MdInfoOutline className="text-sm" />
                                  <span>Inspect</span>
                                </button>

                                {isAdmin ? (
                                  <span
                                    className="cursor-not-allowed rounded-xl border border-white/5 bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-slate-600"
                                    title="Admins cannot be banned"
                                  >
                                    Protected
                                  </span>
                                ) : isBanned ? (
                                  <button
                                    type="button"
                                    onClick={() => promptBanToggle(user)}
                                    className="flex items-center gap-1 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-200 transition duration-150 hover:bg-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                                  >
                                    <MdLockOpen className="text-sm" />
                                    <span>Unban</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => promptBanToggle(user)}
                                    className="flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-300 transition duration-150 hover:bg-rose-500/25"
                                  >
                                    <MdBlock className="text-sm" />
                                    <span>Suspend</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </motion.section>
          ) : (
            /* GRID VIEW */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-64 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
                  />
                ))
              ) : filteredUsers.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-400">
                  <p>No reader profiles match current query.</p>
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const tier = getReaderTier(user.booksCompleted, user.streak?.currentStreak)
                  const streakDays = user.streak?.currentStreak || 0
                  const isAdmin = user.role === 'admin'
                  const isBanned = Boolean(user.isBanned)

                  return (
                    <motion.div
                      key={user._id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#101728]/90 to-[#090e1a]/95 p-5 shadow-xl backdrop-blur-xl transition duration-200 hover:border-purple-500/40 hover:shadow-[0_10px_30px_rgba(168,85,247,0.15)]"
                    >
                      {/* Top bar in card */}
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.username}
                                className="h-12 w-12 rounded-2xl object-cover border border-white/20"
                              />
                            ) : (
                              <div
                                className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-base font-black text-white shadow-lg ${
                                  isAdmin
                                    ? 'border-purple-400/40 bg-gradient-to-tr from-purple-600 to-indigo-600'
                                    : 'border-blue-400/30 bg-gradient-to-tr from-blue-600 to-cyan-700'
                                }`}
                              >
                                {getInitial(user)}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-black text-white text-base group-hover:text-purple-300 transition">
                                  {user.username || 'Anonymous'}
                                </h4>
                                {isAdmin && (
                                  <span className="rounded bg-purple-500/20 px-1 py-0.2 text-[9px] font-black text-purple-300">
                                    👑 ADMIN
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 truncate max-w-[180px]">
                                {user.email || 'No email provided'}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                              isBanned
                                ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                                : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${isBanned ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                            {isBanned ? 'Suspended' : 'Active'}
                          </span>
                        </div>

                        {/* Tier & Streak strip */}
                        <div className="mt-4 flex items-center justify-between border-y border-white/[0.06] py-2.5">
                          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${tier.border} ${tier.bg} ${tier.text}`}>
                            {tier.name}
                          </span>
                          <div className="flex items-center gap-1 text-xs font-black text-amber-300">
                            <MdLocalFireDepartment className="text-amber-400 text-sm" />
                            <span>{streakDays}d Streak</span>
                          </div>
                        </div>

                        {/* Reading stats */}
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Books Read</span>
                            <span className="font-bold text-white text-sm">
                              {user.booksCompleted || 0}{' '}
                              <span className="text-[10px] text-slate-500">/ {user.booksStarted || 0}</span>
                            </span>
                          </div>
                          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Time Logged</span>
                            <span className="font-bold text-white text-sm">
                              {formatReadingTime(user.analytics?.totalReadingSeconds)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                        <span className="text-[10px] text-slate-500">Joined {formatTimeAgo(user.createdAt)}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openInspectDrawer(user)}
                            className="rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                          >
                            Inspect
                          </button>
                          {!isAdmin && (
                            <button
                              type="button"
                              onClick={() => promptBanToggle(user)}
                              className={`rounded-xl border px-2.5 py-1.5 text-xs font-bold transition ${
                                isBanned
                                  ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/30'
                                  : 'border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/25'
                              }`}
                            >
                              {isBanned ? 'Unban' : 'Suspend'}
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </motion.div>
          )}
        </main>
      </div>

      {/* SLIDE-OVER READER TELEMETRY DRAWER */}
      <AnimatePresence>
        {drawerOpen && selectedUser && (
          <div className="fixed inset-0 z-[110] flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Drawer container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-white/15 bg-[#090d18] p-6 shadow-2xl overflow-y-auto text-slate-100"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <MdVerified className="text-xl text-purple-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                    Reader Telemetry Profile
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/[0.05] p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                >
                  <MdClose className="text-lg" />
                </button>
              </div>

              {/* User Hero Banner */}
              <div className="mt-5 rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-950/40 via-[#0e1424] to-[#0a0d18] p-5">
                <div className="flex items-center gap-4">
                  {selectedUser.avatar ? (
                    <img
                      src={selectedUser.avatar}
                      alt={selectedUser.username}
                      className="h-16 w-16 rounded-2xl object-cover border-2 border-purple-400/40 shadow-lg"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-purple-400/40 bg-gradient-to-tr from-purple-600 to-indigo-700 text-2xl font-black text-white shadow-lg">
                      {getInitial(selectedUser)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-white truncate">{selectedUser.username}</h3>
                      {selectedUser.role === 'admin' && (
                        <span className="rounded-full border border-purple-500/40 bg-purple-500/20 px-2.5 py-0.5 text-[10px] font-black text-purple-200">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{selectedUser.email || 'No email registered'}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                          selectedUser.isBanned
                            ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                            : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                        }`}
                      >
                        {selectedUser.isBanned ? '● Suspended' : '● Active Account'}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                          getReaderTier(selectedUser.booksCompleted, selectedUser.streak?.currentStreak).border
                        } ${getReaderTier(selectedUser.booksCompleted, selectedUser.streak?.currentStreak).bg} ${
                          getReaderTier(selectedUser.booksCompleted, selectedUser.streak?.currentStreak).text
                        }`}
                      >
                        {getReaderTier(selectedUser.booksCompleted, selectedUser.streak?.currentStreak).name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Telemetry Metric Grids */}
              <div className="mt-5 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Reading Engagement & Retention
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <MdLocalFireDepartment className="text-amber-400" /> Current Streak
                    </span>
                    <p className="mt-1 text-2xl font-black text-amber-300">
                      {selectedUser.streak?.currentStreak || 0} <span className="text-xs font-normal text-slate-400">days</span>
                    </p>
                    <span className="text-[10px] text-slate-500">
                      Longest: {selectedUser.streak?.longestStreak || 0}d
                    </span>
                  </div>

                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <MdTimer className="text-cyan-400" /> Total Reading Time
                    </span>
                    <p className="mt-1 text-2xl font-black text-cyan-300">
                      {formatReadingTime(selectedUser.analytics?.totalReadingSeconds)}
                    </p>
                    <span className="text-[10px] text-slate-500">
                      {selectedUser.analytics?.totalSessions || 0} sessions
                    </span>
                  </div>

                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <MdBookmarkAdded className="text-emerald-400" /> Books Completed
                    </span>
                    <p className="mt-1 text-2xl font-black text-emerald-300">
                      {selectedUser.booksCompleted || 0}{' '}
                      <span className="text-xs font-normal text-slate-400">/ {selectedUser.booksStarted || 0}</span>
                    </p>
                    <span className="text-[10px] text-slate-500">
                      Goal: {selectedUser.readingGoal || 12} books/yr
                    </span>
                  </div>

                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <MdMenuBook className="text-purple-400" /> Total Pages Read
                    </span>
                    <p className="mt-1 text-2xl font-black text-purple-300">
                      {selectedUser.analytics?.totalPagesRead || 0}
                    </p>
                    <span className="text-[10px] text-slate-500">
                      {selectedUser.streak?.totalReadingDays || 0} active days
                    </span>
                  </div>
                </div>

                {/* Annual Goal Completion Meter */}
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">Annual Reading Goal Progress</span>
                    <span className="font-bold text-purple-300">
                      {selectedUser.booksCompleted || 0} of {selectedUser.readingGoal || 12} books
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(((selectedUser.booksCompleted || 0) / (selectedUser.readingGoal || 12)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Database Metadata */}
                <h4 className="pt-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Account Metadata & Security
                </h4>

                <div className="space-y-2 rounded-2xl border border-white/[0.08] bg-[#0c101c] p-4 text-xs">
                  <div className="flex items-center justify-between border-b border-white/[0.05] pb-2">
                    <span className="text-slate-400">User ID</span>
                    <div className="flex items-center gap-1 font-mono text-slate-200">
                      <span>{selectedUser._id}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedUser._id, 'drawer-id')}
                        className="text-slate-400 hover:text-white"
                      >
                        <MdContentCopy className="text-xs" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b border-white/[0.05] pb-2">
                    <span className="text-slate-400">Joined Date</span>
                    <span className="text-slate-200">{formatDate(selectedUser.createdAt)}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-white/[0.05] pb-2">
                    <span className="text-slate-400">Role Permissions</span>
                    <span className="capitalize font-bold text-purple-300">{selectedUser.role || 'user'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Account Access State</span>
                    <span
                      className={`font-bold ${
                        selectedUser.isBanned ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {selectedUser.isBanned ? 'Suspended / Restricted' : 'Active & Authorized'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Drawer Actions */}
              <div className="mt-auto border-t border-white/10 pt-5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(selectedUser, null, 2))
                    const link = document.createElement('a')
                    link.setAttribute('href', dataStr)
                    link.setAttribute('download', `user-${selectedUser.username}.json`)
                    link.click()
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  <MdFileDownload className="text-sm" />
                  <span>Export JSON</span>
                </button>

                {selectedUser.role !== 'admin' && (
                  <button
                    type="button"
                    onClick={() => {
                      promptBanToggle(selectedUser)
                    }}
                    className={`flex items-center gap-1.5 rounded-xl border px-5 py-2.5 text-xs font-bold transition ${
                      selectedUser.isBanned
                        ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
                        : 'border-rose-500/40 bg-rose-500/20 text-rose-200 hover:bg-rose-500/30'
                    }`}
                  >
                    {selectedUser.isBanned ? (
                      <>
                        <MdLockOpen className="text-sm" />
                        <span>Reactivate Account</span>
                      </>
                    ) : (
                      <>
                        <MdBlock className="text-sm" />
                        <span>Suspend Account</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SAFETY CONFIRMATION MODAL */}
      <AnimatePresence>
        {confirmModalOpen && userToModify && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isProcessingAction && setConfirmModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 w-full max-w-md rounded-3xl border border-white/15 bg-[#0e1424] p-6 shadow-2xl text-slate-100"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
                    userToModify.isBanned
                      ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
                      : 'border-rose-500/30 bg-rose-500/15 text-rose-400'
                  }`}
                >
                  {userToModify.isBanned ? <MdLockOpen className="text-2xl" /> : <MdBlock className="text-2xl" />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {userToModify.isBanned ? 'Reactivate Reader Account?' : 'Suspend Reader Account?'}
                  </h3>
                  <p className="text-xs text-slate-400">Confirm access control state update</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Username:</span>
                  <span className="font-bold text-white">{userToModify.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="text-slate-300">{userToModify.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Role:</span>
                  <span className="text-purple-300 font-bold capitalize">{userToModify.role}</span>
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-400 leading-relaxed">
                {userToModify.isBanned
                  ? 'Reactivating this account will restore full reading access, streaks, and library features immediately.'
                  : 'Suspending this reader will block their access to their library, reading progress, and book reader until unbanned.'}
              </p>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isProcessingAction}
                  onClick={() => setConfirmModalOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isProcessingAction}
                  onClick={handleExecuteBanToggle}
                  className={`flex items-center gap-2 rounded-xl border px-5 py-2.5 text-xs font-bold transition shadow-lg ${
                    userToModify.isBanned
                      ? 'border-emerald-500/40 bg-emerald-600 text-white hover:bg-emerald-500'
                      : 'border-rose-500/40 bg-rose-600 text-white hover:bg-rose-500'
                  }`}
                >
                  {isProcessingAction && <MdRefresh className="animate-spin text-sm" />}
                  <span>
                    {isProcessingAction
                      ? 'Processing...'
                      : userToModify.isBanned
                      ? 'Confirm Reactivation'
                      : 'Confirm Suspension'}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
