import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import apiClient from '../lib/apiClient'
import AdminSidebar from '../components/AdminSidebar'
import CategoryCombobox from '../components/CategoryCombobox'
import { applyThumbnailFallback, getBookThumbnailUrl, normalizeMediaUrl } from '../lib/mediaUrls'

const inputClass =
  'w-full rounded-xl border border-white/15 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition duration-300 placeholder:text-slate-400 focus:border-blue-300/55 focus:bg-slate-900/70 focus:shadow-[0_0_0_4px_rgba(98,108,255,0.2)]'

const normalizeBook = (book = {}) => ({
  ...book,
  fileUrl: normalizeMediaUrl(book?.fileUrl || book?.pdf || ''),
  pdf: normalizeMediaUrl(book?.pdf || ''),
  thumbnail: normalizeMediaUrl(book?.thumbnail || ''),
})

const normalizeText = (value) => (value || '').toString().trim().toLowerCase()

export default function AdminManageBooksPage() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [toast, setToast] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({
    title: '',
    author: '',
    category: '',
    fileUrl: '',
    fileType: 'pdf',
    thumbnail: '',
  })
  const [editError, setEditError] = useState('')
  const [updating, setUpdating] = useState(false)

  const fetchBooks = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await apiClient.get('/api/books')
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
      setError(fetchError.response?.data?.message || fetchError.message || 'Unable to load books.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBooks()
  }, [])

  const categories = useMemo(
    () => ['All', ...new Set(books.map((book) => book.category).filter(Boolean))],
    [books],
  )

  const filteredBooks = useMemo(() => {
    const term = normalizeText(search)
    return books.filter((book) => {
      const matchesCategory = category === 'All' || book.category === category
      const matchesSearch = !term || [
        normalizeText(book.title),
        normalizeText(book.author),
        normalizeText(book.category),
      ].some((value) => value.includes(term))
      return matchesCategory && matchesSearch
    })
  }, [books, category, search])

  const handleEdit = (book) => {
    setEditTarget(book)
    setEditForm({
      title: book.title || '',
      author: book.author || '',
      category: book.category || '',
      fileUrl: book.fileUrl || book.pdf || '',
      fileType: book.fileType || 'pdf',
      thumbnail: book.thumbnail || '',
    })
    setEditError('')
  }

  const handleUpdateBook = async (event) => {
    event.preventDefault()
    if (!editTarget?._id) return

    if (!editForm.title.trim() || !editForm.author.trim() || !editForm.category.trim() || !editForm.fileUrl.trim() || !editForm.thumbnail.trim()) {
      setEditError('All fields are required.')
      return
    }

    try {
      setUpdating(true)
      setEditError('')

      const response = await apiClient.put(`/api/books/${editTarget._id}`, {
          title: editForm.title.trim(),
          author: editForm.author.trim(),
          category: editForm.category.trim(),
          fileUrl: editForm.fileUrl.trim(),
          fileType: editForm.fileType,
          thumbnail: editForm.thumbnail.trim(),
      })
      const payload = response.data
      const updatedBook = normalizeBook(payload?.data || payload)
      setBooks((prev) => prev.map((book) => (book._id === editTarget._id ? updatedBook : book)))
      setEditTarget(null)
      setToast('Book updated successfully.')
      setTimeout(() => setToast(''), 2200)
    } catch (updateError) {
      setEditError(updateError.response?.data?.message || updateError.message || 'Unable to update book.')
    } finally {
      setUpdating(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget?._id) return
    const removedBook = deleteTarget
    const previousBooks = books

    try {
      setDeleting(true)
      setBooks((prev) => prev.filter((book) => book._id !== removedBook._id))
      setDeleteTarget(null)

      await apiClient.delete(`/api/books/${removedBook._id}`)
      setToast(`Deleted "${removedBook.title}" successfully.`)
      setTimeout(() => setToast(''), 2200)
    } catch (deleteError) {
      setBooks(previousBooks)
      setError(deleteError.response?.data?.message || deleteError.message || 'Unable to delete book.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#050914] text-slate-100">
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-blue-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-violet-500/20 blur-[130px]" />

      {toast ? (
        <div className="fixed right-4 top-4 z-[80] rounded-xl border border-emerald-300/40 bg-emerald-500/20 px-4 py-3 text-sm font-semibold text-emerald-100 shadow-[0_12px_30px_rgba(16,185,129,0.25)] backdrop-blur-xl">
          {toast}
        </div>
      ) : null}

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 gap-4 p-4 lg:grid-cols-[280px_1fr] lg:gap-6 lg:p-6">
        <AdminSidebar />

        <main className="rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.08] to-white/[0.03] p-5 backdrop-blur-2xl lg:p-8">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100/80">Catalog Control</p>
            <h2 className="mt-1 text-3xl font-black text-white sm:text-4xl">Manage Books</h2>
            <p className="mt-2 text-sm text-slate-300">Search, filter, update, or remove books from the Readify catalog.</p>
          </div>

          <div className="mb-5 grid gap-4 md:grid-cols-[1fr_220px_auto]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, author, or category..."
              className={inputClass}
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
            >
              {categories.map((item) => (
                <option key={item} value={item} className="bg-slate-900">
                  {item}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={fetchBooks}
              className="rounded-xl border border-white/20 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-blue-300/35 hover:bg-white/[0.12]"
            >
              Refresh
            </button>
          </div>

          {error ? <p className="mb-4 text-sm text-rose-300">{error}</p> : null}

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="h-44 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
              ))}
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-sm text-slate-300">
              No books found for your current filters.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredBooks.map((book) => (
                <motion.article
                  key={book._id}
                  whileHover={{ y: -4, scale: 1.01 }}
                    className="min-w-0 rounded-2xl border border-white/12 bg-white/[0.05] p-4 shadow-[0_10px_35px_rgba(5,10,30,0.35)] backdrop-blur-xl"
                >
                  <div className="mb-3 h-36 overflow-hidden rounded-xl bg-slate-900/60">
                    {book.thumbnail ? (
                      <img loading="lazy" src={getBookThumbnailUrl(book)} onError={applyThumbnailFallback} alt={book.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-sm text-slate-400">No Thumbnail</div>
                    )}
                  </div>

                  <h3 className="line-clamp-1 text-base font-bold text-white">{book.title}</h3>
                  <p className="mt-1 line-clamp-1 text-sm text-slate-300">{book.author}</p>
                  <span className="mt-2 inline-flex rounded-full border border-blue-300/30 bg-blue-400/10 px-2 py-1 text-[11px] font-semibold text-blue-100">
                    {book.category || 'Uncategorized'}
                  </span>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => handleEdit(book)}
                      className="flex-1 rounded-lg border border-white/20 bg-white/[0.08] px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-blue-300/35 hover:bg-white/[0.12]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(book)}
                      className="flex-1 rounded-lg border border-rose-300/35 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20"
                    >
                      Delete
                    </button>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </main>
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-[#02050fcc] p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-950/90 p-5 shadow-[0_20px_60px_rgba(4,7,24,0.65)]">
            <h4 className="text-lg font-bold text-white">Confirm Delete</h4>
            <p className="mt-2 text-sm text-slate-300">
              Are you sure you want to delete <span className="font-semibold text-white">{deleteTarget.title}</span>? This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-white/20 bg-white/[0.08] px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.14]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="rounded-lg border border-rose-300/35 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-65"
              >
                {deleting ? 'Deleting...' : 'Delete Book'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editTarget ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-[#02050fcc] p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-slate-950/95 p-5 shadow-[0_20px_60px_rgba(4,7,24,0.65)]">
            <h4 className="text-lg font-bold text-white">Edit Book</h4>
            <p className="mt-1 text-sm text-slate-300">Update details for {editTarget.title}</p>

            <form onSubmit={handleUpdateBook} className="mt-4 grid gap-4 sm:grid-cols-2">
              <input
                value={editForm.title}
                onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Title"
                className={inputClass}
              />
              <input
                value={editForm.author}
                onChange={(e) => setEditForm((prev) => ({ ...prev, author: e.target.value }))}
                placeholder="Author"
                className={inputClass}
              />
              <CategoryCombobox
                value={editForm.category}
                onChange={(val) => setEditForm((prev) => ({ ...prev, category: val }))}
                placeholder="Category"
              />
              <input
                value={editForm.fileUrl}
                onChange={(e) => setEditForm((prev) => ({ ...prev, fileUrl: e.target.value }))}
                placeholder="Book File URL"
                className={inputClass}
              />
              <select
                value={editForm.fileType}
                onChange={(e) => setEditForm((prev) => ({ ...prev, fileType: e.target.value }))}
                className={inputClass}
              >
                <option value="pdf" className="bg-slate-900">PDF</option>
                <option value="epub" className="bg-slate-900">EPUB</option>
              </select>
              <input
                value={editForm.thumbnail}
                onChange={(e) => setEditForm((prev) => ({ ...prev, thumbnail: e.target.value }))}
                placeholder="Thumbnail URL"
                className={`${inputClass} sm:col-span-2`}
              />

              {editError ? <p className="sm:col-span-2 text-sm text-rose-300">{editError}</p> : null}

              <div className="sm:col-span-2 mt-1 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="rounded-lg border border-white/20 bg-white/[0.08] px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.14]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="rounded-lg border border-blue-300/35 bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-65"
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
