import { memo, useMemo, useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import useBooks from '../hooks/useBooks'
import useProgress from '../hooks/useProgress'
import SaveBookHeart from '../components/SaveBookHeart'
import EmptyState from '../components/EmptyState'
import { GridSkeleton } from '../components/Skeletons'
import { buildProgressMap } from '../lib/readingProgress'
import { getBookThumbnailUrl } from '../lib/mediaUrls'
import SEO from '../components/SEO'
import OptimizedImage from '../components/OptimizedImage'

function normalize(value) {
  return (value || '').toString().trim().toLowerCase()
}

const categories = ['All', 'Programming', 'AI', 'Business', 'Self-Help', 'Design', 'Productivity']

const categoryEmojis = {
  all: '🌐',
  programming: '💻',
  ai: '🤖',
  'artificial intelligence': '🤖',
  business: '💼',
  'self-help': '🌱',
  selfhelp: '🌱',
  design: '🎨',
  productivity: '⚡',
  fiction: '📚',
  technology: '⚙️',
  science: '🔬',
  history: '📜',
  biography: '👤',
  mystery: '🕵️',
  fantasy: '🧙',
  thriller: '🗡️',
  romance: '💖'
}

function getCategoryEmoji(cat) {
  const normalized = normalize(cat)
  return categoryEmojis[normalized] || '📘'
}

function getCategoryColor(category) {
  const cat = (category || '').toString().trim().toLowerCase()
  if (cat.includes('business') || cat.includes('finance')) return '#10b981' // green
  if (cat.includes('programming') || cat.includes('code') || cat.includes('software')) return '#3b82f6' // blue
  if (cat.includes('self-help') || cat.includes('selfhelp') || cat.includes('psychology')) return '#a855f7' // purple
  if (cat.includes('productivity') || cat.includes('time')) return '#f97316' // orange
  if (cat.includes('startup') || cat.includes('entrepreneur')) return '#06b6d4' // cyan
  if (cat.includes('design') || cat.includes('ui') || cat.includes('ux') || cat.includes('art')) return '#ec4899' // pink
  if (cat.includes('ai') || cat.includes('artificial') || cat.includes('machine')) return '#6366f1' // indigo
  if (cat.includes('lifestyle') || cat.includes('health') || cat.includes('fitness')) return '#eab308' // yellow
  return '#6b7280' // default gray
}

const BookCard = memo(function BookCard({ book, progress }) {
  const readerLink = book.slug ? `/read/${book.slug}` : `/book/${book._id}`
  const [thumbFailed, setThumbFailed] = useState(false)

  return (
    <article className="book-card min-h-[245px] sm:min-h-[345px] shadow-md shadow-black/20 rounded-2xl p-3 sm:p-4 flex flex-col justify-between transition-all duration-300">
      <SaveBookHeart bookId={book._id} book={book} />
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition duration-500 group-hover:opacity-100 [background:linear-gradient(145deg,rgba(84,132,255,0.1),rgba(146,92,255,0.08))]" />
      <div className="pointer-events-none absolute inset-0 rounded-2xl border border-transparent opacity-0 transition duration-500 group-hover:opacity-100 [background:linear-gradient(135deg,rgba(95,144,255,0.35),rgba(165,111,255,0.25))_border-box] [mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [mask-composite:exclude]" />
      
      <div className="relative flex flex-col h-full justify-between">
        <Link to={`/book/${book._id}`} className="group/link block cursor-pointer text-left">
          <div className="mb-2 aspect-[3/4] w-full overflow-hidden rounded-lg bg-slate-950/50 shadow-inner ring-1 ring-white/10 relative block">
            {book.thumbnail && !thumbFailed ? (
              <OptimizedImage
                src={getBookThumbnailUrl(book)}
                onError={() => setThumbFailed(true)}
                alt={book.title}
                loading="lazy"
                fetchPriority="low"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="grid h-full w-full place-items-center bg-gradient-to-br from-blue-500/50 to-violet-600/50 p-2 text-center text-sm font-semibold text-white">
                {book.title}
              </div>
            )}
          </div>
          
          <h4 className="line-clamp-1 text-xs sm:text-sm font-bold text-white leading-tight group-hover/link:text-indigo-400 transition-colors">{book.title}</h4>
          <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-400 font-medium">{book.author || 'Unknown Author'}</p>
          {book.totalReviews > 0 && (
            <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-400 font-semibold select-none">
              <span>★</span>
              <span>{Number(book.averageRating || 0).toFixed(1)}</span>
              <span className="text-slate-500 font-normal">({book.totalReviews})</span>
            </div>
          )}
        </Link>

        <div className="mt-auto pt-1">
          {progress?.percent > 0 ? (
            <div className="mb-1.5">
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-500" style={{ width: `${progress.percent}%` }} />
              </div>
              <p className="mt-0.5 text-[9px] font-medium text-slate-500">{progress.percent}% completed</p>
            </div>
          ) : (
            <div className="mb-1.5 flex items-center">
              <span 
                className="inline-block text-[9px] font-bold uppercase tracking-wider truncate max-w-full block"
                style={{ color: getCategoryColor(book.category) }}
              >
                {book.category || 'New to shelf'}
              </span>
            </div>
          )}

          <a
            href={readerLink}
            className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 py-2.5 min-h-[44px] text-xs font-bold text-white transition hover:border-blue-300/40 hover:bg-white/15"
          >
            {progress?.percent > 0 ? 'Resume' : 'Open'}
          </a>
        </div>
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
      <SEO
        title="Explore Books - Readify AI"
        description="Search, sort, filter, and discover your next read from our extensive list of digital books, guides, textbooks, and personal documents on Readify AI."
        path="/books"
      />
      <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Explore Books</h1>
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
              className="w-full rounded-xl border border-white/15 bg-slate-950/60 py-3 pl-10 pr-4 text-sm text-white outline-none transition duration-300 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-slate-900/80"
            />
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <label className="shrink-0 text-xs font-semibold uppercase tracking-wider text-slate-400">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl border border-white/15 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500 focus:bg-slate-900/80"
            >
              <option value="Newest" className="text-white bg-slate-950">📅 Newest</option>
              <option value="Most Read" className="text-white bg-slate-950">🔥 Most Read</option>
              <option value="A-Z" className="text-white bg-slate-950">🔤 A-Z</option>
            </select>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">Filter by Category</p>
          <div className="flex flex-row overflow-x-auto gap-2 scrollbar-none flex-nowrap pb-1.5 pt-0.5 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
            {categories.map((cat) => {
              const active = selectedCategory === cat
              const emoji = getCategoryEmoji(cat)
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all duration-300 flex items-center gap-1.5 ${
                    active
                      ? 'bg-gradient-to-r from-blue-500 to-violet-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-105'
                      : 'border border-white/10 bg-white/[0.04] text-slate-300 hover:border-indigo-400/30 hover:text-white'
                  }`}
                >
                  <span className="text-sm">{emoji}</span>
                  <span className="truncate max-w-[100px] block">{cat}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 animate-[fadeIn_220ms_ease-out]">
          <GridSkeleton count={8} />
        </div>
      ) : error ? (
        <div className="mt-6 rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>
      ) : filteredBooks.length === 0 ? (
        <EmptyState
          className="mt-6"
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
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 sm:gap-5 mt-6">
          {filteredBooks.map((book) => (
            <BookCard key={book._id || `${book.title}-${book.author}`} book={book} progress={progressMap.get(book._id)} />
          ))}
        </div>
      )}
    </section>
  )
}
