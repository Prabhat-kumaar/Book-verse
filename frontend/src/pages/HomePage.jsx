import { motion } from 'framer-motion'
import { memo, useMemo, useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useRecommendations from '../hooks/useRecommendations'
import useProgress from '../hooks/useProgress'
import SaveBookHeart from '../components/SaveBookHeart'
import EmptyState from '../components/EmptyState'
import { BookCardSkeleton, ProgressCardSkeleton } from '../components/Skeletons'
import { buildReaderHash } from '../lib/readerLink'
import { applyThumbnailFallback, getBookThumbnailUrl } from '../lib/mediaUrls'
import { buildProgressMap, computeProgress } from '../lib/readingProgress'
import SEO from '../components/SEO'
import apiClient from '../lib/apiClient'

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

const BookCard = memo(function BookCard({ book, index }) {
  const resumePage = Number.isInteger(book?.currentPage) && book.currentPage > 0 ? book.currentPage : undefined
  const readerLink = buildReaderHash(book, { page: resumePage, cfi: book?.resumeCfi || '' })
  const [thumbFailed, setThumbFailed] = useState(false)

  return (
    <motion.article
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="book-card min-h-[245px] sm:min-h-[345px] shadow-md shadow-black/20 rounded-2xl p-3 sm:p-4 flex flex-col justify-between"
    >
      <SaveBookHeart bookId={book._id} book={book} />
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition duration-500 group-hover:opacity-100 [background:linear-gradient(145deg,rgba(84,132,255,0.1),rgba(146,92,255,0.08))]" />
      <div className="pointer-events-none absolute inset-0 rounded-2xl border border-transparent opacity-0 transition duration-500 group-hover:opacity-100 [background:linear-gradient(135deg,rgba(95,144,255,0.35),rgba(165,111,255,0.25))_border-box] [mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [mask-composite:exclude]" />
      
      <div className="relative flex flex-col h-full justify-between">
        <Link to={`/book/${book._id}`} className="group/link block cursor-pointer text-left">
          <div className="mb-2.5 aspect-[3/4] w-full overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 shadow-inner ring-1 ring-white/10 relative block">
            {book.thumbnail && !thumbFailed ? (
              <img loading="lazy" src={getBookThumbnailUrl(book)} alt={book.title} onError={(event) => { setThumbFailed(true); applyThumbnailFallback(event) }} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
            ) : (
              <div
                className={`h-full w-full rounded-lg bg-gradient-to-br ${index % 3 === 0
                    ? 'from-blue-500/70 to-violet-600/70'
                    : index % 3 === 1
                      ? 'from-indigo-500/70 to-sky-500/70'
                      : 'from-violet-500/70 to-fuchsia-500/70'
                  } p-2 flex items-center justify-center`}
              >
                <p className="line-clamp-3 text-[10px] font-black leading-snug text-center text-white">{book.title}</p>
              </div>
            )}
          </div>

          <h4 className="line-clamp-1 text-xs sm:text-sm font-bold text-white leading-tight group-hover/link:text-indigo-400 transition-colors">{book.title}</h4>
          <p className="line-clamp-1 text-[10px] text-slate-400 font-medium mt-0.5">{book.author}</p>
          {book.totalReviews > 0 && (
            <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-400 font-semibold select-none">
              <span>★</span>
              <span>{Number(book.averageRating || 0).toFixed(1)}</span>
              <span className="text-slate-500 font-normal">({book.totalReviews})</span>
            </div>
          )}
        </Link>

        <div className="mt-auto pt-1">
          {book.progress > 0 ? (
            <div className="mb-1.5">
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-500"
                  style={{ width: `${book.progress}%` }}
                />
              </div>
              <p className="mt-0.5 text-[9px] font-medium text-slate-500">
                {book.progress}% completed
              </p>
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
            className="inline-flex w-full items-center justify-center rounded-lg border border-white/10 bg-white/5 py-1 text-[10px] font-bold text-white transition hover:border-blue-300/40 hover:bg-white/15"
          >
            {book.progress > 0 ? 'Resume' : 'Open'}
          </a>
        </div>
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

  // Reading Goal Motivator States
  const [goalData, setGoalData] = useState(null)
  const [goalLoading, setGoalLoading] = useState(true)
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    if (!authUser?._id) {
      setGoalLoading(false)
      return
    }
    const fetchGoal = async () => {
      try {
        const res = await apiClient.get('/api/goals/me')
        setGoalData(res.data)
      } catch {
        // Fail silently
      } finally {
        setGoalLoading(false)
      }
    }
    fetchGoal()
  }, [authUser?._id])
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

  const topRatedBooks = useMemo(() => {
    return [...booksWithProgress]
      .filter((book) => (book.totalReviews || 0) >= 3)
      .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
      .slice(0, 8)
  }, [booksWithProgress])

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

  const homeSchema = useMemo(() => {
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Readify AI",
      "url": "https://readifyai.vercel.app",
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://readifyai.vercel.app/books?q={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      }
    }
  }, [])

  const orgSchema = useMemo(() => {
    return {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Readify AI",
      "url": "https://readifyai.vercel.app",
      "logo": "https://readifyai.vercel.app/favicon.svg"
    }
  }, [])

  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.85, ease: 'easeOut' }}
      className="relative overflow-hidden py-4 sm:py-10 animate-[fadeIn_300ms_ease-out]"
    >
      <SEO
        title="Readify AI - Read Books Online Free"
        description="Streamlined digital reading companion platform for ebooks, textbooks, and personal documents. Track reading progress, study note bookmarks, and streaks completely free."
        path="/"
        schema={[homeSchema, orgSchema]}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.05),transparent_42%),radial-gradient(circle_at_80%_10%,rgba(132,145,255,0.04),transparent_33%)]" />

      {/* Shared Premium Hero featured book section */}
      <div className="px-2.5 sm:px-0 mb-6">
        <section className="relative overflow-hidden rounded-3xl hero border border-white/10 bg-gradient-to-br from-[#1e1b4b] via-[#311042] to-[#450a26] shadow-[0_16px_45px_rgba(0,0,0,0.4)] md:h-[280px] lg:h-[300px] flex flex-col md:flex-row items-stretch">
          {/* Left side: book cover (40% width, object-cover) */}
          <Link to={`/book/${featuredBook?._id}`} className="relative w-full md:w-[40%] h-[220px] md:h-auto overflow-hidden shrink-0 block group/hero-cover">
            {featuredBook?.thumbnail ? (
              <img 
                loading="lazy" 
                src={getBookThumbnailUrl(featuredBook)} 
                onError={applyThumbnailFallback} 
                alt={featuredBook.title} 
                className="h-full w-full object-cover object-center transition-transform duration-500 group-hover/hero-cover:scale-105" 
              />
            ) : (
              <div className="grid h-full w-full place-items-center bg-gradient-to-br from-indigo-600 to-violet-700 px-6 text-center text-xl font-black text-white">
                {featuredBook?.title || 'Featured Book'}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-transparent to-black/40 pointer-events-none" />
          </Link>

          {/* Right side: title, author, buttons (60% width) */}
          <div className="relative flex-1 p-5 md:p-8 flex flex-col justify-center bg-slate-950/40 backdrop-blur-sm">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink-400">Featured Pick</span>
            <Link to={`/book/${featuredBook?._id}`}>
              <h2 className="mt-1.5 line-clamp-2 text-xl md:text-2xl font-black text-white leading-tight tracking-tight hover:text-pink-400 transition-colors">
                {featuredBook?.title || 'Featured Book'}
              </h2>
            </Link>
            <p className="mt-1 line-clamp-1 text-xs md:text-sm text-slate-300 font-medium">
              by {featuredBook?.author || 'Readify AI Pick'}
            </p>
            
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={featuredBook ? buildReaderHash(featuredBook) : '#'}
                className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white border-none shadow-[0_4px_14px_rgba(219,39,119,0.3)] transition-all duration-300 active:scale-95 flex items-center justify-center"
              >
                Start Reading
              </a>
              {featuredBook?._id && (
                <Link
                  to={`/book/${featuredBook._id}`}
                  className="rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white transition-all duration-300 active:scale-95 flex items-center justify-center"
                >
                  View Details
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Homepage Reading Goal Motivator Widget */}
      {authUser && !goalLoading && goalData?.goalSet && (
        <div className="px-2.5 sm:px-0 mb-6">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/45 p-4 backdrop-blur-md">
            {/* Soft decorative background glows */}
            <div className="absolute -right-12 -top-12 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl select-none">
                  {goalData.data.completedBooksCount >= goalData.data.goal.targetBooks ? '🏆' : 
                   goalData.data.status === 'Ahead of schedule' ? '🔥' :
                   goalData.data.status === 'Behind schedule' ? '⏰' : '✨'}
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    {currentYear} Reading Journey
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      goalData.data.completedBooksCount >= goalData.data.goal.targetBooks
                        ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400'
                        : goalData.data.status === 'Ahead of schedule'
                        ? 'bg-teal-500/15 border-teal-500/20 text-teal-400'
                        : goalData.data.status === 'Behind schedule'
                        ? 'bg-amber-500/15 border-amber-500/20 text-amber-400'
                        : 'bg-indigo-500/15 border-indigo-500/20 text-indigo-400'
                    }`}>
                      {goalData.data.status === 'Goal achieved!' || goalData.data.completedBooksCount >= goalData.data.goal.targetBooks ? 'Achieved' : 
                       goalData.data.status === 'Ahead of schedule' ? 'Ahead' :
                       goalData.data.status === 'Behind schedule' ? 'Behind Pace' : 'On Track'}
                    </span>
                  </h4>
                  
                  {/* Dynamic pace status motivator alerts */}
                  <p className="text-xs text-slate-300 mt-1 select-none leading-relaxed">
                    {goalData.data.completedBooksCount >= goalData.data.goal.targetBooks
                      ? 'Goal achieved! You completed your reading challenge for the year! 🏆'
                      : goalData.data.status === 'Ahead of schedule'
                      ? 'Great pace! You are ahead of schedule. Keep it up! 🔥'
                      : goalData.data.status === 'Behind schedule'
                      ? `You can catch up! Read ${goalData.data.booksPerMonthNeeded} ${goalData.data.booksPerMonthNeeded === 1 ? 'book' : 'books'} this month to stay on track. 📚`
                      : 'Keep going! You are perfectly on track to achieve your yearly goal. ✨'}
                  </p>
                </div>
              </div>

              {/* Progress bar and View Profile details link */}
              <div className="flex flex-col gap-1.5 sm:w-64 shrink-0 justify-center">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold select-none">
                  <span>Progress ({Math.min(100, Math.round((goalData.data.completedBooksCount / goalData.data.goal.targetBooks) * 100))}%)</span>
                  <span className="font-extrabold text-indigo-400 font-mono">
                    {goalData.data.completedBooksCount} / {goalData.data.goal.targetBooks} books
                  </span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-400 via-indigo-500 to-violet-600 transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(100, Math.round((goalData.data.completedBooksCount / goalData.data.goal.targetBooks) * 100))}%` }}
                  />
                </div>
                <Link
                  to="/profile"
                  className="text-[10px] text-right font-extrabold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wider mt-0.5 select-none"
                >
                  View Details &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative space-y-4 px-2.5 md:hidden">

        <section id="continue-reading">
          <div className="mb-1.5 mt-2 flex items-center justify-between px-0.5">
            <h3 className="text-base font-extrabold tracking-tight text-white">Continue Reading</h3>
            <button onClick={() => navigate('/books')} className="text-[11px] font-bold uppercase tracking-wider text-pink-400 hover:text-pink-300 transition-colors">VIEW ALL</button>
          </div>
          {progressLoading ? (
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[...Array(3)].map((_, idx) => (
                <ProgressCardSkeleton key={`mobile-continue-skeleton-${idx}`} />
              ))}
            </div>
          ) : progressError ? (
            <p className="px-1 text-xs text-rose-200">{progressError}</p>
          ) : continueReadingBooks.length === 0 ? (
            <EmptyState
              className="mx-1"
              icon="📘"
              title="No books in progress"
              description="Start reading any book and it will appear here."
              actionLabel="Explore Books"
              onAction={() => navigate('/books')}
              compact
            />
          ) : (
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {continueReadingBooks.slice(0, 10).map((item) => {
                const book = item.book || {}
                const computed = computeProgress(item)
                const currentPage = computed.currentPage
                const percent = computed.progressPercentage
                return (
                  <article key={item._id} className="min-w-[66vw] max-w-[66vw] shrink-0 snap-start rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-md flex flex-col justify-between min-h-[300px]">
                    <div>
                      <a href={buildReaderHash(book, { page: currentPage, cfi: item.resumeCfi || '' })} className="group relative block h-[150px] overflow-hidden rounded-xl bg-slate-950">
                        {book.thumbnail ? (
                          <img loading="lazy" src={getBookThumbnailUrl(book)} onError={applyThumbnailFallback} alt={book.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-blue-500/45 to-violet-600/45 p-3 text-center text-sm font-semibold text-white">
                            {book.title || 'Book'}
                          </div>
                        )}
                        <span className="absolute right-2 top-2 rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-bold text-white shadow-md">{percent}%</span>
                      </a>
                      <p className="mt-2 line-clamp-1 text-sm font-bold text-white leading-tight">{book.title}</p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-400">Page {currentPage} of {computed.totalPages}</p>
                    </div>

                    <div className="mt-auto pt-2">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                        <div className="h-full bg-pink-500 transition-all duration-500" style={{ width: `${percent}%` }} />
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500">Last opened {timeAgo(item.lastReadAt)}</p>
                      <a href={buildReaderHash(book, { page: currentPage, cfi: item.resumeCfi || '' })} className="mt-2.5 inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-bold text-white transition hover:bg-white/15">
                        Resume
                      </a>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section>
          <div className="mb-1.5 mt-2 flex items-center justify-between px-0.5">
            <h3 className="text-base font-extrabold tracking-tight text-white">Recommended</h3>
            <button onClick={() => navigate('/recommended')} className="text-[11px] font-bold uppercase tracking-wider text-pink-400 hover:text-pink-300 transition-colors">VIEW ALL</button>
          </div>
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {safeRecommendedBooks.map((book, index) => (
              <BookCard key={`mobile-rec-${book._id || index}`} book={book} index={index} />
            ))}
          </div>
        </section>

        <section>
          <div className="mb-1.5 mt-2 flex items-center justify-between px-0.5">
            <h3 className="text-base font-extrabold tracking-tight text-white">Top 10 Books</h3>
            <button onClick={() => navigate('/books')} className="text-[11px] font-bold uppercase tracking-wider text-pink-400 hover:text-pink-300 transition-colors">VIEW ALL</button>
          </div>
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
            <div className="mb-1.5 mt-2 flex items-center justify-between px-0.5">
              <h3 className="text-base font-extrabold tracking-tight text-white">{section.title}</h3>
              <button onClick={() => navigate('/books')} className="text-[11px] font-bold uppercase tracking-wider text-pink-400 hover:text-pink-300 transition-colors">VIEW ALL</button>
            </div>
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                    <p className="mt-1 text-[11px] text-slate-300/80">{percent}% completed {"\u2022"} Last read {timeAgo(item.lastReadAt)}</p>
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

          {topRatedBooks.length > 0 && (
            <section className="relative mt-8 sm:mt-10 animate-[fadeIn_350ms_ease-out]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-[clamp(1.25rem,6vw,1.5rem)] font-bold text-white sm:text-2xl flex items-center gap-2">
                    🏆 Top Rated Books
                  </h3>
                  <p className="mt-1 text-xs text-slate-400 font-semibold">Reader favorites with the highest average rating</p>
                </div>
                <button onClick={() => navigate('/books')} className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/80 transition hover:text-blue-100">
                  View All
                </button>
              </div>
              <div className="flex gap-[14px] overflow-x-auto px-5 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] snap-x snap-mandatory sm:gap-4 sm:px-0 [&::-webkit-scrollbar]:hidden">
                {topRatedBooks.map((book, index) => (
                  <div key={`top-rated-${book._id || book.title}-${index}`} className="shrink-0 snap-start">
                    <BookCard book={book} index={index} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </motion.section>
  )
}
