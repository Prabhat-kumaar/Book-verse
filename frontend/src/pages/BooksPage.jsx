import { memo, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useBooks from '../hooks/useBooks'
import useProgress from '../hooks/useProgress'
import SaveBookHeart from '../components/SaveBookHeart'
import EmptyState from '../components/EmptyState'
import { GridSkeleton } from '../components/Skeletons'
import { buildReaderHash } from '../lib/readerLink'
import { buildProgressMap } from '../lib/readingProgress'

function normalize(value) {
  return (value || '').toString().trim().toLowerCase()
}

const BookCard = memo(function BookCard({ book, progress }) {
  const readerLink = buildReaderHash(book, { page: progress?.currentPage, cfi: progress?.cfi || '' })
  const [thumbFailed, setThumbFailed] = useState(false)

  return (
    <article className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] p-3 backdrop-blur-lg">
      <SaveBookHeart bookId={book._id} book={book} />
      <div className="mb-3 h-52 w-full overflow-hidden rounded-xl bg-slate-900 ring-1 ring-white/10">
        {book.thumbnail && !thumbFailed ? (
          <img loading="lazy" src={book.thumbnail} alt={book.title} onError={() => setThumbFailed(true)} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-blue-500/50 to-violet-600/50 p-3 text-center text-sm font-semibold text-white">
            {book.title}
          </div>
        )}
      </div>
      <h3 className="line-clamp-1 text-sm font-semibold text-white">{book.title}</h3>
      <p className="line-clamp-1 text-xs text-slate-300">{book.author || 'Unknown author'}</p>
      <p className="mt-1 line-clamp-1 text-xs text-blue-100/85">{book.category || 'Uncategorized'}</p>
      <a
        href={readerLink}
        className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/15"
      >
        Open Reader
      </a>
    </article>
  )
})

export default function BooksPage() {
  const navigate = useNavigate()
  const { books, loading, error } = useBooks()
  const authUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('authUser')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [])
  const { progressItems } = useProgress(authUser?._id)
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const progressMap = useMemo(() => buildProgressMap(progressItems), [progressItems])

  const filteredBooks = useMemo(() => {
    const q = normalize(query)
    if (!q) return books

    return books.filter((book) => {
      const title = normalize(book.title)
      const author = normalize(book.author)
      const category = normalize(book.category)
      return title.includes(q) || author.includes(q) || category.includes(q)
    })
  }, [books, query])

  return (
    <section id="books-section" className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 sm:p-7">
      <h1 className="text-2xl font-bold text-white sm:text-3xl">Explore Books</h1>
      <p className="mt-1 text-sm text-slate-300">Search by title, author, or category.</p>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
        Showing {filteredBooks.length} of {books.length} books{query ? ` for "${query}"` : ''}
      </div>

      {loading ? (
        <div className="mt-5 animate-[fadeIn_220ms_ease-out]">
          <GridSkeleton count={8} />
        </div>
      ) : error ? (
        <div className="mt-5 rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>
      ) : filteredBooks.length === 0 ? (
        <EmptyState
          className="mt-5"
          icon="🔍"
          title="No books found"
          description="Try searching with different keywords."
          actionLabel="Browse Categories"
          onAction={() => navigate('/categories')}
        />
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {filteredBooks.map((book) => (
            <BookCard key={book._id || `${book.title}-${book.author}`} book={book} progress={progressMap.get(book._id)} />
          ))}
        </div>
      )}
    </section>
  )
}
