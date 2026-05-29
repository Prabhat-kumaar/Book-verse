import { useEffect, useState } from 'react'
import apiClient from '../lib/apiClient'
import { API_URL, buildApiUrl } from '../lib/apiConfig'
import { getBookThumbnailUrl, normalizeMediaUrl } from '../lib/mediaUrls'

const isDev = import.meta.env.DEV

export default function useBooks() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    const fetchBooks = async () => {
      try {
        setLoading(true)
        setError('')
        if (isDev) {
          const requestUrl = buildApiUrl('/api/books')
          console.info('[useBooks] API URL:', API_URL)
          console.info('[useBooks] Final request:', requestUrl)
        }

        const response = await apiClient.get('/api/books', { signal: controller.signal })
        const payload = response?.data
        const resolvedBooks = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.books)
            ? payload.books
            : Array.isArray(payload?.data)
              ? payload.data
              : []
        const normalizedBooks = resolvedBooks.map((book) => ({
          ...book,
          fileUrl: normalizeMediaUrl(book?.fileUrl || ''),
          pdf: normalizeMediaUrl(book?.pdf || ''),
          thumbnail: getBookThumbnailUrl(book),
        }))
        setBooks(normalizedBooks)
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError' && fetchError.code !== 'ERR_CANCELED') {
          const status = fetchError?.response?.status
          const message =
            fetchError?.response?.data?.message ||
            (status ? `Failed to fetch books (${status})` : '') ||
            fetchError.message ||
            'Unable to fetch books right now.'
          setError(message)
          if (isDev) console.error('[useBooks] Failed to fetch books:', message)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchBooks()

    return () => controller.abort()
  }, [])

  return { books, loading, error }
}
