import { memo, useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
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

const categories = ['All', 'Programming', 'AI', 'Business', 'Self-Help', 'Design', 'Productivity']

const BookCard = memo(function BookCard({ book, progress }) {
  const resumePage = Number.isInteger(progress?.currentPage) && progress.currentPage > 0 ? progress.currentPage : undefined
  const readerLink = buildReaderHash(book, { page: resumePage, cfi: progress?.cfi || '' })
  const [thumbFailed, setThumbFailed] = useState(false)

  return (
    <article className="group book-card">
      <SaveBookHeart bookId={book._id} book={book} />
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition duration-500 group-hover:opacity-100 [background:linear-gradient(145deg,rgba(84,132,255,0.08),rgba(146,92,255,0.06))]" />
      <div className="pointer-events-none absolute inset-0 rounded-2xl border border-transparent opacity-0 transition duration-500 group-hover:opacity-100 [background:linear-gradient(135deg,rgba(95,144,255,0.25),rgba(165,111,255,0.2))_border-box] [mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [mask-composite:exclude]" />
      <div className="pointer-events-none absolute -right-12 -top-10 h-32 w-32 rounded-full bg-violet-400/10 blur-3xl opacity-0 transition duration-500 group-hover:opacity-100" />
      
      <div className="relative flex flex-col h-full">
        <div className="mb-4 aspect-[3/4] w-full overflow-hidden rounded-xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 shadow-inner ring-1 ring-white/10 relative">
          {book.thumbnail && !thumbFailed ? (
            <img loading="lazy" src={book.thumbnail} alt={book.title} onError={() => setThumbFailed(true)} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-blue-500/50 to-violet-600/50 p-3 text-center text-sm font-semibold text-white">
              {book.title}
            </div>
          )}
        </div>
        
        <h4 className="line-clamp-1 text-sm font-semibold text-white leading-tight group-hover:text-indigo-200 transition-colors">{book.title}</h4>
        <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{book.author || 'Unknown Author'}</p>
        <p className="mt-1.5 inline-block text-[10px] font-medium tracking-wide uppercase text-indigo-400">{book.category || 'Uncategorized'}</p>

        <div className="flex-grow"></div>

        {progress?.percent > 0 && (
          <div className="mt-3">
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-500" style={{ width: `${progress.percent}%` }} />
            </div>
            <p className="mt-1 text-[10px] text-slate-400">{progress.percent}% completed</p>
          </div>
        )}

        <a
          href={readerLink}
          className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-blue-300/40 hover:bg-white/15"
        >
          {progress?.percent > 0 ? 'Resume Reading' : 'Open Reader'}
        </a>
      </div>
    </article>
  )
})

export default function BooksPage() {
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

  const [searchTerm, setSearchTerm] = useState(query)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState('Newest')

  // Sync with URL query parameter
  useEffect(() => {
    setSearchTerm(query)
  }, [query])

  const filteredBooks = useMemo(() => {
    let result = [...books]

    // 1. Filter by search term
    const q = normalize(searchTerm)
    if (q) {
      result = result.filter((book) => {
        const title = normalize(book.title)
        const author = normalize(book.author)
        const category = normalize(book.category)
        return title.includes(q) || author.includes(q) || category.includes(q)
      })
    }

    // 2. Filter by category
    if (selectedCategory !== 'All') {
      result = result.filter(
        (book) => normalize(book.category) === normalize(selectedCategory)
      )
    }

    // 3. Sort
    result.sort((a, b) => {
      if (sortBy === 'Newest') {
        const dateA = new Date(a.createdAt || 0).getTime()
        const dateB = new Date(b.createdAt || 0).getTime()
        return dateB - dateA
      }
      if (sortBy === 'Most Read') {
        return (b.openCount || 0) - (a.openCount || 0)
      }
      if (sortBy === 'A-Z') {
        return (a.title || '').localeCompare(b.title || '')
      }
      return 0
    })

    return result
  }, [books, searchTerm, selectedCategory, sortBy])

  return (
    <section id="books-section" className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 sm:p-7">
      <h1 className="text-2xl font-bold text-white sm:text-3xl">Explore Books</h1>
      <p className="mt-1 text-sm text-slate-300">Search, filter, and discover your next read.</p>

      {/* Premium Search and Filtering Controls */}
      <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/40 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search books, authors, or categories..."
              className="w-full rounded-xl border border-white/15 bg-slate-950/60 py-3 pl-10 pr-4 text-sm text-white outline-none transition duration-300 placeholder:text-slate-400 focus:border-indigo-400/50 focus:bg-slate-900/80 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.2)]"
            />
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <label className="shrink-0 text-xs font-semibold uppercase tracking-wider text-slate-400">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-400/50 focus:bg-slate-900/80"
            >
              <option value="Newest">📅 Newest</option>
              <option value="Most Read">🔥 Most Read</option>
              <option value="A-Z">🔤 A-Z</option>
            </select>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">Filter by Category</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const active = selectedCategory === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-300 ${
                    active
                      ? 'bg-gradient-to-r from-blue-500 to-violet-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-105'
                      : 'border border-white/10 bg-white/[0.04] text-slate-300 hover:border-indigo-400/30 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
        Showing {filteredBooks.length} of {books.length} books{searchTerm ? ` for "${searchTerm}"` : ''}
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
          description="Try adjusting your keywords or category filters."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchTerm('');
            setSelectedCategory('All');
            setSortBy('Newest');
          }}
        />
      ) : (
        <div className="book-grid">
          {filteredBooks.map((book) => (
            <BookCard key={book._id || `${book.title}-${book.author}`} book={book} progress={progressMap.get(book._id)} />
          ))}
        </div>
      )}
    </section>
  )
}
