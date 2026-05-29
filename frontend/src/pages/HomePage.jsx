import { motion } from 'framer-motion'
import { memo, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useRecommendations from '../hooks/useRecommendations'
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


const BookCard = memo(function BookCard({ book, index }) {
  const resumePage = Number.isInteger(book?.currentPage) && book.currentPage > 0 ? book.currentPage : undefined
  const readerLink = buildReaderHash(book, { page: resumePage, cfi: book?.resumeCfi || '' })
  const [thumbFailed, setThumbFailed] = useState(false)

  return (
    <motion.article
      whileHover={{ scale: 1.04, y: -6 }}
      transition={{ type: 'spring', stiffness: 240, damping: 18 }}
      className="book-card"
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
              className={`h-full w-full rounded-lg bg-gradient-to-br ${index % 3 === 0
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

        {book.progress > 0 ? (
          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-500"
                style={{ width: `${book.progress}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-300/80">
              {book.progress}% completed
            </p>
            <p className="mt-1 text-[11px] text-blue-100/90">Page {book.currentPage} of {book.totalPages}</p>
          </div>
        ) : (
          <div className="mt-3">
            <p className="mt-1 text-[11px] text-slate-300/80">
              New to your shelf
            </p>
          </div>
        )}

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
  const { books, topBooks, loading, error } = useRecommendations()
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
    .filter((item) => item.book && Number(item.progressPercentage || item.percentage || 0) > 0 && Number(item.progressPercentage || item.percentage || 0) < 100)
    .sort((a, b) => new Date(b.lastReadAt || 0).getTime() - new Date(a.lastReadAt || 0).getTime()), [progressItems])
  const featuredBook = safeRecommendedBooks[0] || booksWithProgress[0]
  const topTenBooks = useMemo(() => {
    const topIds = new Set(topBooks.map((book) => book?._id).filter(Boolean))
    const prioritized = booksWithProgress.filter((book) => topIds.has(book._id))
    return prioritized.length > 0 ? prioritized.slice(0, 10) : booksWithProgress.slice(0, 10)
  }, [booksWithProgress, topBooks])

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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.05),transparent_42%),radial-gradient(circle_at_80%_10%,rgba(132,145,255,0.04),transparent_33%)]" />

      <div className="relative space-y-7 md:hidden">
        <section className="relative overflow-hidden rounded-2xl hero">
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
                  className="btn btn-primary"
                >
                  Read Now
                </a>
                <button onClick={() => navigate('/saved-books')} className="btn">
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
          {progressLoading ? (
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[...Array(3)].map((_, idx) => (
                <ProgressCardSkeleton key={`mobile-continue-skeleton-${idx}`} />
              ))}
            </div>
          ) : progressError ? (
            <p className="px-4 text-xs text-rose-200">{progressError}</p>
          ) : continueReadingBooks.length === 0 ? (
            <EmptyState
              className="mx-4"
              icon="📘"
              title="No books in progress"
              description="Start reading any book and it will appear here."
              actionLabel="Explore Books"
              onAction={() => navigate('/books')}
              compact
            />
          ) : (
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {continueReadingBooks.slice(0, 10).map((item) => {
                const book = item.book || {}
                const computed = computeProgress(item)
                const currentPage = computed.currentPage
                const percent = computed.progressPercentage
                return (
                  <article key={item._id} className="min-w-[66vw] max-w-[66vw] shrink-0 snap-start rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                    <a href={buildReaderHash(book, { page: currentPage, cfi: item.resumeCfi || '' })} className="group relative block h-[170px] overflow-hidden rounded-lg bg-slate-900">
                      {book.thumbnail ? (
                        <img loading="lazy" src={getBookThumbnailUrl(book)} onError={applyThumbnailFallback} alt={book.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-blue-500/45 to-violet-600/45 p-3 text-center text-sm font-semibold text-white">
                          {book.title || 'Book'}
                        </div>
                      )}
                      <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">{percent}%</span>
                    </a>
                    <p className="mt-2 line-clamp-1 text-xs font-semibold text-white">{book.title}</p>
                    <p className="mt-0.5 text-[11px] text-slate-300">Page {currentPage} of {computed.totalPages}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full bg-indigo-400 transition-all duration-500" style={{ width: `${percent}%` }} />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-300/80">Last opened {timeAgo(item.lastReadAt)}</p>
                    <a href={buildReaderHash(book, { page: currentPage, cfi: item.resumeCfi || '' })} className="mt-2.5 inline-flex w-full items-center justify-center rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/15">
                      Resume Reading
                    </a>
                  </article>
                )
              })}
            </div>
          )}
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
              icon="🚀"
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
                          onError={(e) => {
                            applyThumbnailFallback(e);
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
                    <p className="mt-1 text-[11px] text-slate-300/80">{percent}% completed â€¢ Last read {timeAgo(item.lastReadAt)}</p>
                    <a href={link} className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-blue-300/40 hover:bg-white/15">
                      Resume Reading
                    </a>
                  </article>
                )
              })}
            </div>
          )}
        </motion.section>

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
              icon="🎯"
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
                  icon="📖"
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
      </div>
    </motion.section>
  )
}
