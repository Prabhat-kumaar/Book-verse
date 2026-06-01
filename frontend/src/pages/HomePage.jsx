import { motion } from 'framer-motion'
import { memo, useMemo, useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useBooks from '../hooks/useBooks'
import useProgress from '../hooks/useProgress'
import SaveBookHeart from '../components/SaveBookHeart'
import EmptyState from '../components/EmptyState'
import { BookCardSkeleton, ProgressCardSkeleton } from '../components/Skeletons'
import { buildReaderHash } from '../lib/readerLink'
import { applyThumbnailFallback, getBookThumbnailUrl } from '../lib/mediaUrls'
import { buildProgressMap, computeProgress } from '../lib/readingProgress'
import SEO from '../components/SEO'
import apiClient from '../lib/apiClient'

const GOAL_CACHE_TTL_MS = 15000
const goalCache = {
  userId: '',
  data: null,
  inFlight: null,
  lastFetchedAt: 0,
}

const SIGNUP_POPUP_DISMISSED_KEY = 'readify_popup_dismissed'
const SIGNUP_POPUP_DELAY_MS = 8000
const SIGNUP_POPUP_COOLDOWN_MS = 600000

const signupPopupFeatures = [
  {
    imageSrc: '/screenshots/dashboard.png',
    imageAlt: 'Reading Dashboard',
    title: 'Reading Dashboard',
    description: 'Track started, completed books, total pages read, and reading time — all in one place.',
  },
  {
    imageSrc: '/screenshots/goals.png',
    imageAlt: 'Streaks and Goals',
    title: 'Streaks & Goals',
    description: 'Set your 2026 reading goal, track daily streaks, and stay motivated all year.',
  },
  {
    imageSrc: '/screenshots/library.png',
    imageAlt: 'Personal Library',
    title: 'Personal Library',
    description: 'See all your completed books with covers, dates, and progress history saved forever.',
  },
  {
    imageSrc: '/screenshots/achievements.png',
    imageAlt: 'Achievements',
    title: 'Achievements & Badges',
    description: 'Unlock badges like First Book Read, Night Owl, Speed Reader, and 10 Books Completed.',
  },
]

async function fetchReadingGoal(userId) {
  if (!userId) return null
  if (goalCache.userId === userId && goalCache.inFlight) return goalCache.inFlight
  if (goalCache.userId === userId && goalCache.lastFetchedAt && Date.now() - goalCache.lastFetchedAt < GOAL_CACHE_TTL_MS) {
    return goalCache.data
  }

  goalCache.userId = userId
  goalCache.inFlight = apiClient.get('/api/goals/me')
    .then((res) => {
      goalCache.data = res.data
      goalCache.lastFetchedAt = Date.now()
      return res.data
    })
    .finally(() => {
      goalCache.inFlight = null
    })

  return goalCache.inFlight
}

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

function SectionHeader({ title, to = '/books' }) {
  return (
    <div className="mb-3 flex items-center justify-between px-0.5">
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <Link to={to} className="text-[11px] font-bold uppercase tracking-wider text-pink-400 transition-colors hover:text-pink-300">
        VIEW ALL
      </Link>
    </div>
  )
}

function BookRow({ books, rowKey, loading, emptyTitle = 'No books available', viewAllTo = '/books' }) {
  return (
    <section>
      <SectionHeader title={rowKey} to={viewAllTo} />
      {loading ? (
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pr-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4">
          {[...Array(5)].map((_, index) => (
            <BookCardSkeleton key={`${rowKey}-skeleton-${index}`} />
          ))}
        </div>
      ) : books.length === 0 ? (
        <EmptyState
          icon="📚"
          title={emptyTitle}
          description="New titles will appear here soon."
          compact
        />
      ) : (
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pr-6 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:gap-4">
          {books.map((book, index) => (
            <div key={`${rowKey}-${book._id || book.title}-${index}`} className="shrink-0 snap-start w-[52vw] min-w-[52vw] sm:w-auto sm:min-w-0">
              <BookCard book={book} index={index} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const { books, loading, error } = useBooks()
  const [isSignupPopupVisible, setIsSignupPopupVisible] = useState(false)
  const authUser = (() => {
    try {
      const raw = localStorage.getItem('authUser')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })()
  const isGuestUser = !authUser

  const closeSignupPopup = () => {
    try {
      localStorage.setItem(SIGNUP_POPUP_DISMISSED_KEY, String(Date.now()))
    } catch {
      // Ignore storage failures.
    }
    setIsSignupPopupVisible(false)
  }

  useEffect(() => {
    if (!isGuestUser) {
      setIsSignupPopupVisible(false)
      return undefined
    }

    try {
      const dismissedAt = Number(localStorage.getItem(SIGNUP_POPUP_DISMISSED_KEY) || 0)
      if (dismissedAt && Date.now() - dismissedAt < SIGNUP_POPUP_COOLDOWN_MS) {
        return undefined
      }
    } catch {
      // If storage is unavailable, still allow the guest prompt for this session.
    }

    const timerId = window.setTimeout(() => {
      setIsSignupPopupVisible(true)
    }, SIGNUP_POPUP_DELAY_MS)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [isGuestUser])

  // Reading Goal Motivator States
  const [goalData, setGoalData] = useState(null)
  const [goalLoading, setGoalLoading] = useState(true)
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    let ignore = false
    if (!authUser?._id) {
      setGoalLoading(false)
      return
    }
    const fetchGoal = async () => {
      try {
        const data = await fetchReadingGoal(authUser._id)
        if (!ignore) setGoalData(data)
      } catch {
        // Fail silently
      } finally {
        if (!ignore) setGoalLoading(false)
      }
    }
    fetchGoal()

    return () => {
      ignore = true
    }
  }, [authUser?._id])

  const {
    progressItems,
    loading: progressLoading,
    error: progressError,
  } = useProgress(authUser?._id)

  const progressMap = useMemo(() => buildProgressMap(progressItems), [progressItems])

  const addProgressToBook = useMemo(() => (book) => {
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
  }, [progressMap])

  const booksWithProgress = useMemo(() => books.map(addProgressToBook), [books, addProgressToBook])

  const topTenBooks = useMemo(() => {
    return [...booksWithProgress]
      .sort((a, b) => (b.openCount || 0) - (a.openCount || 0))
      .slice(0, 10)
  }, [booksWithProgress])

  const topTenBookIds = useMemo(() => new Set(topTenBooks.map((book) => book._id).filter(Boolean)), [topTenBooks])

  const newArrivalBooks = useMemo(() => {
    return [...booksWithProgress]
      .filter((book) => !topTenBookIds.has(book._id))
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 10)
  }, [booksWithProgress, topTenBookIds])

  const showNewArrivals = loading || newArrivalBooks.length >= 3

  const categoryRows = useMemo(() => {
    const grouped = booksWithProgress.reduce((rows, book) => {
      const category = (book.category || '').toString().trim()
      if (!category) return rows
      if (!rows[category]) rows[category] = []
      rows[category].push(book)
      return rows
    }, {})

    return Object.entries(grouped)
      .filter(([, categoryBooks]) => categoryBooks.length >= 2)
      .map(([category, categoryBooks]) => ({
        category,
        books: categoryBooks.slice(0, 6),
      }))
      .sort((a, b) => a.category.localeCompare(b.category))
  }, [booksWithProgress])

  const continueReadingBooks = useMemo(() => [...progressItems]
    .filter((item) => item.book && Number(item.progressPercentage || item.percentage || 0) > 0 && Number(item.progressPercentage || item.percentage || 0) < 100)
    .sort((a, b) => new Date(b.lastReadAt || 0).getTime() - new Date(a.lastReadAt || 0).getTime()), [progressItems])

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
    <>
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

      <div className="relative space-y-8 px-2.5 sm:px-0">
        <section id="continue-reading">
          <SectionHeader title="CONTINUE READING" to="/books" />
          {progressLoading ? (
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pr-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4">
              {[...Array(4)].map((_, idx) => (
                <ProgressCardSkeleton key={`continue-skeleton-${idx}`} />
              ))}
            </div>
          ) : progressError ? (
            <p className="px-1 text-sm text-rose-200">{progressError}</p>
          ) : continueReadingBooks.length === 0 ? (
            <EmptyState
              className="mx-1"
              icon="Book"
              title="No books in progress"
              description="Start reading any book and it will appear here."
              actionLabel="Explore Books"
              onAction={handleExploreBooks}
              compact
            />
          ) : (
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pr-6 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:gap-4">
              {continueReadingBooks.slice(0, 10).map((item) => {
                const book = item.book || {}
                const computed = computeProgress(item)
                const currentPage = computed.currentPage
                const percent = computed.progressPercentage
                const link = buildReaderHash(book, { page: currentPage, cfi: item.resumeCfi || '' })
                return (
                  <div key={item._id} className="group w-[66vw] min-w-[66vw] shrink-0 snap-start rounded-2xl border border-white/10 bg-white/[0.05] p-3 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-blue-300/35 hover:bg-white/[0.09] sm:w-[230px] sm:min-w-[230px]">
                    <a href={link} className="group relative block h-[150px] overflow-hidden rounded-xl bg-slate-950">
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
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
                      <div className="h-full bg-pink-500 transition-all duration-500" style={{ width: `${percent}%` }} />
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">Last opened {timeAgo(item.lastReadAt)}</p>
                    <a href={link} className="mt-2.5 inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-bold text-white transition hover:bg-white/15">
                      Resume
                    </a>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section>
          <SectionHeader title="TOP 10 BOOKS" to="/books" />
          {loading ? (
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pr-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4">
              {[...Array(5)].map((_, index) => (
                <BookCardSkeleton key={`top-ten-skeleton-${index}`} />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : (
            <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pr-6 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {topTenBooks.map((book, idx) => (
                <div key={`topten-${book._id || idx}`} className="relative shrink-0 snap-start w-[72vw] min-w-[72vw] pl-7 sm:w-[230px] sm:min-w-[230px]">
                  <span className="pointer-events-none absolute left-0 top-3 text-8xl font-black leading-none text-white/20">{idx + 1}</span>
                  <BookCard book={book} index={idx} />
                </div>
              ))}
            </div>
          )}
        </section>

        {showNewArrivals && (
          <BookRow
            rowKey="NEW ARRIVALS"
            books={newArrivalBooks}
            loading={loading && newArrivalBooks.length === 0}
            emptyTitle="No new arrivals yet"
            viewAllTo="/books"
          />
        )}

        <div id="books-section" className="space-y-8">
          {categoryRows.map(({ category, books: categoryBooks }) => (
            <BookRow
              key={category}
              rowKey={category}
              books={categoryBooks}
              loading={loading}
              viewAllTo={`/categories?category=${encodeURIComponent(category)}`}
            />
          ))}
        </div>

        {authUser && !goalLoading && goalData?.goalSet && (
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/45 p-4 backdrop-blur-md">
            <div className="absolute -right-12 -top-12 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl select-none">
                  {goalData.data.completedBooksCount >= goalData.data.goal.targetBooks ? 'Goal' :
                   goalData.data.status === 'Ahead of schedule' ? 'Hot' :
                   goalData.data.status === 'Behind schedule' ? 'Time' : 'On'}
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
                  <p className="text-xs text-slate-300 mt-1 select-none leading-relaxed">
                    {goalData.data.completedBooksCount >= goalData.data.goal.targetBooks
                      ? 'Goal achieved! You completed your reading challenge for the year!'
                      : goalData.data.status === 'Ahead of schedule'
                      ? 'Great pace! You are ahead of schedule. Keep it up!'
                      : goalData.data.status === 'Behind schedule'
                      ? `You can catch up! Read ${goalData.data.booksPerMonthNeeded} ${goalData.data.booksPerMonthNeeded === 1 ? 'book' : 'books'} this month to stay on track.`
                      : 'Keep going! You are perfectly on track to achieve your yearly goal.'}
                  </p>
                </div>
              </div>
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
        )}
      </div>
      </motion.section>

      {isSignupPopupVisible && isGuestUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={closeSignupPopup}
        >
          <div
            className="relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeSignupPopup}
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
              aria-label="Close signup popup"
            >
              X
            </button>

            <div className="pr-10">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300 sm:text-[11px]">
                FREE FOREVER • NO CREDIT CARD
              </p>
              <h2 className="mt-2 text-lg font-bold leading-tight text-white sm:mt-3 sm:text-2xl">
                Everything a serious reader needs
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-300 sm:mt-2 sm:text-sm">
                Join readers already tracking their progress on Readify AI
              </p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-3">
              {signupPopupFeatures.map((feature) => (
                <div key={feature.title} className="rounded-xl border border-white/10 bg-white/[0.04] p-2 sm:rounded-2xl">
                  <img src={feature.imageSrc} alt={feature.imageAlt} className="mb-1.5 h-12 w-full rounded-lg object-cover object-top sm:mb-2 sm:h-16" />
                  <h3 className="text-[11px] font-bold leading-tight text-white sm:text-sm">{feature.title}</h3>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-slate-400 sm:text-xs sm:leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>

            <div className="sticky bottom-0 -mx-4 mt-3 border-t border-white/10 bg-slate-900/95 px-4 pb-1 pt-3 backdrop-blur-xl sm:mt-5 sm:border-t-0 sm:pt-0">
              <button
                type="button"
                onClick={() => {
                  closeSignupPopup()
                  navigate('/signup')
                }}
                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-indigo-950/30 transition hover:from-indigo-400 hover:to-violet-500 sm:py-3"
              >
                Create Free Account &rarr;
              </button>
              <p className="mt-2 text-center text-xs text-slate-400 sm:mt-3">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    closeSignupPopup()
                    navigate('/login')
                  }}
                  className="font-bold text-indigo-300 transition hover:text-indigo-200"
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
