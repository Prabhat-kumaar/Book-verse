import { motion } from 'framer-motion'
import { memo, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useBooks from '../hooks/useBooks'
import useProgress from '../hooks/useProgress'
import SaveBookHeart from '../components/SaveBookHeart'
import EmptyState from '../components/EmptyState'
import { BookCardSkeleton, HeroSkeleton, ProgressCardSkeleton } from '../components/Skeletons'
import { buildReaderHash } from '../lib/readerLink'
import { applyThumbnailFallback, getBookThumbnailUrl } from '../lib/mediaUrls'
import { buildProgressMap, computeProgress } from '../lib/readingProgress'

function timeAgo(value) {
  const then = new Date(value || 0).getTime()
  const now = Date.now()
  const diffMs = Math.max(0, now - then)
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const features = [
  {
    title: 'AI Book Match',
    description: 'Get precise recommendations based on reading pace, interests, and mood signals.',
    icon: 'spark',
  },
  {
    title: 'Smart Summaries',
    description: 'Instant chapter summaries and key takeaways so you retain more in less time.',
    icon: 'doc',
  },
  {
    title: 'Reading Analytics',
    description: 'Track streaks, completion trends, and focus scores with actionable insights.',
    icon: 'chart',
  },
]

function FeatureIcon({ type }) {
  if (type === 'doc') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M8 3h6l4 4v14H8z" />
        <path d="M14 3v4h4" />
        <path d="M10 12h6M10 16h6" />
      </svg>
    )
  }

  if (type === 'chart') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 19h16" />
        <path d="M7 15v-3M12 15V8M17 15v-5" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m12 3 1.9 4.4L18 9.3l-4.1 1.9L12 16l-1.9-4.8L6 9.3l4.1-1.9z" />
    </svg>
  )
}

const BookCard = memo(function BookCard({ book, index }) {
  const resumePage = Number.isInteger(book?.currentPage) && book.currentPage > 0 ? book.currentPage : undefined
  const readerLink = buildReaderHash(book, { page: resumePage, cfi: book?.resumeCfi || '' })
  const [thumbFailed, setThumbFailed] = useState(false)

  return (
    <motion.article
      whileHover={{ scale: 1.04, y: -6 }}
      transition={{ type: 'spring', stiffness: 240, damping: 18 }}
      className="group relative w-[64vw] min-w-[64vw] max-w-[64vw] shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] p-2.5 backdrop-blur-lg transition-all duration-500 hover:z-10 hover:border-blue-300/40 hover:shadow-[0_0_0_1px_rgba(137,162,255,0.45),0_20px_45px_rgba(78,102,255,0.35)] sm:w-[46vw] sm:min-w-[46vw] sm:max-w-[46vw] sm:p-3 lg:w-[198px] lg:min-w-[198px] lg:max-w-[198px]"
    >
      <SaveBookHeart bookId={book._id} book={book} />
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition duration-500 group-hover:opacity-100 [background:linear-gradient(145deg,rgba(84,132,255,0.2),rgba(146,92,255,0.18))]" />
      <div className="pointer-events-none absolute inset-0 rounded-2xl border border-transparent opacity-0 transition duration-500 group-hover:opacity-100 [background:linear-gradient(135deg,rgba(95,144,255,0.55),rgba(165,111,255,0.45))_border-box] [mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [mask-composite:exclude]" />
      <div className="pointer-events-none absolute -right-12 -top-10 h-32 w-32 rounded-full bg-violet-400/25 blur-3xl opacity-0 transition duration-500 group-hover:opacity-100" />
      <div className="relative">
        <div className="mb-3 h-48 w-full overflow-hidden rounded-xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 shadow-inner ring-1 ring-white/10 sm:h-56">
          {book.thumbnail && !thumbFailed ? (
            <img loading="lazy" src={getBookThumbnailUrl(book)} alt={book.title} onError={(event) => { setThumbFailed(true); applyThumbnailFallback(event) }} className="h-full w-full object-cover" />
          ) : (
            <div
              className={`h-full w-full rounded-lg bg-gradient-to-br ${
                index % 3 === 0
                  ? 'from-blue-500/70 to-violet-600/70'
                  : index % 3 === 1
                    ? 'from-indigo-500/70 to-sky-500/70'
                    : 'from-violet-500/70 to-fuchsia-500/70'
              } p-4`}
            >
              <p className="line-clamp-3 text-lg font-bold leading-tight text-white">{book.title}</p>
            </div>
          )}
        </div>

        <h4 className="line-clamp-1 text-sm font-semibold text-white">{book.title}</h4>
        <p className="line-clamp-1 text-xs text-slate-300/90">{book.author}</p>

        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-500"
              style={{ width: `${book.progress}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-300/80">
            {book.progress > 0 ? `${book.progress}% completed` : 'New to your shelf'}
          </p>
          {book.progress > 0 ? (
            <p className="mt-1 text-[11px] text-blue-100/90">Page {book.currentPage} of {book.totalPages}</p>
          ) : null}
        </div>

        <a
          href={readerLink}
          className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-blue-300/40 hover:bg-white/15"
        >
          {book.progress > 0 ? 'Resume Reading' : 'Open Reader'}
        </a>
      </div>
    </motion.article>
  )
})

export default function HomePage() {
  const navigate = useNavigate()
  const { books, loading, error } = useBooks()
  const authUser = (() => {
    try {
      const raw = localStorage.getItem('authUser')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })()
  const {
    progressItems,
    latestProgress,
    loading: progressLoading,
    error: progressError,
  } = useProgress(authUser?._id)

  const progressMap = useMemo(() => buildProgressMap(progressItems), [progressItems])

  const booksWithProgress = useMemo(() => books.map((book) => {
    const progressEntry = progressMap.get(book._id)
    const computed = progressEntry
      ? computeProgress(progressEntry)
      : computeProgress({ currentPage: 1, totalPages: 200, progressPercentage: 0 })

    return {
      ...book,
      progress: computed.progressPercentage,
      currentPage: computed.currentPage,
      totalPages: computed.totalPages,
      resumeCfi: progressEntry?.cfi || '',
    }
  }), [books, progressMap])

  const firstSlice = useMemo(() => booksWithProgress.slice(0, 8), [booksWithProgress])
  const secondSlice = useMemo(() => booksWithProgress.slice(8, 16), [booksWithProgress])
  const bookSections = useMemo(() => [
    { title: 'Recommended', books: firstSlice },
    { title: 'Top Books', books: secondSlice.length > 0 ? secondSlice : firstSlice },
  ], [firstSlice, secondSlice])

  const recentCategory =
    latestProgress?.book?.category ||
    progressItems.find((item) => item.book?.category)?.book?.category ||
    booksWithProgress[0]?.category ||
    'Programming'

  const readBookIds = useMemo(() => new Set(progressItems.map((item) => item.book?._id || item.book)), [progressItems])

  const recommendedBooks = useMemo(() => booksWithProgress
    .filter((book) => !readBookIds.has(book._id))
    .sort((a, b) => {
      const aScore = a.category === recentCategory ? 1 : 0
      const bScore = b.category === recentCategory ? 1 : 0
      if (aScore !== bScore) return bScore - aScore
      return a.title.localeCompare(b.title)
    })
    .slice(0, 8), [booksWithProgress, readBookIds, recentCategory])
  const safeRecommendedBooks = recommendedBooks.length > 0 ? recommendedBooks : booksWithProgress.slice(0, 8)

  const continueReadingBooks = useMemo(() => [...progressItems]
    .filter((item) => item.book)
    .sort((a, b) => new Date(b.lastReadAt || 0).getTime() - new Date(a.lastReadAt || 0).getTime()), [progressItems])
  const featuredBook = safeRecommendedBooks[0] || booksWithProgress[0]
  const topTenBooks = booksWithProgress.slice(0, 10)

  const handleStartReading = () => {
    const section = document.getElementById('books-section')
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    if (booksWithProgress.length > 0) {
      const firstBook = booksWithProgress[0]
      const readerLink = buildReaderHash(firstBook)
      window.location.hash = readerLink
    }
  }

  const handleExploreBooks = () => {
    navigate('/books')
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.85, ease: 'easeOut' }}
      className="relative overflow-hidden py-4 sm:py-10"
    >
      <motion.div
        animate={{ y: [0, -14, 0], x: [0, 8, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -left-16 top-10 h-64 w-64 rounded-full bg-blue-500/30 blur-[90px]"
      />
      <motion.div
        animate={{ y: [0, 16, 0], x: [0, -10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -right-16 top-0 h-72 w-72 rounded-full bg-violet-500/25 blur-[110px]"
      />
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute bottom-0 left-1/3 h-52 w-52 rounded-full bg-indigo-400/20 blur-[100px]"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_42%),radial-gradient(circle_at_80%_10%,rgba(132,145,255,0.14),transparent_33%)]" />
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute left-7 top-7 hidden rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-100/90 lg:block"
      >
        Live AI Insights
      </motion.div>

      <div className="relative space-y-7 md:hidden">
        <section className="relative overflow-hidden rounded-2xl">
          {loading ? <HeroSkeleton /> : null}
          <div className="relative h-[58vw] min-h-[280px] max-h-[420px] w-full overflow-hidden rounded-2xl bg-slate-900">
            {featuredBook?.thumbnail ? (
              <img loading="lazy" src={getBookThumbnailUrl(featuredBook)} onError={applyThumbnailFallback} alt={featuredBook.title} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center bg-gradient-to-br from-indigo-600/60 to-violet-700/60 px-6 text-center text-2xl font-black text-white">
                {featuredBook?.title || 'Featured Book'}
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/95 via-black/60 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 pb-5">
              <h2 className="line-clamp-2 text-2xl font-bold text-white">{featuredBook?.title || 'Featured Book'}</h2>
              <p className="mt-1 line-clamp-1 text-sm text-slate-200">{featuredBook?.author || 'Readify AI Pick'}</p>
              <div className="mt-3 flex gap-2.5">
                <a
                  href={featuredBook ? buildReaderHash(featuredBook) : '#'}
                  className="inline-flex flex-1 items-center justify-center rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white"
                >
                  Read Now
                </a>
                <button onClick={() => navigate('/saved-books')} className="inline-flex flex-1 items-center justify-center rounded-lg border border-white/40 bg-black/30 px-4 py-2 text-sm font-semibold text-white">
                  Saved Books
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="continue-reading">
          <div className="mb-3 flex items-center justify-between px-4">
            <h3 className="text-[18px] font-bold text-white">Continue Reading</h3>
            <button onClick={() => navigate('/books')} className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-300">VIEW ALL</button>
          </div>
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {continueReadingBooks.slice(0, 10).map((item) => {
              const book = item.book || {}
              const computed = computeProgress(item)
              const currentPage = computed.currentPage
              
              const percent = computed.progressPercentage
              return (
                <article key={item._id} className="min-w-[66vw] max-w-[66vw] shrink-0 snap-start">
                  <a href={buildReaderHash(book, { page: currentPage, cfi: item.resumeCfi || '' })} className="group relative block h-[200px] overflow-hidden rounded-xl bg-slate-900">
                    {book.thumbnail ? (
                      <img loading="lazy" src={getBookThumbnailUrl(book)} onError={applyThumbnailFallback} alt={book.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-gradient-to-br from-blue-500/45 to-violet-600/45 p-3 text-center text-sm font-semibold text-white">
                        {book.title || 'Book'}
                      </div>
                    )}
                    <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs text-white">?</span>
                    <div className="absolute inset-x-0 bottom-0 h-1.5 bg-white/20">
                      <div className="h-full bg-indigo-400" style={{ width: `${percent}%` }} />
                    </div>
                  </a>
                  <p className="mt-2 line-clamp-1 text-xs text-white">{book.title}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-300">
                    <button>Info</button>
                    <button>Remove</button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between px-4">
            <h3 className="text-[18px] font-bold text-white">Recommended</h3>
            <button onClick={() => navigate('/recommended')} className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-300">VIEW ALL</button>
          </div>
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {safeRecommendedBooks.map((book, index) => (
              <BookCard key={`mobile-rec-${book._id || index}`} book={book} index={index} />
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between px-4">
            <h3 className="text-[18px] font-bold text-white">Top 10 Books</h3>
            <button onClick={() => navigate('/books')} className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-300">VIEW ALL</button>
          </div>
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {topTenBooks.map((book, idx) => (
              <article key={`topten-${book._id || idx}`} className="relative min-w-[72vw] pl-7 snap-start">
                <span className="pointer-events-none absolute -left-0 top-3 text-8xl font-black leading-none text-white/20">{idx + 1}</span>
                <BookCard book={book} index={idx} />
              </article>
            ))}
          </div>
        </section>

        <section className="mx-4 rounded-2xl border border-indigo-400/25 bg-gradient-to-r from-[#251047] to-[#1a1238] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">Premium Reading Stack</p>
          <h4 className="mt-2 text-xl font-bold text-white">Designed for deep focus and faster learning.</h4>
          <button onClick={() => navigate('/recommended')} className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white">See Recommendations</button>
        </section>

        {bookSections.map((section) => (
          <section key={`mobile-${section.title}`}>
            <div className="mb-3 flex items-center justify-between px-4">
              <h3 className="text-[18px] font-bold text-white">{section.title}</h3>
              <button onClick={() => navigate('/books')} className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-300">VIEW ALL</button>
            </div>
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {section.books.map((book, index) => (
                <BookCard key={`mobile-${section.title}-${book._id || index}`} book={book} index={index} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="hidden md:block">

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.4 }}
        id="continue-reading"
        className="relative mt-6 overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-r from-blue-500/12 via-indigo-500/10 to-violet-500/12 p-4 shadow-[0_16px_45px_rgba(62,88,255,0.25)] sm:mt-10 sm:p-5"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100/85">Continue Reading</p>
        {progressLoading ? (
          <div className="mt-4 flex gap-4 overflow-x-auto pb-2 animate-[fadeIn_220ms_ease-out] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[...Array(4)].map((_, idx) => (
              <ProgressCardSkeleton key={`continue-skeleton-${idx}`} />
            ))}
          </div>
        ) : progressError ? (
          <p className="mt-3 text-sm text-rose-200">{progressError}</p>
        ) : continueReadingBooks.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon="ðŸš€"
            title="Start your reading journey"
            description="Books you read will appear here automatically."
            actionLabel="Explore Books"
            onAction={handleExploreBooks}
            compact
          />
        ) : (
          <div className="mt-4 flex gap-[14px] overflow-x-auto px-5 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] snap-x snap-mandatory sm:gap-4 sm:px-0 [&::-webkit-scrollbar]:hidden">
            {continueReadingBooks.map((item) => {
              const book = item.book || {}
              const computed = computeProgress(item)
              const currentPage = computed.currentPage
              const total = computed.totalPages
              const percent = computed.progressPercentage
              const link = buildReaderHash(book, { page: currentPage, cfi: item.resumeCfi || '' })
              return (
                <article key={item._id} className="group w-[76vw] min-w-[76vw] max-w-[76vw] shrink-0 snap-start rounded-2xl border border-white/10 bg-white/[0.05] p-3 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-blue-300/35 hover:bg-white/[0.09] sm:w-[46vw] sm:min-w-[46vw] sm:max-w-[46vw] lg:w-[230px] lg:min-w-[230px] lg:max-w-[230px]">
                  <div className="relative mb-3 h-32 overflow-hidden rounded-xl bg-slate-900 ring-1 ring-white/10">
                    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-blue-500/40 to-violet-600/40 p-3 text-center text-sm font-semibold text-white">
                      {book.title || 'Book'}
                    </div>
                    {book.thumbnail ? (
                      <img
                        loading="lazy"
                        src={getBookThumbnailUrl(book)}
                        alt={book.title}
                        className="absolute inset-0 h-full w-full object-cover"
                        onError={(e) => { applyThumbnailFallback(e);
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : null}
                  </div>
                  <h4 className="line-clamp-1 text-sm font-semibold text-white">{book.title}</h4>
                  <p className="line-clamp-1 text-xs text-slate-300">{book.author}</p>
                  <p className="mt-1 text-[11px] text-blue-100/90">Page {currentPage} of {total}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-500 transition-all duration-500" style={{ width: `${percent}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-300/80">{percent}% completed • Last read {timeAgo(item.lastReadAt)}</p>
                  <a href={link} className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-blue-300/40 hover:bg-white/15">
                    Resume Reading
                  </a>
                </article>
              )
            })}
          </div>
        )}
      </motion.section>

      <motion.div
        animate={{ y: [0, -8, 0], x: [0, 8, 0] }}
        transition={{ duration: 7.2, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute left-20 top-28 hidden rounded-xl border border-cyan-200/30 bg-cyan-300/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100 xl:block"
      >
        12 New Summaries
      </motion.div>
      <motion.div
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute right-8 top-10 hidden w-40 rounded-2xl border border-white/15 bg-slate-900/45 p-3 backdrop-blur-xl xl:block"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-slate-300/85">Reading Velocity</p>
        <p className="mt-2 text-3xl font-extrabold text-white">+34%</p>
        <p className="mt-1 text-xs text-slate-300">Weekly improvement in completion rate.</p>
      </motion.div>

      {loading ? <HeroSkeleton /> : null}
      <div className="relative mx-auto max-w-4xl text-center">
        <p className="inline-flex rounded-full border border-blue-300/35 bg-blue-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-blue-100">
          Next-Gen Reading Platform
        </p>

        <h1 className="mt-6 text-[clamp(1.85rem,8vw,2rem)] font-black leading-[1.02] text-white sm:mt-7 sm:text-6xl lg:text-7xl">
          Read Smarter with{' '}
          <span className="bg-gradient-to-r from-blue-300 via-indigo-300 to-violet-300 bg-clip-text text-transparent">
            AI
          </span>
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-200/85 sm:mt-6 sm:text-lg lg:text-xl">
          Discover your next favorite book with intelligent recommendations, personalized reading journeys, and insights that adapt to your taste in real time.
        </p>

        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <motion.button
            whileHover={{ y: -4, scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            animate={{ y: [0, -2, 0] }}
            transition={{
              y: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
              default: { type: 'spring', stiffness: 300, damping: 18 },
            }}
            onClick={handleStartReading}
            className="w-full rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_18px_50px_rgba(73,98,255,0.55)] transition duration-300 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.25),0_0_32px_rgba(92,98,255,0.55),0_24px_65px_rgba(88,96,255,0.72)] sm:w-auto"
          >
            Start Reading
          </motion.button>
          <motion.button
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            animate={{ y: [0, -1.5, 0] }}
            transition={{
              y: { duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 },
              default: { type: 'spring', stiffness: 280, damping: 18 },
            }}
            onClick={handleExploreBooks}
            className="w-full rounded-xl border border-white/20 bg-white/10 px-7 py-3.5 text-sm font-semibold text-slate-100 transition duration-300 hover:border-blue-300/45 hover:bg-white/15 hover:shadow-[0_0_26px_rgba(126,110,255,0.35)] sm:w-auto"
          >
            Explore Books
          </motion.button>
        </div>
      </div>

      <div className="relative mt-8 grid gap-4 rounded-2xl border border-white/10 bg-slate-950/35 p-4 backdrop-blur-lg sm:mt-14 sm:grid-cols-3 sm:gap-5 sm:p-6">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-5 text-center">
          <p className="text-2xl font-extrabold text-white sm:text-3xl">50K+</p>
          <p className="mt-1 text-sm font-medium text-slate-300">Books</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-5 text-center">
          <p className="text-2xl font-extrabold text-white sm:text-3xl">200K+</p>
          <p className="mt-1 text-sm font-medium text-slate-300">Users</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-5 text-center">
          <p className="text-2xl font-extrabold text-white sm:text-3xl">98%</p>
          <p className="mt-1 text-sm font-medium text-slate-300">Satisfaction</p>
        </div>
      </div>

      <div className="relative mt-8 grid gap-5 md:grid-cols-2 lg:mt-12 lg:grid-cols-3">
        {features.map((feature, idx) => (
          <motion.article
            key={feature.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.4, delay: idx * 0.08 }}
            whileHover={{ y: -6 }}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl transition-all duration-500 hover:border-blue-300/40 hover:shadow-[0_0_0_1px_rgba(137,162,255,0.45),0_18px_55px_rgba(77,99,255,0.25)]"
          >
            <div className="pointer-events-none absolute inset-0 rounded-2xl border border-transparent opacity-0 transition duration-500 group-hover:opacity-100 [background:linear-gradient(130deg,rgba(85,130,255,0.45),rgba(147,88,255,0.35))_border-box] [mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [mask-composite:exclude]" />
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-violet-500/20 blur-2xl opacity-0 transition duration-500 group-hover:opacity-100" />

            <div className="relative">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-[0_12px_30px_rgba(76,104,255,0.5)] transition duration-500 group-hover:scale-110 group-hover:shadow-[0_16px_40px_rgba(99,96,255,0.65)]">
                <FeatureIcon type={feature.icon} />
              </div>
              <h3 className="mt-4 text-xl font-bold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300/90">{feature.description}</p>
            </div>
          </motion.article>
        ))}
      </div>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.45 }}
        className="relative mt-8 overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-r from-white/[0.08] via-blue-500/[0.06] to-violet-500/[0.08] p-4 sm:mt-10 sm:p-6"
      >
        <div className="pointer-events-none absolute -left-14 top-1/2 h-36 w-36 -translate-y-1/2 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-[clamp(1.25rem,6vw,1.5rem)] font-bold text-white sm:text-2xl">Recommended for You</h3>
            <p className="mt-1 text-sm text-blue-100/90 sm:text-base">Because you read {recentCategory}</p>
          </div>
          <span className="rounded-full border border-blue-300/35 bg-blue-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100">
            Personalized
          </span>
        </div>

        {loading ? (
          <div className="flex gap-4 overflow-x-auto pb-2 animate-[fadeIn_220ms_ease-out] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[...Array(5)].map((_, index) => (
              <BookCardSkeleton key={`recommended-smart-skeleton-${index}`} />
            ))}
          </div>
        ) : safeRecommendedBooks.length === 0 ? (
          <EmptyState
            icon="ðŸŽ¯"
            title="No recommendations yet"
            description="Read a few books to unlock smarter recommendations."
            actionLabel="Start Reading"
            onAction={handleStartReading}
            compact
          />
        ) : (
          <div className="flex gap-[14px] overflow-x-auto px-5 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] snap-x snap-mandatory sm:gap-4 sm:px-0 [&::-webkit-scrollbar]:hidden">
            {safeRecommendedBooks.map((book, index) => (
              <div key={`smart-${book._id || book.title}-${index}`} className="relative shrink-0 snap-start">
                <BookCard book={book} index={index} />
                <span className="pointer-events-none absolute left-3 top-3 z-20 rounded-full border border-white/20 bg-slate-950/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-100">
                  Because you read {recentCategory}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.section>

      <div id="books-section" className="relative mt-8 space-y-8 sm:mt-12 sm:space-y-10">
        {bookSections.map((section) => (
          <section key={section.title}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[clamp(1.25rem,6vw,1.5rem)] font-bold text-white sm:text-2xl">{section.title}</h3>
              <button onClick={() => navigate('/books')} className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/80 transition hover:text-blue-100">
                View All
              </button>
            </div>
            {loading ? (
              <div className="flex gap-4 overflow-x-auto pb-2 animate-[fadeIn_220ms_ease-out] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {[...Array(5)].map((_, index) => (
                  <BookCardSkeleton key={`${section.title}-skeleton-${index}`} />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : section.books.length === 0 ? (
              <EmptyState
                icon="ðŸ“–"
                title="No books available"
                description="New titles will appear here soon."
                actionLabel="Browse Categories"
                onAction={() => navigate('/categories')}
                compact
              />
            ) : (
              <div className="flex gap-[14px] overflow-x-auto px-5 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] snap-x snap-mandatory sm:gap-4 sm:px-0 [&::-webkit-scrollbar]:hidden">
                {section.books.map((book, index) => (
                  <div key={`${section.title}-${book._id || book.title}-${index}`} className="shrink-0 snap-start">
                    <BookCard book={book} index={index} />
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.45 }}
        className="relative mt-10 overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-violet-500/15 p-5 shadow-[0_18px_60px_rgba(77,96,255,0.22)] sm:mt-12 sm:p-6"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-violet-400/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-52 w-52 rounded-full bg-blue-400/25 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-100/90">Premium Reading Stack</p>
            <h4 className="mt-2 text-[clamp(1.35rem,6vw,1.75rem)] font-bold text-white sm:text-3xl">Designed for deep focus and faster learning.</h4>
            <p className="mt-2 max-w-2xl text-sm text-slate-200/85 sm:text-base">Context-aware recommendations, progress memory, and a minimal reading cockpit built for serious readers.</p>
          </div>
          <motion.button
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/recommended')}
            className="rounded-xl border border-white/20 bg-white/15 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:border-blue-300/40 hover:bg-white/20"
          >
            See Recommendations
          </motion.button>
        </div>
      </motion.div>
      </div>
    </motion.section>
  )
}
