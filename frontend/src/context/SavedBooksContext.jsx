import { createContext, useContext } from 'react'
import useSavedBooks from '../hooks/useSavedBooks'

const SavedBooksContext = createContext(null)

export function SavedBooksProvider({ children }) {
  const savedBooks = useSavedBooks()
  return <SavedBooksContext.Provider value={savedBooks}>{children}</SavedBooksContext.Provider>
}

export function useSavedBooksContext() {
  const ctx = useContext(SavedBooksContext)
  if (!ctx) {
    throw new Error('useSavedBooksContext must be used within SavedBooksProvider')
  }
  return ctx
}
