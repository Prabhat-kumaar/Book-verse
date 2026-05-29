import { useCallback, useEffect, useRef, useState } from 'react'
import apiClient from '../lib/apiClient'
import { API_URL, buildApiUrl } from '../lib/apiConfig'

const SAVED_CACHE_KEY = 'savedBooksState:v1'
const isDev = import.meta.env.DEV

function readSavedCache() {
  try {
    const raw = localStorage.getItem(SAVED_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

function writeSavedCache(value) {
  try {
    localStorage.setItem(SAVED_CACHE_KEY, JSON.stringify(value))
  } catch {
    // no-op
  }
}

function readAuthUserId() {
  try {
    const raw = localStorage.getItem('authUser')
    const parsed = raw ? JSON.parse(raw) : null
    return parsed?._id || ''
  } catch {
    return ''
  }
}

function readAuthToken() {
  return Boolean(localStorage.getItem('authToken'))
}

function normalizeId(value) {
  if (value == null) return ''
  if (typeof value === 'object') return String(value._id || value.id || value.toString() || '')
  return String(value)
}

export default function useSavedBooks() {
  const [isAuthed, setIsAuthed] = useState(readAuthToken)

  const cacheUserId = readAuthUserId()
  const initialCache = readSavedCache()
  const scopedCache = initialCache?.userId === cacheUserId ? initialCache : null

  const [collections, setCollections] = useState(() => (Array.isArray(scopedCache?.collections) ? scopedCache.collections : []))
  const [savedStatus, setSavedStatus] = useState(() => (Array.isArray(scopedCache?.savedStatus) ? scopedCache.savedStatus : []))
  const [savedBooksByCollection, setSavedBooksByCollection] = useState(() => (scopedCache?.savedBooksByCollection && typeof scopedCache.savedBooksByCollection === 'object' ? scopedCache.savedBooksByCollection : {}))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hydrated, setHydrated] = useState(false)

  const hasInitialized = useRef(false)

  // Monitor auth state changes
  useEffect(() => {
    const onStorageChange = () => setIsAuthed(readAuthToken())
    const onAuthChanged = () => setIsAuthed(readAuthToken())
    window.addEventListener('storage', onStorageChange)
    window.addEventListener('authChanged', onAuthChanged)
    return () => {
      window.removeEventListener('storage', onStorageChange)
      window.removeEventListener('authChanged', onAuthChanged)
    }
  }, [])

  // Persist cache whenever state changes
  useEffect(() => {
    writeSavedCache({
      userId: readAuthUserId(),
      collections,
      savedStatus,
      savedBooksByCollection,
      updatedAt: Date.now(),
    })
  }, [collections, savedBooksByCollection, savedStatus])

  const refreshFn = useCallback(async () => {
    const currentAuth = readAuthToken()
    if (!currentAuth) {
      setCollections([])
      setSavedStatus([])
      setSavedBooksByCollection({})
      setLoading(false)
      setError('')
      setHydrated(true)
      return
    }

    try {
      setLoading(true)
      setError('')
      if (isDev) {
        console.info('[useSavedBooks] API_URL:', API_URL)
        console.info('[useSavedBooks] Request URL:', buildApiUrl('/api/collections'))
        console.info('[useSavedBooks] Request URL:', buildApiUrl('/api/saved-books/status'))
      }
      const [collectionsRes, statusRes] = await Promise.all([
        apiClient.get('/api/collections'),
        apiClient.get('/api/saved-books/status'),
      ])
      setCollections(Array.isArray(collectionsRes.data) ? collectionsRes.data : [])
      setSavedStatus(Array.isArray(statusRes.data) ? statusRes.data : [])
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Failed to load saved books'
      setError(message)
      if (isDev) console.error('[useSavedBooks] Failed to load saved books:', message)
    } finally {
      setLoading(false)
      setHydrated(true)
    }
  }, [])

  const refresh = refreshFn

  // ── KEY FIX: Always fetch from server on mount/auth change ──────────────
  useEffect(() => {
    if (readAuthToken()) {
      // Always refresh from server — never rely on cache for savedStatus
      // This ensures red heart shows correctly after every page refresh
      refreshFn()
      hasInitialized.current = true
    } else {
      setCollections([])
      setSavedStatus([])
      setSavedBooksByCollection({})
      setHydrated(true)
      hasInitialized.current = false
    }
  }, [isAuthed])

  const createCollection = useCallback(async (name) => {
    try {
      const res = await apiClient.post('/api/collections', { name })
      await refreshFn()
      return res.data
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Failed to create collection'
      setError(message)
      throw error
    }
  }, [refreshFn])

  const fetchSavedBooksByCollection = useCallback(async (collectionId) => {
    if (!collectionId) return []
    try {
      const res = await apiClient.get(`/api/saved-books/${collectionId}`)
      const list = Array.isArray(res.data) ? res.data : []
      setSavedBooksByCollection((prev) => ({ ...prev, [collectionId]: list }))
      return list
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Failed to load saved books for this collection'
      setError(message)
      throw error
    }
  }, [])

  const saveBook = useCallback(async (bookId, collectionId, optimisticBook = null) => {
    const alreadyExists = savedStatus.some((item) => {
      const itemBookId = normalizeId(item.book)
      const itemCollectionId = normalizeId(item.collection)
      return itemBookId === normalizeId(bookId) && itemCollectionId === normalizeId(collectionId)
    })
    if (alreadyExists) return null

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const optimisticSaved = {
      _id: tempId,
      book: optimisticBook?._id || bookId,
      collection: collectionId,
      savedAt: new Date().toISOString(),
      __optimistic: true,
    }

    setSavedStatus((prev) => [...prev, optimisticSaved])
    setCollections((prev) =>
      prev.map((collection) =>
        collection._id === collectionId
          ? { ...collection, count: (collection.count || 0) + 1 }
          : collection,
      ),
    )

    if (optimisticBook) {
      setSavedBooksByCollection((prev) => {
        const current = Array.isArray(prev[collectionId]) ? prev[collectionId] : null
        if (!current) return prev
        return {
          ...prev,
          [collectionId]: [{ ...optimisticSaved, book: optimisticBook }, ...current],
        }
      })
    }

    try {
      const res = await apiClient.post('/api/saved-books', { bookId, collectionId })
      const saved = res.data
      if (!saved?._id) return saved

      // Replace optimistic entry with real server response
      setSavedStatus((prev) =>
        prev.map((item) => (item._id === tempId ? saved : item)),
      )
      setSavedBooksByCollection((prev) => {
        const current = prev[collectionId]
        if (!Array.isArray(current)) return prev
        return {
          ...prev,
          [collectionId]: current.map((item) => (item._id === tempId ? saved : item)),
        }
      })
      return saved
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Failed to save book'
      setError(message)
      // Rollback optimistic update
      setSavedStatus((prev) => prev.filter((item) => item._id !== tempId))
      setCollections((prev) =>
        prev.map((collection) =>
          collection._id === collectionId
            ? { ...collection, count: Math.max(0, (collection.count || 0) - 1) }
            : collection,
        ),
      )
      setSavedBooksByCollection((prev) => {
        const current = prev[collectionId]
        if (!Array.isArray(current)) return prev
        return {
          ...prev,
          [collectionId]: current.filter((item) => item._id !== tempId),
        }
      })
      throw error
    }
  }, [savedStatus])

  const removeSavedBook = useCallback(async (savedId) => {
    const target = savedStatus.find((item) => item._id === savedId)
    const collectionId = target?.collection?._id || target?.collection
    const previousByCollection = {}

    if (collectionId) {
      setSavedBooksByCollection((prev) => {
        const next = { ...prev }
        for (const [key, list] of Object.entries(prev)) {
          if (!Array.isArray(list)) continue
          previousByCollection[key] = list
          next[key] = list.filter((item) => item._id !== savedId)
        }
        return next
      })
    }

    setSavedStatus((prev) => prev.filter((item) => item._id !== savedId))
    if (collectionId) {
      setCollections((prev) =>
        prev.map((collection) =>
          collection._id === collectionId
            ? { ...collection, count: Math.max(0, (collection.count || 0) - 1) }
            : collection,
        ),
      )
    }

    try {
      await apiClient.delete(`/api/saved-books/${savedId}`)
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Failed to remove saved book'
      setError(message)
      // Rollback
      if (target) {
        setSavedStatus((prev) => [...prev, target])
      }
      if (collectionId) {
        setCollections((prev) =>
          prev.map((collection) =>
            collection._id === collectionId
              ? { ...collection, count: (collection.count || 0) + 1 }
              : collection,
          ),
        )
        setSavedBooksByCollection((prev) => ({ ...prev, ...previousByCollection }))
      }
      throw error
    }
  }, [savedStatus])

  return {
    collections,
    createCollection,
    error,
    hydrated,
    isAuthed,
    loading,
    refresh,
    fetchSavedBooksByCollection,
    removeSavedBook,
    saveBook,
    savedBooksByCollection,
    savedStatus,
  }
}
