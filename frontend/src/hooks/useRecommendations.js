import { useMemo } from 'react'
import useBooks from './useBooks'

export default function useRecommendations() {
  const { books, loading, error } = useBooks()

  const recommendedBooks = useMemo(() => books.slice(0, 12), [books])
  const topBooks = useMemo(() => books.slice(0, 10), [books])

  return {
    books,
    recommendedBooks,
    topBooks,
    loading,
    error,
  }
}

