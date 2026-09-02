import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import useBooks from '../hooks/useBooks'
import useProgress from '../hooks/useProgress'
import SaveBookHeart from '../components/SaveBookHeart'
import EmptyState from '../components/EmptyState'
import { GridSkeleton } from '../components/Skeletons'
import { buildReaderHash } from '../lib/readerLink'
import { buildProgressMap } from '../lib/readingProgress'
import { getBookThumbnailUrl } from '../lib/mediaUrls'
import SEO from '../components/SEO'
import OptimizedImage from '../components/OptimizedImage'

function normalize(value) {
  return (value || '').toString().trim().toLowerCase()
}

const categoryEmojis = {
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

function CategoryBookCard({ book, progress }) {
  const resumePage = Number.isInteger(progress?.currentPage) && progress.currentPage > 0 ? progress.currentPage : undefined
  const readerLink = buildReaderHash(book, { page: resumePage, cfi: progress?.cfi || '' })

  return (
    <article className="book-card min-h-[245px] sm:min-h-[345px] shadow-md shadow-black/20 rounded-2xl p-3 sm:p-4 flex flex-col justify-between transition-all duration-300">
      <SaveBookHeart bookId={book._id} book={book} />
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition duration-500 group-hover:opacity-100 [background:linear-gradient(145deg,rgba(84,132,255,0.1),rgba(146,92,255,0.08))]" />
      <div className="pointer-events-none absolute inset-0 rounded-2xl border border-transparent opacity-0 transition duration-500 group-hover:opacity-100 [background:linear-gradient(135deg,rgba(95,144,255,0.35),rgba(165,111,255,0.25))_border-box] [mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [mask-composite:exclude]" />

      <div className="relative flex flex-col h-full justify-between">
        <Link to={`/book/${book._id}`} className="group/link block cursor-pointer text-left">
          <div className="mb-2 aspect-[3/4] w-full overflow-hidden rounded-lg bg-slate-950/50 shadow-inner ring-1 ring-white/10 relative block">
            <OptimizedImage 
              src={getBookThumbnailUrl(book)} 
              alt={book.title} 
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
            />
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

          <Link
            to={readerLink}
            className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 py-2.5 min-h-[44px] text-xs font-bold text-white transition hover:border-blue-300/40 hover:bg-white/15"
          >
            {progress?.percent > 0 ? 'Resume' : 'Open'}
          </Link>
        </div>
      </div>
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
      <SEO
        title="Book Categories - Readify"
        description="Browse books by category on Readify: Programming, AI, Business, Self-Help, Design, and more. Find the best curated classics and free ebooks by subject."
        path="/categories"
      />
      <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Browse Books by Category</h1>
      <p className="mt-1 text-sm text-slate-300">Discover and browse books by subject matter.</p>

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
        <div className="mt-5 flex flex-wrap gap-2">
          {categories.map((category) => {
            const selected = normalize(activeCategory) === normalize(category)
            const emoji = getCategoryEmoji(category)
            return (
              <Link
                key={category}
                to={`/categories?category=${encodeURIComponent(category)}`}
                className={`category-pill flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-full transition-all duration-300 ${selected
                    ? 'category-pill-active bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-[0_4px_15px_rgba(236,72,153,0.3)]'
                    : 'bg-white/[0.04] text-slate-300 border border-white/10 hover:bg-white/[0.08] hover:border-white/20 hover:text-white'
                  }`}
              >
                <span className="text-sm">{emoji}</span>
                <span>{category}</span>
              </Link>
            )
          })}
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-extrabold tracking-tight text-white mb-4">
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
        ) : !activeCategory ? (
          <div className="flex gap-[14px] overflow-x-auto pb-4 pt-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-5 px-5 sm:mx-0 sm:px-0">
            {visibleBooks.map((book) => (
              <div key={book._id || `${book.title}-${book.author}`} className="shrink-0 snap-start w-[165px] min-w-[165px] sm:w-[210px] sm:min-w-[210px]">
                <CategoryBookCard book={book} progress={progressMap.get(book._id)} />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 sm:gap-5">
            {visibleBooks.map((book) => (
              <CategoryBookCard key={book._id || `${book.title}-${book.author}`} book={book} progress={progressMap.get(book._id)} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
