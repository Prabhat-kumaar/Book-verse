import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FaCheck, FaHeart, FaRegHeart, FaTimes } from 'react-icons/fa'
import { useSavedBooksContext } from '../context/SavedBooksContext'

const normalizeId = (value) => {
  if (value == null) return ''
  if (typeof value === 'object') return String(value._id || value.id || value.toString() || '')
  return String(value)
}

export default function SaveBookHeart({ bookId, book = null, className = '' }) {
  const { collections, createCollection, saveBook, savedStatus, removeSavedBook, isAuthed, hydrated } = useSavedBooksContext()
  const renderCountRef = useRef(0)
  renderCountRef.current += 1

  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')
  const [pop, setPop] = useState(false)
  const [selectedCollectionIds, setSelectedCollectionIds] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')

  const bookIdNormalized = normalizeId(bookId)
  const savedBookIds = Array.isArray(savedStatus)
    ? savedStatus.map((entry) => normalizeId(entry.book))
    : []

  const isSaved = Boolean(bookIdNormalized && savedBookIds.includes(bookIdNormalized))
  const matches = Array.isArray(savedStatus)
    ? savedStatus.filter((entry) => normalizeId(entry.book) === bookIdNormalized)
    : []
  const currentCollectionIds = matches.map((entry) => normalizeId(entry.collection))

  useEffect(() => {
    console.log('[SaveBookHeart] render', {
      renderCount: renderCountRef.current,
      hydrated,
      savedStatusLength: Array.isArray(savedStatus) ? savedStatus.length : 0,
      savedStatus: Array.isArray(savedStatus) ? savedStatus.slice(0, 10) : savedStatus,
      bookId: bookIdNormalized,
      isSaved,
    })
  }, [hydrated, savedStatus, bookIdNormalized, isSaved])

  if (!isAuthed) return null
  if (!hydrated) {
    return (
      <div
        className={`absolute right-3 top-3 z-40 grid h-9 w-24 place-items-center rounded-full border border-white/20 bg-slate-950/75 text-white shadow-[0_8px_26px_rgba(0,0,0,0.45)] transition duration-200 ${className}`}
      >
        loading...
      </div>
    )
  }

  useEffect(() => {
    if (!mounted) return undefined
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [mounted])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(''), 2200)
    return () => clearTimeout(timer)
  }, [toast])

  const onHeartClick = () => {
    if (!isAuthed) return
    setMounted(true)
    requestAnimationFrame(() => setOpen(true))
    setSelectedCollectionIds(currentCollectionIds)
    setError('')
    setCreating(false)
    setNewName('')
  }

  const closeSheet = () => {
    setOpen(false)
    setTimeout(() => setMounted(false), 350)
  }

  const onCreate = async () => {
    try {
      const name = newName.trim()
      if (!name) return setError('Collection name is required')
      if (collections.some((c) => c.name.toLowerCase() === name.toLowerCase())) return setError('Collection already exists')
      const created = await createCollection(name)
      if (created?._id) {
        setSelectedCollectionIds((prev) => (prev.includes(created._id) ? prev : [...prev, created._id]))
      }
      setCreating(false)
      setNewName('')
      setError('')
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not create collection')
    }
  }

  const toggleCollection = (collectionId) => {
    setSelectedCollectionIds((prev) =>
      prev.includes(collectionId) ? prev.filter((id) => id !== collectionId) : [...prev, collectionId],
    )
  }

  const onDone = async () => {
    try {
      setSubmitting(true)
      setError('')
      const toAdd = selectedCollectionIds.filter((id) => !currentCollectionIds.includes(id))
      const toRemove = matches.filter((entry) => !selectedCollectionIds.includes(entry.collection?._id || entry.collection))

      await Promise.all([
        ...toAdd.map((collectionId) => saveBook(bookId, collectionId, book)),
        ...toRemove.map((entry) => removeSavedBook(entry._id)),
      ])

      if (toAdd.length > 0) {
        const first = collections.find((c) => c._id === toAdd[0])?.name || 'collection'
        setToast(`Saved to ${first} \u2713`)
      } else if (selectedCollectionIds.length === 0 && currentCollectionIds.length > 0) {
        setToast('Removed from saved \u2713')
      }
      setPop(true)
      setTimeout(() => setPop(false), 260)
      closeSheet()
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to update saved collections')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isAuthed) return null

  return (
    <>
      <button
        type="button"
        onClick={onHeartClick}
        className={`absolute right-3 top-3 z-40 grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-slate-950/75 text-white shadow-[0_8px_26px_rgba(0,0,0,0.45)] transition duration-200 hover:scale-110 hover:border-violet-300/45 hover:bg-slate-900/90 ${pop ? 'animate-[heartPop_260ms_ease-out]' : ''
          } ${className}`}
      >
        {isSaved ? <FaHeart className="text-red-500" /> : <FaRegHeart className="text-slate-100" />}
      </button>

      {mounted ? createPortal(
        <div
          className={`fixed inset-0 z-[120] transition-all duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${open ? 'bg-slate-950/70 backdrop-blur-sm opacity-100' : 'bg-slate-950/0 opacity-0'
            }`}
          onClick={closeSheet}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute inset-x-0 bottom-0 rounded-t-3xl border border-white/20 bg-slate-900/90 shadow-[0_-18px_50px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition-all duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] sm:inset-auto sm:bottom-4 sm:left-1/2 sm:w-[460px] sm:-translate-x-1/2 sm:rounded-3xl ${open ? 'translate-y-0' : 'translate-y-full'
              }`}
            style={{ transformOrigin: 'bottom center' }}
          >
            <div className="flex h-[80vh] flex-col overflow-hidden sm:h-[72vh]">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <h3 className="text-lg font-semibold text-white">Save to Collection</h3>
                <button type="button" onClick={closeSheet} className="grid h-8 w-8 place-items-center rounded-full border border-white/15 text-slate-200 transition hover:bg-white/10">
                  <FaTimes />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 [scrollbar-color:rgba(148,163,184,0.45)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400/40 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
                <div className="space-y-3">
                  {collections.map((collection) => {
                    const selected = selectedCollectionIds.includes(collection._id)
                    return (
                      <label
                        key={collection._id}
                        className={`flex cursor-pointer items-center justify-between rounded-2xl border px-3 py-3 transition duration-200 ${selected
                          ? 'border-blue-300/40 bg-gradient-to-r from-blue-500/15 to-violet-500/15 shadow-[inset_3px_0_0_0_rgba(99,102,241,0.95)]'
                          : 'border-white/15 bg-white/[0.04] hover:border-blue-300/30 hover:bg-white/[0.08]'
                          }`}
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">{collection.name}</p>
                          <p className="text-xs text-slate-300">{collection.count || 0} items</p>
                        </div>
                        <span className={`grid h-6 w-6 place-items-center rounded-md border transition ${selected ? 'border-blue-400 bg-blue-500 text-white' : 'border-white/30 bg-slate-800 text-transparent'}`}>
                          <FaCheck className={`text-xs transition ${selected ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`} />
                        </span>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleCollection(collection._id)}
                          className="sr-only"
                        />
                      </label>
                    )
                  })}
                </div>

                {!creating ? (
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="mt-4 w-full rounded-xl border border-dashed border-blue-300/45 px-3 py-2 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/10"
                  >
                    + New Collection
                  </button>
                ) : (
                  <div className="mt-4 flex gap-2">
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onCreate()
                      }}
                      placeholder="Collection name"
                      className="min-w-0 flex-1 rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-blue-300/50"
                    />
                    <button type="button" onClick={onCreate} className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white">
                      Create
                    </button>
                  </div>
                )}
                {error ? <p className="mt-3 text-xs text-rose-200">{error}</p> : null}
              </div>

              <div className="border-t border-white/10 p-4">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={onDone}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600 px-3 py-2.5 text-sm font-semibold text-white transition duration-200 hover:brightness-110 disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : 'Done'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}

      {toast ? (
        <div className="fixed bottom-5 left-1/2 z-[130] -translate-x-1/2 rounded-xl border border-emerald-200/30 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-50 shadow-[0_10px_35px_rgba(16,185,129,0.28)] backdrop-blur-lg animate-[fadeIn_180ms_ease-out]">
          {toast}
        </div>
      ) : null}
    </>
  )
}
