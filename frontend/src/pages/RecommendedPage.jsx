import { useMemo, useState } from 'react'
import useRecommendations from '../hooks/useRecommendations'
import useProgress from '../hooks/useProgress'
import SaveBookHeart from '../components/SaveBookHeart'
import EmptyState from '../components/EmptyState'
import { useNavigate, Link } from 'react-router-dom'
import { GridSkeleton } from '../components/Skeletons'
import { buildReaderHash } from '../lib/readerLink'
import { getBookThumbnailUrl } from '../lib/mediaUrls'
import { buildProgressMap } from '../lib/readingProgress'
import SEO from '../components/SEO'
import OptimizedImage from '../components/OptimizedImage'

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

function BookCard({ book, progress }) {
  const resumePage = Number.isInteger(progress?.currentPage) && progress.currentPage > 0 ? progress.currentPage : undefined
  const readerLink = buildReaderHash(book, { page: resumePage, cfi: progress?.cfi || '' })
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

export default function RecommendedPage() {
  const navigate = useNavigate()
  const { recommendedBooks, loading, error } = useRecommendations()
  const authUser = (() => {
    try {
      const raw = localStorage.getItem('authUser')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })()
  const { progressItems } = useProgress(authUser?._id)
  const progressMap = useMemo(() => buildProgressMap(progressItems), [progressItems])
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 sm:p-7">
      <SEO
        title="Recommended Books - Readify"
        description="Get personalized book recommendations and curated collections based on your reading history. Discover top classic books and free ebooks online on Readify."
        path="/recommended"
      />
      <h1 className="text-2xl font-bold text-white sm:text-3xl">Personalized Book Recommendations</h1>
      <p className="mt-1 text-sm text-slate-300">Suggestions based on available library books.</p>

      {loading ? (
        <div className="mt-5 animate-[fadeIn_220ms_ease-out]">
          <GridSkeleton count={8} />
        </div>
      ) : error ? (
        <div className="mt-5 rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>
      ) : recommendedBooks.length === 0 ? (
        <EmptyState
          className="mt-5"
          icon="✨"
          title="No recommendations yet"
          description="Read a few books and we will personalize suggestions for you."
          actionLabel="Start Reading"
          onAction={() => navigate('/books')}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 sm:gap-5 mt-5">
          {recommendedBooks.map((book) => (
            <BookCard key={book._id || `${book.title}-${book.author}`} book={book} progress={progressMap.get(book._id)} />
          ))}
        </div>
      )}

      {/* Blog Promotion Banner */}
      <div className="mt-8 rounded-2xl border border-purple-500/20 bg-slate-950/20 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
            <span>📝</span>
            Discover Reading Tips & Guides
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Check out our latest articles on classic books, study tips, and literary analysis.
          </p>
        </div>
        <Link
          to="/blog"
          className="shrink-0 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-5 py-2 text-xs font-bold transition shadow-md shadow-purple-500/10"
        >
          Read Blog
        </Link>
      </div>
    </section>
  )
}
