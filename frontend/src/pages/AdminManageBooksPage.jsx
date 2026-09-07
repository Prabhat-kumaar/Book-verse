import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useMemo, useState, useRef } from 'react'
import {
  MdLibraryBooks,
  MdGridView,
  MdTableRows,
  MdSearch,
  MdFilterList,
  MdAutoAwesome,
  MdRefresh,
  MdEdit,
  MdDelete,
  MdVisibility,
  MdTune,
  MdClose,
  MdCheckCircle,
  MdErrorOutline,
  MdHourglassTop,
  MdFileDownload,
  MdMenuBook,
  MdAdd,
  MdCloudUpload,
} from 'react-icons/md'
import apiClient from '../lib/apiClient'
import AdminSidebar from '../components/AdminSidebar'
import { getBookThumbnailUrl, normalizeMediaUrl } from '../lib/mediaUrls'
import { useNavigate } from 'react-router-dom'
import SEO from '../components/SEO'

const normalizeBook = (book = {}) => ({
  ...book,
  fileUrl: normalizeMediaUrl(book?.fileUrl || book?.pdf || ''),
  pdf: normalizeMediaUrl(book?.pdf || ''),
  thumbnail: normalizeMediaUrl(book?.thumbnail || ''),
})

export default function AdminManageBooksPage() {
  const navigate = useNavigate()
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [formatFilter, setFormatFilter] = useState('All')
  const [sortBy, setSortBy] = useState('newest')
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'table'
  const [toastMessage, setToastMessage] = useState('')

  // Multi-select state
  const [selectedBookIds, setSelectedBookIds] = useState(new Set())

  // Slide-over Quick Edit Drawer
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingBook, setEditingBook] = useState(null)
  const [drawerForm, setDrawerForm] = useState({
    title: '',
    author: '',
    category: '',
    difficulty: 'Intermediate',
    coverImage: '',
    description: '',
    tags: '',
  })
  const [isSavingDrawer, setIsSavingDrawer] = useState(false)

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [bookToDelete, setBookToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const searchInputRef = useRef(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  // Keyboard shortcut ⌘K
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

  const fetchBooks = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/api/books?limit=200')
      const payload = response.data
      const resolvedBooks = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.books)
          ? payload.books
          : Array.isArray(payload?.data)
            ? payload.data
            : []
      setBooks(resolvedBooks.map(normalizeBook))
    } catch (fetchError) {
      showToast('Unable to load catalog books.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBooks()
  }, [])

  const categories = useMemo(() => {
    const set = new Set(['All'])
    books.forEach((b) => {
      if (b.category) set.add(b.category)
    })
    return Array.from(set)
  }, [books])

  // Filter & Sort
  const filteredBooks = useMemo(() => {
    const term = search.trim().toLowerCase()
    let result = books.filter((book) => {
      const matchSearch =
        !term ||
        book.title?.toLowerCase().includes(term) ||
        book.author?.toLowerCase().includes(term) ||
        book.category?.toLowerCase().includes(term)

      const matchCategory = selectedCategory === 'All' || book.category === selectedCategory

      const matchFormat =
        formatFilter === 'All' ||
        (formatFilter === 'EPUB' && (book.fileType === 'epub' || book.fileUrl?.endsWith('.epub'))) ||
        (formatFilter === 'PDF' && (book.fileType === 'pdf' || book.fileUrl?.endsWith('.pdf') || book.pdf))

      return matchSearch && matchCategory && matchFormat
    })

    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
    } else if (sortBy === 'title') {
      result.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
    } else if (sortBy === 'chapters') {
      result.sort((a, b) => (b.totalChapters || 0) - (a.totalChapters || 0))
    }

    return result
  }, [books, search, selectedCategory, formatFilter, sortBy])

  // Open Quick Edit Drawer
  const handleOpenDrawer = (book) => {
    setEditingBook(book)
    setDrawerForm({
      title: book.title || '',
      author: book.author || '',
      category: book.category || 'General',
      difficulty: book.difficulty || 'Intermediate',
      coverImage: book.coverImage || book.thumbnail || '',
      description: book.description || '',
      tags: Array.isArray(book.tags) ? book.tags.join(', ') : book.tags || '',
    })
    setDrawerOpen(true)
  }

  // Save Drawer Updates
  const handleSaveDrawer = async (e) => {
    e.preventDefault()
    if (!editingBook) return
    setIsSavingDrawer(true)
    try {
      const res = await apiClient.put(`/api/books/${editingBook._id}`, {
        title: drawerForm.title,
        author: drawerForm.author,
        category: drawerForm.category,
        difficulty: drawerForm.difficulty,
        coverImage: drawerForm.coverImage,
        description: drawerForm.description,
        tags: drawerForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
      })

      if (res.data?.success || res.status === 200) {
        showToast(`✅ Metadata updated for "${drawerForm.title}"`)
        setDrawerOpen(false)
        fetchBooks()
      }
    } catch (err) {
      showToast('Failed to save metadata updates.')
    } finally {
      setIsSavingDrawer(false)
    }
  }

  // Delete Book
  const handleDeleteBook = async () => {
    if (!bookToDelete) return
    setIsDeleting(true)
    try {
      await apiClient.delete(`/api/books/${bookToDelete._id}`)
      showToast(`🗑️ Removed "${bookToDelete.title}" from catalog`)
      setDeleteModalOpen(false)
      fetchBooks()
    } catch {
      showToast('Could not delete book.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Re-parse EPUB
  const handleReparse = async (book) => {
    try {
      showToast(`🔄 Re-parsing "${book.title}"...`)
      await apiClient.post(`/api/books/${book._id}/reparse`)
      fetchBooks()
    } catch {
      showToast('Failed to trigger re-parse.')
    }
  }

  // Multi-select
  const toggleSelectBook = (id) => {
    setSelectedBookIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedBookIds.size === filteredBooks.length) {
      setSelectedBookIds(new Set())
    } else {
      setSelectedBookIds(new Set(filteredBooks.map((b) => b._id)))
    }
  }

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Title', 'Author', 'Category', 'Format', 'Chapters', 'Created']
    const rows = filteredBooks.map((b) => [
      b._id,
      `"${b.title || ''}"`,
      `"${b.author || ''}"`,
      `"${b.category || ''}"`,
      b.fileType || 'epub',
      b.totalChapters || 0,
      b.createdAt || '',
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `catalog_studio_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('📊 Exported catalog to CSV')
  }

  return (
    <div className="min-h-screen bg-[#060811] text-slate-100 selection:bg-purple-600/40 selection:text-white">
      <SEO title="Catalog Studio | Readify PRO" />

      <div className="mx-auto flex max-w-[1720px] gap-6 p-4 sm:p-6 lg:p-8">
        <AdminSidebar />

        <main className="flex-1 min-w-0 space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 rounded-3xl border border-white/[0.08] bg-[#090d18]/90 p-5 shadow-2xl backdrop-blur-2xl">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                CLUSTER CONTROL &nbsp;/&nbsp; <span className="text-purple-400">Catalog Studio</span> &nbsp;/&nbsp; v4.19-re3
              </p>
              <div className="mt-1 flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
                  <MdLibraryBooks className="h-7 w-7 text-purple-400" />
                  <span>Catalog Studio &amp; Media Assets</span>
                </h1>
                <span className="hidden sm:inline-flex rounded-full border border-purple-500/30 bg-purple-950/40 px-3 py-0.5 text-xs font-bold text-purple-300">
                  {books.length} Active Manuscripts
                </span>
              </div>
            </div>

            {/* Actions: View Switcher & Ingest Shortcut */}
            <div className="flex items-center gap-3">
              {/* View Switcher: Grid vs Table */}
              <div className="flex items-center rounded-2xl border border-white/10 bg-black/40 p-1 text-slate-400">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                    viewMode === 'grid' ? 'bg-purple-600/30 text-white border border-purple-500/40 shadow' : 'hover:text-white'
                  }`}
                  title="Visual 3D Grid View"
                >
                  <MdGridView className="h-4.5 w-4.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                    viewMode === 'table' ? 'bg-purple-600/30 text-white border border-purple-500/40 shadow' : 'hover:text-white'
                  }`}
                  title="High-Density Table View"
                >
                  <MdTableRows className="h-4.5 w-4.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => navigate('/admin/dashboard')}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-purple-900/40 hover:from-purple-500 hover:to-indigo-500 transition active:scale-[0.98]"
              >
                <MdAdd className="h-4 w-4" />
                <span>+ Ingest New Book</span>
              </button>
            </div>
          </div>

          {/* Search, Filters & Category Pills */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#090d18]/90 p-5 shadow-2xl backdrop-blur-2xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <MdSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${books.length} titles, authors, categories... (⌘K)`}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 pl-10 pr-12 py-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-400">
                  ⌘K
                </span>
              </div>

              {/* Format & Sort Controls */}
              <div className="flex items-center gap-3">
                {/* Format Toggle */}
                <div className="flex items-center rounded-xl border border-white/10 bg-black/40 p-0.5 text-xs font-bold text-slate-400">
                  {['All', 'EPUB', 'PDF'].map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setFormatFilter(fmt)}
                      className={`rounded-lg px-3 py-1.5 transition ${
                        formatFilter === fmt ? 'bg-purple-600/30 text-white border border-purple-500/40 shadow-sm' : 'hover:text-white'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>

                {/* Sort Dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-xl border border-white/10 bg-[#0c1222] px-3 py-2 text-xs font-semibold text-slate-300 focus:border-purple-500 focus:outline-none"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="title">Title (A-Z)</option>
                  <option value="chapters">Most Chapters</option>
                </select>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 transition"
                  title="Export catalog as CSV"
                >
                  <MdFileDownload className="h-4 w-4" /> CSV
                </button>
              </div>
            </div>

            {/* Horizontal Scrolling Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all duration-200 ${
                    selectedCategory === cat
                      ? 'border border-purple-500/40 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 text-white shadow-lg shadow-purple-950/40'
                      : 'border border-white/5 bg-black/40 text-slate-400 hover:border-white/15 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content Area: Grid View vs Table View */}
          {loading ? (
            <div className="rounded-3xl border border-white/[0.08] bg-[#090d18]/90 p-16 text-center shadow-2xl backdrop-blur-2xl font-mono text-slate-400">
              <MdHourglassTop className="inline-block h-6 w-6 animate-spin mr-2 text-purple-400" />
              Loading Studio Catalog...
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="rounded-3xl border border-white/[0.08] bg-[#090d18]/90 p-16 text-center shadow-2xl backdrop-blur-2xl">
              <p className="text-base font-bold text-white">No books match the selected filters</p>
              <p className="mt-1 text-xs text-slate-400">Try changing the category or clearing the search query.</p>
            </div>
          ) : viewMode === 'grid' ? (
            /* Visual 3D Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredBooks.map((book) => {
                const isEpub = book.fileType === 'epub' || book.fileUrl?.endsWith('.epub')
                const isReady = book.parseStatus !== 'failed'

                return (
                  <motion.div
                    key={book._id}
                    whileHover={{ y: -4, scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                    className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#090d18]/95 p-4 shadow-xl backdrop-blur-2xl flex flex-col justify-between"
                  >
                    <div>
                      {/* Cover Thumbnail with 3D drop shadow */}
                      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/15 bg-slate-900 shadow-xl">
                        <img
                          src={getBookThumbnailUrl(book)}
                          alt={book.title}
                          className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                        {/* Format Badge */}
                        <span
                          className={`absolute top-2.5 left-2.5 rounded px-2 py-0.5 text-[9px] font-extrabold uppercase border backdrop-blur-md ${
                            isEpub
                              ? 'border-purple-500/40 bg-purple-950/80 text-purple-300'
                              : 'border-cyan-500/40 bg-cyan-950/80 text-cyan-300'
                          }`}
                        >
                          {isEpub ? 'EPUB 3.3' : 'PDF/A-1b'}
                        </span>

                        {/* Status Pill */}
                        <span className="absolute top-2.5 right-2.5">
                          {isReady ? (
                            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" title="Ready" />
                          ) : (
                            <span className="flex h-2 w-2 rounded-full bg-rose-400" title="Parsing Failed" />
                          )}
                        </span>

                        {/* Chapter / Pages pill */}
                        <div className="absolute bottom-2 left-2.5 flex items-center gap-1 text-[10px] font-bold text-white">
                          <MdMenuBook className="h-3.5 w-3.5 text-purple-400" />
                          <span>{isEpub ? `${book.totalChapters || 12} Chaps` : 'PDF Manuscript'}</span>
                        </div>
                      </div>

                      {/* Title & Author */}
                      <div className="mt-3.5 space-y-1">
                        <h3 className="text-sm font-black text-white group-hover:text-purple-300 transition truncate leading-snug">
                          {book.title}
                        </h3>
                        <p className="text-xs text-slate-400 truncate">{book.author}</p>
                      </div>

                      {/* Category Pill */}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="rounded-lg border border-white/[0.06] bg-black/40 px-2.5 py-1 text-[10px] font-bold text-slate-300">
                          {book.category || 'General'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {book.difficulty || 'Intermediate'}
                        </span>
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => navigate(book.slug ? `/read/${book.slug}` : `/read/${book._id}`)}
                        className="inline-flex items-center gap-1 rounded-xl bg-white/[0.05] px-3 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-600/30 hover:text-white transition"
                      >
                        <MdVisibility className="h-3.5 w-3.5" /> Read
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenDrawer(book)}
                          className="flex h-7 w-7 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-purple-600/30 hover:text-purple-300 transition"
                          title="Quick Edit Drawer"
                        >
                          <MdTune className="h-3.5 w-3.5" />
                        </button>

                        {isEpub && (
                          <button
                            type="button"
                            onClick={() => handleReparse(book)}
                            className="flex h-7 w-7 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-indigo-600/30 hover:text-indigo-300 transition"
                            title="Re-parse EPUB"
                          >
                            <MdRefresh className="h-3.5 w-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setBookToDelete(book)
                            setDeleteModalOpen(true)
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 transition"
                          title="Delete Manuscript"
                        >
                          <MdDelete className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            /* Table View */
            <div className="overflow-x-auto rounded-3xl border border-white/[0.08] bg-[#090d18]/90 p-5 shadow-2xl backdrop-blur-2xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-white/[0.08] bg-black/40 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedBookIds.size === filteredBooks.length && filteredBooks.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-white/20 bg-black/40 text-purple-600 focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4">Manuscript / Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Format</th>
                    <th className="py-3 px-4">Chapters</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredBooks.map((book) => {
                    const isEpub = book.fileType === 'epub' || book.fileUrl?.endsWith('.epub')
                    const isReady = book.parseStatus !== 'failed'
                    const isSelected = selectedBookIds.has(book._id)

                    return (
                      <tr
                        key={book._id}
                        className={`transition-colors ${
                          isSelected ? 'bg-purple-950/20' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectBook(book._id)}
                            className="rounded border-white/20 bg-black/40 text-purple-600 focus:ring-0 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={getBookThumbnailUrl(book)}
                              alt={book.title}
                              className="h-10 w-7 rounded object-cover border border-white/10 shadow shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-white truncate max-w-[240px]">{book.title}</p>
                              <p className="text-[11px] text-slate-400 truncate max-w-[240px]">{book.author}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="rounded-lg border border-white/[0.06] bg-black/40 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                            {book.category || 'General'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`rounded px-2 py-0.5 text-[9px] font-extrabold uppercase border ${
                              isEpub
                                ? 'border-purple-500/30 bg-purple-950/40 text-purple-300'
                                : 'border-cyan-500/30 bg-cyan-950/40 text-cyan-300'
                            }`}
                          >
                            {isEpub ? 'EPUB 3.3' : 'PDF/A-1b'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">{isEpub ? `${book.totalChapters || 12} chaps` : '1 doc'}</td>
                        <td className="py-3 px-4">
                          {isReady ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-950/40 px-2.5 py-0.5 text-[10px] font-bold text-rose-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => navigate(book.slug ? `/read/${book.slug}` : `/read/${book._id}`)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10"
                            >
                              <MdVisibility className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDrawer(book)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-purple-600/30 hover:text-purple-300"
                            >
                              <MdTune className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBookToDelete(book)
                                setDeleteModalOpen(true)
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 hover:bg-rose-500/20 hover:text-rose-300"
                            >
                              <MdDelete className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* Slide-Over Quick Edit Drawer */}
      <AnimatePresence>
        {drawerOpen && editingBook && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="relative z-10 h-full w-full max-w-md border-l border-white/10 bg-[#070b14] p-6 shadow-2xl backdrop-blur-2xl flex flex-col justify-between overflow-y-auto"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <MdTune className="h-5 w-5 text-purple-400" />
                    <h2 className="text-base font-black text-white">Quick Edit Metadata</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white"
                  >
                    <MdClose className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveDrawer} className="mt-6 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300">Title</label>
                    <input
                      type="text"
                      value={drawerForm.title}
                      onChange={(e) => setDrawerForm({ ...drawerForm, title: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300">Author</label>
                    <input
                      type="text"
                      value={drawerForm.author}
                      onChange={(e) => setDrawerForm({ ...drawerForm, author: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300">Category</label>
                      <input
                        type="text"
                        value={drawerForm.category}
                        onChange={(e) => setDrawerForm({ ...drawerForm, category: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-300">Difficulty</label>
                      <select
                        value={drawerForm.difficulty}
                        onChange={(e) => setDrawerForm({ ...drawerForm, difficulty: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-[#0c1222] p-3 text-xs text-white focus:border-purple-500 focus:outline-none"
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300">Cover Thumbnail URL</label>
                    <input
                      type="text"
                      value={drawerForm.coverImage}
                      onChange={(e) => setDrawerForm({ ...drawerForm, coverImage: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300">Description</label>
                    <textarea
                      rows={3}
                      value={drawerForm.description}
                      onChange={(e) => setDrawerForm({ ...drawerForm, description: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={drawerForm.tags}
                      onChange={(e) => setDrawerForm({ ...drawerForm, tags: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </form>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-400 hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDrawer}
                  disabled={isSavingDrawer}
                  className="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-purple-500 transition disabled:opacity-50"
                >
                  {isSavingDrawer ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModalOpen && bookToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setDeleteModalOpen(false)}
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
                <h3 className="text-base font-bold text-white">Delete Manuscript?</h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Are you sure you want to permanently delete <strong className="text-slate-200">"{bookToDelete.title}"</strong> from the catalog?
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-white/5 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteBook}
                  className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-lg hover:bg-rose-500 transition disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Toast */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-[120] rounded-2xl bg-[#131b2e] border border-purple-500/40 px-5 py-3 text-xs font-bold text-white shadow-2xl backdrop-blur-xl animate-bounce">
          {toastMessage}
        </div>
      )}
    </div>
  )
}
