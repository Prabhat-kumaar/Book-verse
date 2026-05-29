import { useEffect, useState, useMemo } from 'react'
import useBooks from './useBooks'
import apiClient from '../lib/apiClient'

const isDev = import.meta.env.DEV

export default function useRecommendations() {
  const { books, loading: booksLoading, error: booksError } = useBooks()
  const [recommendedBooks, setRecommendedBooks] = useState([])
  const [recLoading, setRecLoading] = useState(true)
  const [recError, setRecError] = useState('')

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setRecLoading(true)
        const response = await apiClient.get('/api/books/recommendations')
        if (response.data?.success) {
          setRecommendedBooks(response.data.data)
        } else {
          setRecommendedBooks(Array.isArray(response.data) ? response.data : [])
        }
      } catch (err) {
        if (isDev) console.error('Error fetching recommendations:', err)
        setRecError(err.message || 'Failed to fetch recommendations')
      } finally {
        setRecLoading(false)
      }
    }

    fetchRecommendations()
  }, [])

  const topBooks = useMemo(() => {
    return [...books].sort((a, b) => (b.openCount || 0) - (a.openCount || 0)).slice(0, 10)
  }, [books])

  return {
    books,
    recommendedBooks: recommendedBooks.length > 0 ? recommendedBooks : books.slice(0, 8),
    topBooks,
    loading: booksLoading || recLoading,
    error: booksError || recError,
  }
}
