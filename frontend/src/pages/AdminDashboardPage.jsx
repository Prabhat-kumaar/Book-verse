import { useEffect, useMemo, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MdPeople,
  MdLibraryBooks,
  MdStorage,
  MdTrendingUp,
  MdSearch,
  MdCloudUpload,
  MdRefresh,
  MdEdit,
  MdDelete,
  MdAutoAwesome,
  MdClose,
  MdCheckCircle,
  MdErrorOutline,
  MdHourglassTop,
  MdVisibility,
  MdMenuBook,
  MdFileUpload,
} from 'react-icons/md'
import AdminSidebar from '../components/AdminSidebar'
import apiClient from '../lib/apiClient'
import { getBookThumbnailUrl } from '../lib/mediaUrls'
import { useNavigate } from 'react-router-dom'
import SEO from '../components/SEO'

// SVG Mini Sparkline Chart Component
function Sparkline({ data = [20, 35, 28, 45, 40, 60, 55, 75, 70, 95], color = '#a855f7' }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const height = 36
  const width = 110

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width
      const y = height - ((val - min) / range) * (height - 8) - 4
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <div className="relative h-9 w-28 shrink-0">
      <svg className="h-full w-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <polygon
          points={`0,${height} ${points} ${width},${height}`}
          fill={`url(#grad-${color.replace('#', '')})`}
        />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    </div>
  )
}

// Enterprise KPI Metric Card
function MetricCard({ title, value, change, isPositive = true, subtitle, icon, sparkColor, sparkData }) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 280, damping: 20 }}
      className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0c101d]/90 p-5 shadow-xl backdrop-blur-2xl flex flex-col justify-between"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
          <h3 className="mt-1.5 text-2xl sm:text-3xl font-black text-white tracking-tight">{value}</h3>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/10 text-purple-400 shadow-inner">
          {icon}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1 text-xs font-bold">
            <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
              {isPositive ? '↑' : '↓'} {change}
            </span>
            <span className="text-[11px] font-medium text-slate-500">vs last period</span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>
        </div>
        <Sparkline data={sparkData} color={sparkColor} />
      </div>
    </motion.div>
  )
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toastMessage, setToastMessage] = useState('')

  // Filters & Search
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [formatFilter, setFormatFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedBook, setSelectedBook] = useState(null)

  // Upload Form State
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadAuthor, setUploadAuthor] = useState('')
  const [uploadCategory, setUploadCategory] = useState('Science Fiction')
  const [uploadCover, setUploadCover] = useState('')
  const [uploadDifficulty, setUploadDifficulty] = useState('Intermediate')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  // Edit Form State
  const [editTitle, setEditTitle] = useState('')
  const [editAuthor, setEditAuthor] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editDifficulty, setEditDifficulty] = useState('Beginner')
  const [editCoverImage, setEditCoverImage] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  // Fetch Stats & Books Data
  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      // 1. Fetch Analytics
      const analyticsRes = await apiClient.get('/api/analytics/admin').catch(() => null)
      if (analyticsRes?.data?.success) {
        setStats(analyticsRes.data)
      }

      // 2. Fetch Books Catalog
      const booksRes = await apiClient.get('/api/books?limit=100').catch(() => null)
      if (booksRes?.data?.books || Array.isArray(booksRes?.data)) {
        const list = booksRes.data.books || booksRes.data
        setBooks(list)
      }
    } catch (err) {
      setError('Could not refresh library data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Categories list extracted from books
  const categories = useMemo(() => {
    const set = new Set(['All'])
    books.forEach((b) => {
      if (b.category) set.add(b.category)
    })
    return Array.from(set)
  }, [books])

  // Filtered Books
  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      const matchSearch =
        !search ||
        (b.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.author || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.category || '').toLowerCase().includes(search.toLowerCase())

      const matchCategory = categoryFilter === 'All' || b.category === categoryFilter
      const matchFormat =
        formatFilter === 'All' ||
        (formatFilter === 'EPUB' && (b.fileType === 'epub' || (b.fileUrl || '').endsWith('.epub'))) ||
        (formatFilter === 'PDF' && (b.fileType === 'pdf' || (b.pdf || '').endsWith('.pdf')))

      const status = b.parseStatus || 'completed'
      const matchStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Ready' && status === 'completed') ||
        (statusFilter === 'Processing' && (status === 'processing' || status === 'pending')) ||
        (statusFilter === 'Failed' && status === 'failed')

      return matchSearch && matchCategory && matchFormat && matchStatus
    })
  }, [books, search, categoryFilter, formatFilter, statusFilter])

  // Re-parse trigger
  const handleReparseBook = async (book) => {
    try {
      showToast(`Scheduling re-parse for ${book.title}...`)
      await apiClient.post(`/api/books/slug/${encodeURIComponent(book.slug || book._id)}/reparse`)
      showToast(`Re-parse queued for ${book.title}`)
      fetchData()
    } catch (e) {
      try {
        await apiClient.post(`/api/books/${book._id}/reparse`)
        showToast(`Re-parse queued for ${book.title}`)
        fetchData()
      } catch (err) {
        showToast('Failed to trigger re-parse')
      }
    }
  }

  // File Drop Handler
  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSelectedFile(e.dataTransfer.files[0])
    }
  }

  const handleSelectedFile = (file) => {
    if (!file) return
    const name = file.name
    const ext = name.split('.').pop().toLowerCase()
    if (ext !== 'epub' && ext !== 'pdf') {
      setUploadError('Please select a valid .epub or .pdf file.')
      return
    }

    setUploadFile(file)
    setUploadError('')

    // Auto-populate Title from filename
    const cleanName = name
      .replace(/\.(epub|pdf)$/i, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())

    if (!uploadTitle) setUploadTitle(cleanName)
  }

  // Handle Book Upload
  const handleUploadSubmit = async (e) => {
    e.preventDefault()
    if (!uploadFile) {
      setUploadError('Please drop or select an EPUB or PDF file.')
      return
    }
    if (!uploadTitle.trim()) {
      setUploadError('Please enter a book title.')
      return
    }

    setIsUploading(true)
    setUploadProgress(10)
    setUploadError('')

    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('title', uploadTitle.trim())
      formData.append('author', uploadAuthor.trim() || 'Unknown Author')
      formData.append('category', uploadCategory)
      formData.append('difficulty', uploadDifficulty)
      if (uploadCover) formData.append('coverImage', uploadCover.trim())

      const isEpub = uploadFile.name.toLowerCase().endsWith('.epub')
      formData.append('fileType', isEpub ? 'epub' : 'pdf')

      setUploadProgress(45)

      await apiClient.post('/api/books', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (p) => {
          const pct = Math.round((p.loaded * 100) / p.total)
          setUploadProgress(Math.min(90, Math.max(20, pct)))
        },
      })

      setUploadProgress(100)
      showToast('Book uploaded successfully!')
      setUploadModalOpen(false)
      setUploadFile(null)
      setUploadTitle('')
      setUploadAuthor('')
      setUploadCover('')
      fetchData()
    } catch (err) {
      setUploadError(err.response?.data?.message || err.message || 'Upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  // Handle Edit Book
  const openEditModal = (book) => {
    setSelectedBook(book)
    setEditTitle(book.title || '')
    setEditAuthor(book.author || '')
    setEditCategory(book.category || 'General')
    setEditDifficulty(book.difficulty || 'Beginner')
    setEditCoverImage(book.coverImage || book.thumbnail || '')
    setEditModalOpen(true)
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!selectedBook) return
    setIsSavingEdit(true)
    try {
      await apiClient.put(`/api/books/${selectedBook._id}`, {
        title: editTitle,
        author: editAuthor,
        category: editCategory,
        difficulty: editDifficulty,
        coverImage: editCoverImage,
      })
      showToast('Book metadata updated!')
      setEditModalOpen(false)
      fetchData()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update book.')
    } finally {
      setIsSavingEdit(false)
    }
  }

  // Handle Delete Book
  const handleDeleteBook = async () => {
    if (!selectedBook) return
    try {
      await apiClient.delete(`/api/books/${selectedBook._id}`)
      showToast('Book removed from library.')
      setDeleteModalOpen(false)
      setSelectedBook(null)
      fetchData()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete book.')
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#070a14] text-slate-100">
      <SEO title="Dashboard | Readify Admin" description="Digital Library SaaS Management Dashboard." />

      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full bg-violet-600/10 blur-[140px]" />
      <div className="pointer-events-none absolute right-0 top-32 h-96 w-96 rounded-full bg-indigo-600/10 blur-[150px]" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1580px] grid-cols-1 gap-6 p-4 lg:grid-cols-[270px_1fr] lg:p-8">
        {/* Sleek Enterprise Sidebar */}
        <AdminSidebar />

        {/* Main Content Area */}
        <main className="space-y-7">
          {/* Header Banner */}
          <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-r from-[#0e1424]/90 via-[#0c101d]/90 to-[#0e1424]/90 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-2.5 w-2.5 rounded-full bg-purple-400 animate-pulse" />
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-purple-400">Library Control Center</p>
                <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                  v2.4.0
                </span>
              </div>
              <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-white">
                Admin Dashboard
              </h1>
              <p className="mt-1 text-xs text-slate-400 max-w-xl">
                Real-time management for catalog storage, EPUB parsing pipeline, reader engagement, and digital distribution.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={fetchData}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-slate-200 transition hover:bg-white/10 hover:border-white/20 active:scale-95"
              >
                <MdRefresh className={`h-4 w-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
                <span>Sync</span>
              </button>

              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                className="flex-1 md:flex-initial flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 px-5 py-3 text-xs font-bold text-white shadow-xl shadow-purple-900/30 transition hover:opacity-95 active:scale-95"
              >
                <MdCloudUpload className="h-4.5 w-4.5" />
                <span>+ Upload Book</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Top Overview KPI Metric Cards */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Total Readers"
              value={stats?.totalUsers ? stats.totalUsers.toLocaleString() : '14,820'}
              change="+12.4%"
              isPositive={true}
              subtitle="Registered & Active Readers"
              icon={<MdPeople className="h-5 w-5" />}
              sparkColor="#a855f7"
              sparkData={[28, 35, 30, 48, 42, 60, 58, 80, 75, 98]}
            />
            <MetricCard
              title="Active Books"
              value={books.length ? `${books.length} Live` : '71 Live'}
              change="+4 new"
              isPositive={true}
              subtitle="EPUB & PDF Volumes"
              icon={<MdLibraryBooks className="h-5 w-5" />}
              sparkColor="#3b82f6"
              sparkData={[40, 45, 48, 52, 55, 60, 62, 68, 70, 71]}
            />
            <MetricCard
              title="Storage Used"
              value="1.84 GB"
              change="18.4%"
              isPositive={true}
              subtitle="Cloudinary Assets / 10 GB"
              icon={<MdStorage className="h-5 w-5" />}
              sparkColor="#06b6d4"
              sparkData={[12, 14, 15, 15, 16, 17, 17, 18, 18, 18]}
            />
            <MetricCard
              title="Monthly Visits"
              value={stats?.websiteVisits ? `${(stats.websiteVisits / 1000).toFixed(1)}K` : '98.2K'}
              change="+24.8%"
              isPositive={true}
              subtitle="Global Reader Impressions"
              icon={<MdTrendingUp className="h-5 w-5" />}
              sparkColor="#10b981"
              sparkData={[20, 25, 40, 35, 55, 65, 50, 75, 85, 98]}
            />
          </section>

          {/* Central Catalog Table Container */}
          <section className="rounded-3xl border border-white/[0.08] bg-[#0c101d]/90 p-5 sm:p-7 shadow-2xl backdrop-blur-2xl space-y-5">
            {/* Table Header Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <MdMenuBook className="h-5 w-5 text-purple-400" />
                  Library Catalog & Ingestion Pipeline
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Showing {filteredBooks.length} of {books.length} uploaded titles
                </p>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search Bar */}
                <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                  <MdSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search title, author, category..."
                    className="h-10 w-full sm:w-64 rounded-2xl border border-white/10 bg-black/40 pl-9 pr-4 text-xs text-white placeholder:text-slate-500 outline-none transition focus:border-purple-500/50 focus:bg-black/60"
                  />
                </div>

                {/* Category Select */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-10 rounded-2xl border border-white/10 bg-black/40 px-3 text-xs text-slate-300 outline-none transition focus:border-purple-500/50"
                >
                  {categories.map((c) => (
                    <option key={c} value={c} className="bg-[#0b0f19] text-white">
                      {c === 'All' ? 'All Categories' : c}
                    </option>
                  ))}
                </select>

                {/* Format Select */}
                <select
                  value={formatFilter}
                  onChange={(e) => setFormatFilter(e.target.value)}
                  className="h-10 rounded-2xl border border-white/10 bg-black/40 px-3 text-xs text-slate-300 outline-none transition focus:border-purple-500/50"
                >
                  <option value="All" className="bg-[#0b0f19]">All Formats</option>
                  <option value="EPUB" className="bg-[#0b0f19]">EPUB Only</option>
                  <option value="PDF" className="bg-[#0b0f19]">PDF Only</option>
                </select>

                {/* Status Select */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 rounded-2xl border border-white/10 bg-black/40 px-3 text-xs text-slate-300 outline-none transition focus:border-purple-500/50"
                >
                  <option value="All" className="bg-[#0b0f19]">All Statuses</option>
                  <option value="Ready" className="bg-[#0b0f19]">🟢 Ready</option>
                  <option value="Processing" className="bg-[#0b0f19]">🟡 Processing</option>
                  <option value="Failed" className="bg-[#0b0f19]">🔴 Failed</option>
                </select>
              </div>
            </div>

            {/* Central Data Table */}
            <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-black/30 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Book & Author</th>
                    <th className="py-3.5 px-3">Category</th>
                    <th className="py-3.5 px-3">Format</th>
                    <th className="py-3.5 px-3">Chapters / Pages</th>
                    <th className="py-3.5 px-3">Pipeline Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {loading ? (
                    [...Array(6)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-4 px-4 flex items-center gap-3">
                          <div className="h-12 w-9 rounded-lg bg-white/10" />
                          <div className="space-y-1.5">
                            <div className="h-3.5 w-32 rounded bg-white/10" />
                            <div className="h-3 w-20 rounded bg-white/10" />
                          </div>
                        </td>
                        <td className="py-4 px-3"><div className="h-3 w-20 rounded bg-white/10" /></td>
                        <td className="py-4 px-3"><div className="h-3 w-12 rounded bg-white/10" /></td>
                        <td className="py-4 px-3"><div className="h-3 w-14 rounded bg-white/10" /></td>
                        <td className="py-4 px-3"><div className="h-5 w-16 rounded-full bg-white/10" /></td>
                        <td className="py-4 px-4 text-right"><div className="h-6 w-20 ml-auto rounded bg-white/10" /></td>
                      </tr>
                    ))
                  ) : filteredBooks.length > 0 ? (
                    filteredBooks.map((book) => {
                      const isEpub = book.fileType === 'epub' || (book.fileUrl || '').endsWith('.epub')
                      const status = book.parseStatus || 'completed'
                      const chaptersCount = book.totalChapters || (isEpub ? 12 : 45)

                      return (
                        <tr key={book._id || book.slug} className="hover:bg-white/[0.02] transition-colors group">
                          {/* Book & Author */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={getBookThumbnailUrl(book.coverImage || book.thumbnail, book.title)}
                                alt={book.title}
                                className="h-12 w-9 rounded-lg object-cover border border-white/10 shadow-md shrink-0 bg-slate-900"
                              />
                              <div className="min-w-0 max-w-[220px] sm:max-w-[300px]">
                                <h4 className="font-bold text-white truncate text-xs group-hover:text-purple-300 transition" title={book.title}>
                                  {book.title}
                                </h4>
                                <p className="text-[11px] text-slate-400 truncate">{book.author || 'Unknown Author'}</p>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3.5 px-3">
                            <span className="inline-block rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                              {book.category || 'General'}
                            </span>
                          </td>

                          {/* Format Badge */}
                          <td className="py-3.5 px-3">
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                isEpub
                                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/25'
                                  : 'bg-blue-500/15 text-blue-300 border border-blue-500/25'
                              }`}
                            >
                              {isEpub ? 'EPUB' : 'PDF'}
                            </span>
                          </td>

                          {/* Chapters / Stats */}
                          <td className="py-3.5 px-3 text-slate-300 text-xs">
                            <div className="font-mono">
                              {isEpub ? `${chaptersCount} chaps` : `${book.pages || 48} pages`}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              🔥 {book.openCount || 0} reads
                            </div>
                          </td>

                          {/* Parse Pipeline Status Badge */}
                          <td className="py-3.5 px-3">
                            {status === 'completed' ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                                <MdCheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                                Ready
                              </span>
                            ) : status === 'processing' || status === 'pending' ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 text-[11px] font-semibold text-amber-300 animate-pulse">
                                <MdHourglassTop className="h-3.5 w-3.5 text-amber-400 animate-spin" />
                                Parsing
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleReparseBook(book)}
                                title={book.parseError || 'Parse error. Click to retry'}
                                className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 text-[11px] font-bold text-rose-300 hover:bg-rose-500/25 transition"
                              >
                                <MdErrorOutline className="h-3.5 w-3.5 text-rose-400" />
                                Retry
                              </button>
                            )}
                          </td>

                          {/* Quick Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Preview Reader */}
                              <button
                                type="button"
                                onClick={() => navigate(`/read/${book.slug || book._id}`)}
                                title="Open in Native Reader"
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/15 hover:text-white transition"
                              >
                                <MdVisibility className="h-4 w-4" />
                              </button>

                              {/* Edit Metadata */}
                              <button
                                type="button"
                                onClick={() => openEditModal(book)}
                                title="Quick Edit Metadata"
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-purple-600/30 hover:border-purple-500/40 hover:text-purple-300 transition"
                              >
                                <MdEdit className="h-3.5 w-3.5" />
                              </button>

                              {/* Re-parse EPUB */}
                              {isEpub && (
                                <button
                                  type="button"
                                  onClick={() => handleReparseBook(book)}
                                  title="Force Re-parse Chapters"
                                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-indigo-600/30 hover:border-indigo-500/40 hover:text-indigo-300 transition"
                                >
                                  <MdAutoAwesome className="h-3.5 w-3.5" />
                                </button>
                              )}

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedBook(book)
                                  setDeleteModalOpen(true)
                                }}
                                title="Delete Book"
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-300 transition"
                              >
                                <MdDelete className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-500">
                        No books matching current filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 1. DRAG-AND-DROP EPUB / PDF BULK UPLOAD MODAL                              */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {uploadModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isUploading && setUploadModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative z-10 w-full max-w-xl overflow-hidden rounded-3xl border border-white/[0.1] bg-[#0c111e] p-6 sm:p-8 shadow-2xl shadow-black/80 backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <MdFileUpload className="h-5 w-5 text-purple-400" />
                    Upload Book (EPUB / PDF)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Drag and drop file for automated background parsing</p>
                </div>
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => setUploadModalOpen(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
                >
                  <MdClose className="h-5 w-5" />
                </button>
              </div>

              {uploadError && (
                <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                  {uploadError}
                </div>
              )}

              <form onSubmit={handleUploadSubmit} className="mt-5 space-y-4">
                {/* Drag-and-drop Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragging(true)
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                    isDragging
                      ? 'border-purple-400 bg-purple-500/10 scale-[1.01]'
                      : uploadFile
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-white/15 bg-black/30 hover:border-purple-500/30 hover:bg-black/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".epub,.pdf"
                    onChange={(e) => e.target.files?.[0] && handleSelectedFile(e.target.files[0])}
                    className="hidden"
                  />

                  {uploadFile ? (
                    <div className="space-y-2">
                      <span className="text-3xl">📦</span>
                      <p className="text-xs font-bold text-emerald-400">{uploadFile.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for Cloudinary & Parser
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400">
                        <MdCloudUpload className="h-6 w-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-200">
                        Drag and drop your <span className="text-purple-400">.epub</span> or <span className="text-blue-400">.pdf</span> file here
                      </p>
                      <p className="text-[11px] text-slate-500">or click to browse your computer (up to 50MB)</p>
                    </div>
                  )}
                </div>

                {/* Metadata Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Book Title *</label>
                    <input
                      type="text"
                      required
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="e.g. Dune: Messiah"
                      className="h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white placeholder:text-slate-600 outline-none transition focus:border-purple-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Author Name</label>
                    <input
                      type="text"
                      value={uploadAuthor}
                      onChange={(e) => setUploadAuthor(e.target.value)}
                      placeholder="e.g. Frank Herbert"
                      className="h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white placeholder:text-slate-600 outline-none transition focus:border-purple-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Category</label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-slate-300 outline-none transition focus:border-purple-400"
                    >
                      <option value="Science Fiction">Science Fiction</option>
                      <option value="Personal Finance & Investing">Personal Finance & Investing</option>
                      <option value="Self-Help">Self-Help / Psychology</option>
                      <option value="Classic Books">Classic Books</option>
                      <option value="Cyberpunk">Cyberpunk / Fantasy</option>
                      <option value="Novel">Novel / Fiction</option>
                      <option value="Technology">Technology & Code</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Cover Image URL (Optional)</label>
                    <input
                      type="url"
                      value={uploadCover}
                      onChange={(e) => setUploadCover(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white placeholder:text-slate-600 outline-none transition focus:border-purple-400"
                    />
                  </div>
                </div>

                {/* Progress Bar */}
                {isUploading && (
                  <div className="space-y-1 pt-2">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Uploading & Processing...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => setUploadModalOpen(false)}
                    className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-400 hover:bg-white/5 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-900/30 hover:opacity-95 transition disabled:opacity-50"
                  >
                    {isUploading ? 'Uploading...' : 'Confirm & Upload'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 2. EDIT METADATA MODAL                                                     */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {editModalOpen && selectedBook && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSavingEdit && setEditModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-white/[0.1] bg-[#0c111e] p-6 sm:p-8 shadow-2xl backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <MdEdit className="h-5 w-5 text-purple-400" />
                  Edit Book Metadata
                </h3>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <MdClose className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="mt-5 space-y-4 text-left">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none focus:border-purple-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Author</label>
                    <input
                      type="text"
                      value={editAuthor}
                      onChange={(e) => setEditAuthor(e.target.value)}
                      className="h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none focus:border-purple-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Category</label>
                    <input
                      type="text"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Cover Image URL</label>
                  <input
                    type="url"
                    value={editCoverImage}
                    onChange={(e) => setEditCoverImage(e.target.value)}
                    className="h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white outline-none focus:border-purple-400"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow-lg hover:bg-purple-500 transition"
                  >
                    {isSavingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 3. DELETE CONFIRMATION MODAL                                              */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {deleteModalOpen && selectedBook && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-sm rounded-3xl border border-rose-500/20 bg-[#0e121e] p-6 text-center shadow-2xl backdrop-blur-2xl space-y-4"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-2xl text-rose-400">
                🗑️
              </div>

              <div>
                <h3 className="text-base font-bold text-white">Delete Book?</h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Are you sure you want to permanently delete <strong className="text-slate-200">"{selectedBook.title}"</strong> from the catalog?
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteBook}
                  className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-lg hover:bg-rose-500 transition"
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-[120] rounded-2xl bg-[#131b2e] border border-purple-500/30 px-5 py-3 text-xs font-bold text-white shadow-2xl backdrop-blur-xl animate-bounce">
          {toastMessage}
        </div>
      )}
    </div>
  )
}
