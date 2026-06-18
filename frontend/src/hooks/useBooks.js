import { useEffect, useState } from 'react'
import apiClient from '../lib/apiClient'
import { API_URL, buildApiUrl } from '../lib/apiConfig'
import { normalizeMediaUrl } from '../lib/mediaUrls'

const isDev = import.meta.env.DEV
const BOOKS_CACHE_TTL_MS = 15000

const sharedBooksStore = {
  books: [],
  loading: false,
  error: '',
  inFlight: null,
  lastFetchedAt: 0,
}

const listeners = new Set()

function notify() {
  const snapshot = {
    books: sharedBooksStore.books,
    loading: sharedBooksStore.loading,
    error: sharedBooksStore.error,
  }
  listeners.forEach((listener) => listener(snapshot))
}

function setSharedBooksState(next) {
  Object.assign(sharedBooksStore, next)
  notify()
}

function normalizeBooks(payload) {
  const resolvedBooks = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.books)
      ? payload.books
      : Array.isArray(payload?.data)
        ? payload.data
        : []

  return resolvedBooks.map((book) => ({
    ...book,
    fileUrl: normalizeMediaUrl(book?.fileUrl || ''),
    pdf: normalizeMediaUrl(book?.pdf || ''),
    thumbnail: normalizeMediaUrl(book?.thumbnail || ''),
  }))
}

async function refreshSharedBooks({ force = false } = {}) {
  if (!force && sharedBooksStore.inFlight) return sharedBooksStore.inFlight
  if (!force && sharedBooksStore.lastFetchedAt && Date.now() - sharedBooksStore.lastFetchedAt < BOOKS_CACHE_TTL_MS) {
    return sharedBooksStore.books
  }

  setSharedBooksState({ loading: true, error: '' })
  if (isDev) {
    const requestUrl = buildApiUrl('/api/books')
    console.info('[useBooks] API URL:', API_URL)
    console.info('[useBooks] Final request:', requestUrl)
  }

  const request = apiClient.get('/api/books?limit=100')
    .then((response) => {
      const normalizedBooks = normalizeBooks(response?.data)
      setSharedBooksState({
        books: normalizedBooks,
        loading: false,
        error: '',
        inFlight: null,
        lastFetchedAt: Date.now(),
      })
      return normalizedBooks
    })
    .catch((fetchError) => {
      const status = fetchError?.response?.status
      const message =
        fetchError?.response?.data?.message ||
        (status ? `Failed to fetch books (${status})` : '') ||
        fetchError.message ||
        'Unable to fetch books right now.'
      setSharedBooksState({
        loading: false,
        error: message,
        inFlight: null,
      })
      if (isDev) console.error('[useBooks] Failed to fetch books:', message)
      throw fetchError
    })

  sharedBooksStore.inFlight = request
  return request
}

function subscribe(listener) {
  listeners.add(listener)
  listener({
    books: sharedBooksStore.books,
    loading: sharedBooksStore.loading,
    error: sharedBooksStore.error,
  })
  return () => listeners.delete(listener)
}

export default function useBooks() {
  const [state, setState] = useState(() => ({
    books: sharedBooksStore.books,
    loading: sharedBooksStore.loading || !sharedBooksStore.lastFetchedAt,
    error: sharedBooksStore.error,
  }))

  useEffect(() => {
    const unsubscribe = subscribe(setState)
    refreshSharedBooks().catch(() => {})

    return unsubscribe
  }, [])

  return { books: state.books, loading: state.loading, error: state.error }
}
