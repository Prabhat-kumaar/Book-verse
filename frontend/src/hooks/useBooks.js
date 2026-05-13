import { useEffect, useState } from 'react'
import { getBookThumbnailUrl, normalizeMediaUrl } from '../lib/mediaUrls'

const API_BASE_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '')

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

        const response = await fetch(`${API_BASE_URL}/api/books`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch books (${response.status})`)
        }

        const payload = await response.json()
        const resolvedBooks = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []
        const normalizedBooks = resolvedBooks.map((book) => ({
          ...book,
          fileUrl: normalizeMediaUrl(book?.fileUrl || ''),
          pdf: normalizeMediaUrl(book?.pdf || ''),
          thumbnail: getBookThumbnailUrl(book),
        }))
        setBooks(normalizedBooks)
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError') {
          setError(fetchError.message || 'Unable to fetch books right now.')
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
