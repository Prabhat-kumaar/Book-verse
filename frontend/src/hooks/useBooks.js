import { useEffect, useState } from 'react'

const API_BASE_URL = 'http://127.0.0.1:5000'

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
        setBooks(Array.isArray(payload) ? payload : [])
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
