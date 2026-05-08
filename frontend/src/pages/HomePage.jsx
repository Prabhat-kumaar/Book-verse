import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import useBooks from '../hooks/useBooks'
import useProgress from '../hooks/useProgress'

const DEMO_USER_ID = 'demo-user-1'

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

function BookCard({ book, index }) {
  const readerLink = `#reader?bookId=${encodeURIComponent(book._id || '')}&pdf=${encodeURIComponent(book.pdf || '')}&title=${encodeURIComponent(book.title || '')}&author=${encodeURIComponent(book.author || '')}`

  return (
    <motion.article
      whileHover={{ scale: 1.04, y: -6 }}
      transition={{ type: 'spring', stiffness: 240, damping: 18 }}
      className="group relative min-w-[198px] max-w-[198px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] p-3 backdrop-blur-lg transition-all duration-500 hover:z-10 hover:border-blue-300/40 hover:shadow-[0_0_0_1px_rgba(137,162,255,0.45),0_20px_45px_rgba(78,102,255,0.35)]"
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition duration-500 group-hover:opacity-100 [background:linear-gradient(145deg,rgba(84,132,255,0.2),rgba(146,92,255,0.18))]" />
      <div className="pointer-events-none absolute inset-0 rounded-2xl border border-transparent opacity-0 transition duration-500 group-hover:opacity-100 [background:linear-gradient(135deg,rgba(95,144,255,0.55),rgba(165,111,255,0.45))_border-box] [mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [mask-composite:exclude]" />
      <div className="pointer-events-none absolute -right-12 -top-10 h-32 w-32 rounded-full bg-violet-400/25 blur-3xl opacity-0 transition duration-500 group-hover:opacity-100" />
      <div className="relative">
        <div className="mb-3 h-56 w-full overflow-hidden rounded-xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 shadow-inner ring-1 ring-white/10">
          {book.thumbnail ? (
            <img src={book.thumbnail} alt={book.title} className="h-full w-full object-cover" />
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
        </div>

        <a
          href={readerLink}
          className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-blue-300/40 hover:bg-white/15"
        >
          Open Reader
        </a>
      </div>
    </motion.article>
  )
}

function BookCardSkeleton() {
  return (
    <article className="min-w-[198px] max-w-[198px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] p-3">
      <div className="h-56 w-full animate-pulse rounded-xl bg-white/10" />
      <div className="mt-3 h-4 w-4/5 animate-pulse rounded bg-white/10" />
      <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-white/10" />
      <div className="mt-4 h-1.5 w-full animate-pulse rounded-full bg-white/10" />
    </article>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const { books, loading, error } = useBooks()
  const {
    progressItems,
    latestProgress,
    loading: progressLoading,
    error: progressError,
  } = useProgress(DEMO_USER_ID)

  const progressMap = new Map(
    progressItems.map((item) => [
      item.book?._id || item.book,
      {
        page: item.currentPage || item.page,
        totalPages: item.totalPages || 200,
        progressPercentage: item.progressPercentage,
        lastReadAt: item.lastReadAt,
      },
    ]),
  )

  const booksWithProgress = books.map((book, index) => ({
    ...book,
    progress:
      progressMap.has(book._id)
        ? Math.min(
            100,
            Math.max(
              5,
              Math.round(
                progressMap.get(book._id).progressPercentage ??
                  ((progressMap.get(book._id).page || 1) / (progressMap.get(book._id).totalPages || 200)) * 100,
              ),
            ),
          )
        : ((index * 19 + 27) % 85) + 10,
  }))

  const bookSections = [
    { title: 'Continue Reading', books: booksWithProgress.slice(0, 8) },
    { title: 'Recommended', books: booksWithProgress.slice(8, 16) },
    { title: 'Top Books', books: booksWithProgress.slice(16, 24) },
  ]

  const recentCategory =
    latestProgress?.book?.category ||
    progressItems.find((item) => item.book?.category)?.book?.category ||
    booksWithProgress[0]?.category ||
    'Programming'

  const readBookIds = new Set(progressItems.map((item) => item.book?._id || item.book))

  const recommendedBooks = booksWithProgress
    .filter((book) => !readBookIds.has(book._id))
    .sort((a, b) => {
      const aScore = a.category === recentCategory ? 1 : 0
      const bScore = b.category === recentCategory ? 1 : 0
      if (aScore !== bScore) return bScore - aScore
      return a.title.localeCompare(b.title)
    })
    .slice(0, 8)

  const lastReadBook = latestProgress?.book
    ? {
        ...latestProgress.book,
        page: latestProgress.currentPage || latestProgress.page || 1,
        progress: Math.min(
          100,
          Math.max(
            5,
            Math.round(
              latestProgress.progressPercentage ??
                (((latestProgress.currentPage || latestProgress.page || 1) / (latestProgress.totalPages || 200)) * 100),
            ),
          ),
        ),
        lastReadAt: latestProgress.lastReadAt,
      }
    : null

  const resumeLink = lastReadBook
    ? `#reader?bookId=${encodeURIComponent(lastReadBook._id || '')}&pdf=${encodeURIComponent(lastReadBook.pdf || '')}&title=${encodeURIComponent(lastReadBook.title || '')}&author=${encodeURIComponent(lastReadBook.author || '')}`
    : '#'

  const handleStartReading = () => {
    const section = document.getElementById('books-section')
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    if (booksWithProgress.length > 0) {
      const firstBook = booksWithProgress[0]
      const readerLink = `#reader?bookId=${encodeURIComponent(firstBook._id || '')}&pdf=${encodeURIComponent(firstBook.pdf || '')}&title=${encodeURIComponent(firstBook.title || '')}&author=${encodeURIComponent(firstBook.author || '')}`
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
      className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.03] p-7 shadow-[0_30px_120px_rgba(4,8,30,0.65)] sm:p-11 lg:p-14"
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
        className="pointer-events-none absolute right-8 top-10 hidden w-52 rounded-2xl border border-white/15 bg-slate-900/45 p-4 backdrop-blur-xl xl:block"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-slate-300/85">Reading Velocity</p>
        <p className="mt-2 text-3xl font-extrabold text-white">+34%</p>
        <p className="mt-1 text-xs text-slate-300">Weekly improvement in completion rate.</p>
      </motion.div>

      <div className="relative mx-auto max-w-4xl text-center">
        <p className="inline-flex rounded-full border border-blue-300/35 bg-blue-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-blue-100">
          Next-Gen Reading Platform
        </p>

        <h1 className="mt-7 text-5xl font-black leading-[0.96] text-white sm:text-6xl lg:text-7xl">
          Read Smarter with{' '}
          <span className="bg-gradient-to-r from-blue-300 via-indigo-300 to-violet-300 bg-clip-text text-transparent">
            AI
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base text-slate-200/85 sm:text-lg lg:text-xl">
          Discover your next favorite book with intelligent recommendations, personalized reading journeys, and insights that adapt to your taste in real time.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <motion.button
            whileHover={{ y: -4, scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            animate={{ y: [0, -2, 0] }}
            transition={{
              y: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
              default: { type: 'spring', stiffness: 300, damping: 18 },
            }}
            onClick={handleStartReading}
            className="rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_18px_50px_rgba(73,98,255,0.55)] transition duration-300 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.25),0_0_32px_rgba(92,98,255,0.55),0_24px_65px_rgba(88,96,255,0.72)]"
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
            className="rounded-xl border border-white/20 bg-white/10 px-7 py-3.5 text-sm font-semibold text-slate-100 transition duration-300 hover:border-blue-300/45 hover:bg-white/15 hover:shadow-[0_0_26px_rgba(126,110,255,0.35)]"
          >
            Explore Books
          </motion.button>
        </div>
      </div>

      <div className="relative mt-14 grid gap-4 rounded-2xl border border-white/10 bg-slate-950/35 p-4 backdrop-blur-lg sm:grid-cols-3 sm:gap-5 sm:p-6">
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

      <div className="relative mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
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

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.4 }}
        id="continue-reading"
        className="relative mt-12 overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-r from-blue-500/12 via-indigo-500/10 to-violet-500/12 p-5 shadow-[0_16px_45px_rgba(62,88,255,0.25)]"
      >
        <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100/85">Continue Reading</p>
          {progressLoading ? (
            <div className="mt-4 animate-pulse">
              <div className="h-5 w-48 rounded bg-white/10" />
              <div className="mt-2 h-4 w-36 rounded bg-white/10" />
              <div className="mt-4 h-2 w-full rounded-full bg-white/10" />
            </div>
          ) : progressError ? (
            <p className="mt-3 text-sm text-rose-200">{progressError}</p>
          ) : !lastReadBook ? (
            <p className="mt-3 text-sm text-slate-200/85">No reading history yet. Start any book and we will personalize this section.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h4 className="text-2xl font-bold text-white">{lastReadBook.title}</h4>
                <p className="text-sm text-slate-300">{lastReadBook.author}</p>
                <p className="mt-1 text-xs text-blue-100/90">
                  Last page: {lastReadBook.page} • {new Date(lastReadBook.lastReadAt).toLocaleString()}
                </p>
                <div className="mt-3 h-2 w-full max-w-md rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-500"
                    style={{ width: `${lastReadBook.progress}%` }}
                  />
                </div>
              </div>
              <motion.a
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href={resumeLink}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_35px_rgba(87,102,255,0.5)] transition hover:shadow-[0_0_28px_rgba(112,108,255,0.55)]"
              >
                Resume Reading
              </motion.a>
            </div>
          )}
        </div>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.45 }}
        className="relative mt-10 overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-r from-white/[0.08] via-blue-500/[0.06] to-violet-500/[0.08] p-6"
      >
        <div className="pointer-events-none absolute -left-14 top-1/2 h-36 w-36 -translate-y-1/2 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white sm:text-2xl">Recommended for You</h3>
            <p className="mt-1 text-sm text-blue-100/90">Because you read {recentCategory}</p>
          </div>
          <span className="rounded-full border border-blue-300/35 bg-blue-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100">
            Personalized
          </span>
        </div>

        {loading ? (
          <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[...Array(5)].map((_, index) => (
              <BookCardSkeleton key={`recommended-smart-skeleton-${index}`} />
            ))}
          </div>
        ) : recommendedBooks.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200/85">
            Read a few books to unlock smarter recommendations.
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {recommendedBooks.map((book, index) => (
              <div key={`smart-${book._id || book.title}-${index}`} className="relative">
                <BookCard book={book} index={index} />
                <span className="pointer-events-none absolute left-3 top-3 z-20 rounded-full border border-white/20 bg-slate-950/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-100">
                  Because you read {recentCategory}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.section>

      <div id="books-section" className="relative mt-12 space-y-10">
        {bookSections.map((section) => (
          <section key={section.title}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white sm:text-2xl">{section.title}</h3>
              <button className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/80 transition hover:text-blue-100">
                View All
              </button>
            </div>
            {loading ? (
              <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {[...Array(5)].map((_, index) => (
                  <BookCardSkeleton key={`${section.title}-skeleton-${index}`} />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : section.books.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200/85">
                No books available yet.
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {section.books.map((book, index) => (
                  <BookCard key={`${section.title}-${book._id || book.title}-${index}`} book={book} index={index} />
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
        className="relative mt-12 overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-violet-500/15 p-6 shadow-[0_18px_60px_rgba(77,96,255,0.22)]"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-violet-400/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-52 w-52 rounded-full bg-blue-400/25 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-100/90">Premium Reading Stack</p>
            <h4 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Designed for deep focus and faster learning.</h4>
            <p className="mt-2 max-w-2xl text-sm text-slate-200/85">Context-aware recommendations, progress memory, and a minimal reading cockpit built for serious readers.</p>
          </div>
          <motion.button
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-xl border border-white/20 bg-white/15 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:border-blue-300/40 hover:bg-white/20"
          >
            Upgrade Experience
          </motion.button>
        </div>
      </motion.div>
    </motion.section>
  )
}
