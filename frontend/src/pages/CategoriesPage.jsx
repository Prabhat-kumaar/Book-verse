import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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

function CategoryBookCard({ book, progress }) {
  const readerLink = buildReaderHash(book, { page: progress?.currentPage, cfi: progress?.cfi || '' })

  return (
    <article className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] p-3 backdrop-blur-lg">
      <SaveBookHeart bookId={book._id} book={book} />
      <div className="mb-3 h-52 w-full overflow-hidden rounded-xl bg-slate-900 ring-1 ring-white/10">
        {book.thumbnail ? (
          <img loading="lazy" src={book.thumbnail} alt={book.title} className="h-full w-full object-cover" />
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
}

export default function CategoriesPage() {
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
  const activeCategory = searchParams.get('category') || ''

  const categories = useMemo(() => {
    const unique = new Set()
    books.forEach((book) => {
      const category = (book.category || '').toString().trim()
      if (category) unique.add(category)
    })
    return Array.from(unique).sort((a, b) => a.localeCompare(b))
  }, [books])

  const filteredBooks = useMemo(() => {
    if (!activeCategory) return []
    const wanted = normalize(activeCategory)
    return books.filter((book) => normalize(book.category) === wanted)
  }, [books, activeCategory])

  const randomBooks = useMemo(() => books.slice(0, 9), [books])
  const progressMap = useMemo(() => buildProgressMap(progressItems), [progressItems])

  const visibleBooks = activeCategory ? filteredBooks : randomBooks

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 sm:p-7">
      <h1 className="text-2xl font-bold text-white sm:text-3xl">Categories</h1>

      {loading ? (
        <div className="mt-5 animate-[fadeIn_220ms_ease-out]">
          <GridSkeleton count={8} />
        </div>
      ) : error ? (
        <div className="mt-5 rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>
      ) : categories.length === 0 ? (
        <EmptyState
          className="mt-5"
          icon="🗂️"
          title="No categories yet"
          description="Book categories will appear here as your library grows."
          actionLabel="Explore Books"
          onAction={() => navigate('/books')}
        />
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => {
            const selected = normalize(activeCategory) === normalize(category)
            return (
              <Link
                key={category}
                to={`/categories?category=${encodeURIComponent(category)}`}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${selected
                  ? 'border-blue-300/55 bg-blue-500/20 text-blue-100'
                  : 'border-white/15 bg-white/[0.04] text-slate-100 hover:bg-white/[0.08]'}`}
              >
                {category}
              </Link>
            )
          })}
        </div>
      )}

      <div className="mt-7">
        <h2 className="text-lg font-semibold text-white">
          {activeCategory ? `Books in ${activeCategory}` : 'Featured Books'}
        </h2>
        {visibleBooks.length === 0 ? (
          <EmptyState
            className="mt-3"
            icon="📘"
            title="No books found"
            description="Try another category or explore all books."
            actionLabel="Explore Books"
            onAction={() => navigate('/books')}
            compact
          />
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleBooks.map((book) => (
              <CategoryBookCard key={book._id || `${book.title}-${book.author}`} book={book} progress={progressMap.get(book._id)} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
