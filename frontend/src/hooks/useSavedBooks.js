import { useCallback, useEffect, useState } from 'react'
import apiClient from '../lib/apiClient'

const SAVED_CACHE_KEY = 'savedBooksState:v1'

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

export default function useSavedBooks() {
  const cacheUserId = readAuthUserId()
  const initialCache = readSavedCache()
  const scopedCache = initialCache?.userId === cacheUserId ? initialCache : null
  const [collections, setCollections] = useState(() => (Array.isArray(scopedCache?.collections) ? scopedCache.collections : []))
  const [savedStatus, setSavedStatus] = useState(() => (Array.isArray(scopedCache?.savedStatus) ? scopedCache.savedStatus : []))
  const [savedBooksByCollection, setSavedBooksByCollection] = useState(() => (scopedCache?.savedBooksByCollection && typeof scopedCache.savedBooksByCollection === 'object' ? scopedCache.savedBooksByCollection : {}))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [, setAuthVersion] = useState(0)
  const isAuthed = Boolean(localStorage.getItem('authToken'))

  useEffect(() => {
    const onAuthChanged = () => setAuthVersion((prev) => prev + 1)
    window.addEventListener('authChanged', onAuthChanged)
    window.addEventListener('storage', onAuthChanged)
    return () => {
      window.removeEventListener('authChanged', onAuthChanged)
      window.removeEventListener('storage', onAuthChanged)
    }
  }, [])

  useEffect(() => {
    writeSavedCache({
      userId: readAuthUserId(),
      collections,
      savedStatus,
      savedBooksByCollection,
      updatedAt: Date.now(),
    })
  }, [collections, savedBooksByCollection, savedStatus])

  const refresh = useCallback(async () => {
    if (!isAuthed) {
      setCollections([])
      setSavedStatus([])
      setSavedBooksByCollection({})
      setLoading(false)
      setError('')
      return
    }
    try {
      setLoading(true)
      setError('')
      const [collectionsRes, statusRes] = await Promise.all([
        apiClient.get('/api/collections'),
        apiClient.get('/api/saved-books/status'),
      ])
      setCollections(Array.isArray(collectionsRes.data) ? collectionsRes.data : [])
      setSavedStatus(Array.isArray(statusRes.data) ? statusRes.data : [])
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load saved books')
    } finally {
      setLoading(false)
    }
  }, [isAuthed])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createCollection = useCallback(async (name) => {
    const res = await apiClient.post('/api/collections', { name })
    await refresh()
    return res.data
  }, [refresh])

  const fetchSavedBooksByCollection = useCallback(async (collectionId) => {
    if (!collectionId) return []
    const res = await apiClient.get(`/api/saved-books/${collectionId}`)
    const list = Array.isArray(res.data) ? res.data : []
    setSavedBooksByCollection((prev) => ({ ...prev, [collectionId]: list }))
    return list
  }, [])

  const saveBook = useCallback(async (bookId, collectionId, optimisticBook = null) => {
    const alreadyExists = savedStatus.some((item) => {
      const itemBookId = item.book?._id || item.book
      const itemCollectionId = item.collection?._id || item.collection
      return itemBookId === bookId && itemCollectionId === collectionId
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
