import { useEffect, useMemo, useRef, useState } from 'react'
import { FaPen, FaTrash } from 'react-icons/fa'
import { Link } from 'react-router-dom'
import apiClient from '../lib/apiClient'
import { useSavedBooksContext } from '../context/SavedBooksContext'
import useProgress from '../hooks/useProgress'
import EmptyState from '../components/EmptyState'
import { GridSkeleton } from '../components/Skeletons'
import { buildReaderHash } from '../lib/readerLink'
import { applyThumbnailFallback, getBookThumbnailUrl } from '../lib/mediaUrls'
import { buildProgressMap } from '../lib/readingProgress'

const ORDER_KEY = 'savedCollectionsOrder'

function sortCollectionsByOrder(collections, order) {
  const indexMap = new Map(order.map((id, index) => [id, index]))
  return [...collections].sort((a, b) => {
    const aIndex = indexMap.has(a._id) ? indexMap.get(a._id) : Number.MAX_SAFE_INTEGER
    const bIndex = indexMap.has(b._id) ? indexMap.get(b._id) : Number.MAX_SAFE_INTEGER
    if (aIndex !== bIndex) return aIndex - bIndex
    return a.createdAt > b.createdAt ? 1 : -1
  })
}

function getCategoryColor(category) {
  const cat = (category || '').toString().trim().toLowerCase()
  if (cat.includes('business') || cat.includes('finance')) return '#10b981' // green
  if (cat.includes('programming') || cat.includes('code') || cat.includes('software')) return '#3b82f6' // blue
  if (cat.includes('self-help') || cat.includes('selfhelp') || cat.includes('psychology')) return '#a855f7' // purple
  if (cat.includes('productivity') || cat.includes('time')) return '#f97316' // orange
  if (cat.includes('startup') || cat.includes('entrepreneur')) return '#06b6d4' // cyan
  if (cat.includes('design') || cat.includes('ui') || cat.includes('ux') || cat.includes('art')) return '#ec4899' // pink
  if (cat.includes('ai') || cat.includes('artificial') || cat.includes('machine')) return '#6366f1' // indigo
  if (cat.includes('lifestyle') || cat.includes('health') || cat.includes('fitness')) return '#eab308' // yellow
  return '#6b7280' // default gray
}

export default function SavedBooksPage() {
  const {
    collections,
    createCollection,
    refresh,
    removeSavedBook,
    savedBooksByCollection,
    fetchSavedBooksByCollection,
  } = useSavedBooksContext()
  const [selectedCollectionId, setSelectedCollectionId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [editingId, setEditingId] = useState('')
  const [editingName, setEditingName] = useState('')
  const [draggingId, setDraggingId] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [collectionOrder, setCollectionOrder] = useState(() => {
    try {
      const raw = localStorage.getItem(ORDER_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })
  const [removingIds, setRemovingIds] = useState([])
  const [toast, setToast] = useState('')
  const removeTimersRef = useRef({})
  const authUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('authUser')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [])
  const { progressItems } = useProgress(authUser?._id)

  const orderedCollections = useMemo(() => sortCollectionsByOrder(collections, collectionOrder), [collections, collectionOrder])

  useEffect(() => {
    const ids = orderedCollections.map((item) => item._id)
    setCollectionOrder(ids)
    localStorage.setItem(ORDER_KEY, JSON.stringify(ids))
    if (!selectedCollectionId && ids.length) setSelectedCollectionId(ids[0])
  }, [orderedCollections.length])

  useEffect(() => {
    const loadBooks = async () => {
      if (!selectedCollectionId) return
      try {
        setLoading(true)
        setError('')
        await fetchSavedBooksByCollection(selectedCollectionId)
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || 'Failed to fetch saved books')
      } finally {
        setLoading(false)
      }
    }
    loadBooks()
  }, [selectedCollectionId, fetchSavedBooksByCollection])

  const savedBooks = useMemo(
    () => savedBooksByCollection[selectedCollectionId] || [],
    [savedBooksByCollection, selectedCollectionId],
  )

  const progressMap = useMemo(() => buildProgressMap(progressItems), [progressItems])

  const visibleSavedBooks = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = savedBooks.filter((item) => {
      if (!q) return true
      const title = (item.book?.title || '').toLowerCase()
      const author = (item.book?.author || '').toLowerCase()
      return title.includes(q) || author.includes(q)
    })
    if (sortBy === 'title') {
      list = [...list].sort((a, b) => (a.book?.title || '').localeCompare(b.book?.title || ''))
    } else if (sortBy === 'author') {
      list = [...list].sort((a, b) => (a.book?.author || '').localeCompare(b.book?.author || ''))
    } else {
      list = [...list].sort((a, b) => new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime())
    }
    return list
  }, [savedBooks, search, sortBy])

  const createNewCollection = async () => {
    try {
      const name = nameInput.trim()
      if (!name) return
      await createCollection(name)
      setNameInput('')
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create collection')
    }
  }

  const renameCollection = async (id) => {
    try {
      const name = editingName.trim()
      if (!name) return
      await apiClient.put(`/api/collections/${id}`, { name })
      setEditingId('')
      setEditingName('')
      await refresh()
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to rename collection')
    }
  }

  const deleteCollection = async (id) => {
    try {
      await apiClient.delete(`/api/collections/${id}`)
      await refresh()
      if (selectedCollectionId === id) setSelectedCollectionId('')
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to delete collection')
    }
  }

  const onDropCollection = (targetId) => {
    if (!draggingId || draggingId === targetId) return
    const ids = [...collectionOrder]
    const from = ids.indexOf(draggingId)
    const to = ids.indexOf(targetId)
    if (from < 0 || to < 0) return
    const [moved] = ids.splice(from, 1)
    ids.splice(to, 0, moved)
    setCollectionOrder(ids)
    localStorage.setItem(ORDER_KEY, JSON.stringify(ids))
    setDraggingId('')
  }

  const handleRemoveSavedBook = async (savedItem) => {
    const { _id } = savedItem
    setRemovingIds((prev) => [...prev, _id])
    removeTimersRef.current[_id] = setTimeout(() => {
      delete removeTimersRef.current[_id]
    }, 180)

    try {
      await removeSavedBook(_id)
    } catch (err) {
      const timer = removeTimersRef.current[_id]
      if (timer) {
        clearTimeout(timer)
        delete removeTimersRef.current[_id]
      }
      setToast(err?.response?.data?.message || err?.message || 'Failed to remove saved book')
      setTimeout(() => setToast(''), 2200)
    } finally {
      setRemovingIds((prev) => prev.filter((id) => id !== _id))
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-white">Saved Books</h1>
        <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved books..."
            className="h-11 min-w-0 rounded-xl border border-white/15 bg-slate-950/55 px-3 text-sm text-white outline-none transition duration-200 focus:border-blue-300/45 sm:w-72"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-11 rounded-xl border border-white/15 bg-slate-950/55 px-3 text-sm text-white outline-none transition duration-200 focus:border-blue-300/45"
          >
            <option value="recent">Recently Added</option>
            <option value="title">Title A-Z</option>
            <option value="author">Author</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <aside className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-100/80">Collections</h2>
          <div className="mt-3 space-y-2">
            {orderedCollections.map((collection) => {
              const selected = selectedCollectionId === collection._id
              const editing = editingId === collection._id
              return (
                <div
                  key={collection._id}
                  draggable
                  onDragStart={() => setDraggingId(collection._id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDropCollection(collection._id)}
                  className={`group rounded-2xl border p-2 transition duration-200 ${
                    selected
                      ? 'border-blue-300/35 bg-gradient-to-r from-blue-500/18 to-violet-500/20'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                  }`}
                >
                  {!editing ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCollectionId(collection._id)}
                        className="min-w-0 flex-1 rounded-xl px-2 py-2 text-left text-sm text-slate-100"
                      >
                        <p className="truncate font-semibold">{collection.name}</p>
                        <p className="text-xs text-slate-300">{collection.count || 0} items</p>
                      </button>
                      {collection.name !== 'Saved Books' ? (
                        <div className="flex opacity-0 transition group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(collection._id)
                              setEditingName(collection.name)
                            }}
                            className="rounded-lg p-2 text-slate-200 hover:bg-white/10"
                          >
                            <FaPen className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => deleteCollection(collection._id)} className="rounded-lg p-2 text-rose-200 hover:bg-rose-500/15">
                            <FaTrash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1.5 text-xs text-white outline-none"
                      />
                      <button type="button" onClick={() => renameCollection(collection._id)} className="rounded-lg bg-blue-500/80 px-2 py-1 text-xs text-white">
                        Save
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="New Collection"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none"
            />
            <button type="button" onClick={createNewCollection} className="rounded-xl border border-blue-300/35 px-3 py-2 text-sm font-semibold text-blue-100 transition duration-200 hover:bg-blue-500/15">
              Add
            </button>
          </div>
        </aside>

        <main>
          {loading ? <div className="animate-[fadeIn_220ms_ease-out]"><GridSkeleton count={6} /></div> : null}
          {error ? <div className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
          {!loading && !error && visibleSavedBooks.length === 0 ? (
            <EmptyState
              className="min-h-[300px] grid place-items-center"
              icon="📚"
              title="No saved books yet"
              description="Save books you love and build your collection."
            />
          ) : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleSavedBooks.map((savedItem) => {
              const book = savedItem.book || {}
              const progress = progressMap.get(book._id)
              const readerLink = buildReaderHash(book, { page: progress?.currentPage, cfi: progress?.cfi || '' })
              return (
                <article key={savedItem._id} className={`book-card min-h-[245px] sm:min-h-[345px] shadow-md shadow-black/20 rounded-2xl p-3 sm:p-4 flex flex-col justify-between transition-all duration-300 ${removingIds.includes(savedItem._id) ? 'scale-[0.98] opacity-0' : 'scale-100 opacity-100'}`}>
                  <div className="relative flex flex-col h-full justify-between">
                    <Link to={`/book/${book._id}`} className="group/link block cursor-pointer text-left">
                      <div className="mb-2 aspect-[3/4] w-full overflow-hidden rounded-lg bg-slate-950/50 shadow-inner ring-1 ring-white/10 relative block">
                        {book.thumbnail ? (
                          <img loading="lazy" src={getBookThumbnailUrl(book)} onError={applyThumbnailFallback} alt={book.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-blue-500/50 to-violet-600/50 p-2 text-center text-sm font-semibold text-white">
                            {book.title}
                          </div>
                        )}
                      </div>
                      <h3 className="line-clamp-1 text-xs sm:text-sm font-bold text-white leading-tight group-hover/link:text-indigo-400 transition-colors">{book.title}</h3>
                      <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-400 font-medium">{book.author || 'Unknown author'}</p>
                    </Link>

                    <div className="mt-auto pt-1">
                      <div className="mb-1.5 h-1 w-full rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-500" style={{ width: `${progress?.progressPercentage || 0}%` }} />
                      </div>
                      <div className="mb-1.5 flex items-center">
                        <span 
                          className="inline-block text-[9px] font-bold uppercase tracking-wider truncate max-w-full block"
                          style={{ color: getCategoryColor(book.category) }}
                        >
                          {book.category || 'New to shelf'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleRemoveSavedBook(savedItem)} className="flex-1 rounded-xl border border-rose-300/25 bg-rose-500/10 py-2.5 min-h-[44px] text-xs font-bold text-rose-200 transition duration-200 hover:bg-rose-500/20">
                          Remove
                        </button>
                        <a href={readerLink} className="flex-1 text-center rounded-xl border border-white/10 bg-white/5 py-2.5 min-h-[44px] text-xs font-bold text-white transition duration-200 hover:bg-white/15 inline-flex items-center justify-center">
                          Open
                        </a>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </main>
      </div>
      {toast ? (
        <div className="fixed bottom-5 left-1/2 z-[130] -translate-x-1/2 rounded-xl border border-rose-200/30 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-50 shadow-[0_10px_35px_rgba(244,63,94,0.28)] backdrop-blur-lg animate-[fadeIn_180ms_ease-out]">
          {toast}
        </div>
      ) : null}
    </section>
  )
}
