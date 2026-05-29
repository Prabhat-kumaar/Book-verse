import { useMemo, useState } from 'react'
import useRecommendations from '../hooks/useRecommendations'
import useProgress from '../hooks/useProgress'
import SaveBookHeart from '../components/SaveBookHeart'
import EmptyState from '../components/EmptyState'
import { useNavigate } from 'react-router-dom'
import { GridSkeleton } from '../components/Skeletons'
import { buildReaderHash } from '../lib/readerLink'
import { getBookThumbnailUrl } from '../lib/mediaUrls'
import { buildProgressMap } from '../lib/readingProgress'

function BookCard({ book, progress }) {
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
            <img loading="lazy" src={getBookThumbnailUrl(book)} onError={() => setThumbFailed(true)} alt={book.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
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
      <h1 className="text-2xl font-bold text-white sm:text-3xl">Recommended</h1>
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
        <div className="book-grid">
          {recommendedBooks.map((book) => (
            <BookCard key={book._id || `${book.title}-${book.author}`} book={book} progress={progressMap.get(book._id)} />
          ))}
        </div>
      )}
    </section>
  )
}
