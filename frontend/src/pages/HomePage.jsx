import React, { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  MdPlayArrow,
  MdBookmarkBorder,
  MdBookmark,
  MdStar,
  MdMenuBook,
  MdTrendingUp,
  MdWhatshot,
  MdCode,
  MdLightbulbOutline,
  MdRocketLaunch,
  MdShowChart,
  MdChevronRight,
  MdAccessTime,
  MdAutoAwesome,
} from 'react-icons/md'
import useBooks from '../hooks/useBooks'
import useProgress from '../hooks/useProgress'
import {
  BOOK_OF_THE_WEEK,
  CONTINUE_READING_BOOKS,
  TRENDING_BOOKS,
  SAVED_SHELVES,
  CATALOG_PRESET_BOOKS,
} from '../lib/stitchBooks'
import SEO from '../components/SEO'

export default function HomePage() {
  const navigate = useNavigate()
  const { books: backendBooks } = useBooks()
  const [authUser] = useState(() => {
    try {
      const raw = localStorage.getItem('authUser')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  const { progressItems } = useProgress(authUser?._id)
  const [savedBookIds, setSavedBookIds] = useState(() => {
    try {
      const raw = localStorage.getItem('saved_book_slugs')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  const toggleSaveBook = (slug) => {
    setSavedBookIds((prev) => {
      const exists = prev.includes(slug)
      const next = exists ? prev.filter((s) => s !== slug) : [...prev, slug]
      localStorage.setItem('saved_book_slugs', JSON.stringify(next))
      return next
    })
  }

  // Active / continue reading book from real user progress
  const activeContinueBook = useMemo(() => {
    if (progressItems && progressItems.length > 0) {
      const item = progressItems[0]
      return {
        id: item.book?._id || item.book?.id || 'atomic-habits',
        slug: item.book?.slug || item.book?._id || 'the-silent-stars',
        title: item.book?.title || 'Current Reading',
        author: item.book?.author || 'Author',
        chapter: 'Chapter 4',
        progress: Math.round(Number(item.progressPercentage || item.progress || 65)),
        timeLeft: `${Math.max(1, Math.round((100 - Number(item.progressPercentage || 65)) / 15))}h 15m remaining`,
        coverImage: item.book?.coverImage || item.book?.thumbnail || CONTINUE_READING_BOOKS[0].coverImage,
      }
    }
    return CONTINUE_READING_BOOKS[0]
  }, [progressItems])

  // Real backend books for Featured Hero (falling back to BOOK_OF_THE_WEEK)
  const featuredBook = useMemo(() => {
    if (backendBooks && backendBooks.length > 0) {
      const b = backendBooks[0]
      return {
        id: b._id || b.id,
        slug: b.slug || b._id,
        title: b.title,
        subtitle: (b.category || 'FEATURED MASTERPIECE').toUpperCase(),
        author: b.author || 'Author',
        category: b.category || 'Science Fiction',
        description: b.description || BOOK_OF_THE_WEEK.description,
        coverImage: b.coverImage || b.thumbnail || BOOK_OF_THE_WEEK.coverImage,
        rating: Number(b.averageRating || 4.9).toFixed(1),
        pages: b.pages || 412,
      }
    }
    return BOOK_OF_THE_WEEK
  }, [backendBooks])

  // Top trending books from real backend database
  const trendingList = useMemo(() => {
    if (backendBooks && backendBooks.length >= 3) {
      return backendBooks.slice(0, 6).map((b, i) => ({
        rank: i + 1,
        id: b._id || b.id,
        slug: b.slug || b._id,
        title: b.title,
        subtitle: (b.category || 'BESTSELLER').toUpperCase(),
        author: b.author || 'Author',
        category: b.category || 'Fiction',
        rating: Number(b.averageRating || 4.8).toFixed(1),
        coverImage: b.coverImage || b.thumbnail || TRENDING_BOOKS[i % TRENDING_BOOKS.length].coverImage,
      }))
    }
    return TRENDING_BOOKS.map((b, i) => ({
      ...b,
      rank: i + 1,
      rating: '4.8',
    }))
  }, [backendBooks])

  // Curated explore books for 2-column mobile grid
  const curatedBooks = useMemo(() => {
    if (backendBooks && backendBooks.length > 0) {
      const mapped = backendBooks.map((b, idx) => ({
        id: b._id || b.id,
        slug: b.slug || b._id,
        title: b.title,
        author: b.author || 'Author',
        category: b.category || 'General',
        difficulty: b.difficulty || (idx % 3 === 0 ? 'Beginner' : idx % 3 === 1 ? 'Intermediate' : 'Advanced'),
        readTime: b.readTime || `${Math.max(4, Math.round((b.pages || 200) / 30))}h read`,
        rating: Number(b.averageRating || 4.8).toFixed(1),
        coverImage: b.coverImage || b.thumbnail || CATALOG_PRESET_BOOKS[idx % CATALOG_PRESET_BOOKS.length].coverImage,
      }))
      const seen = new Set()
      return [...mapped, ...CATALOG_PRESET_BOOKS].filter((book) => {
        if (!book.title || seen.has(book.title.toLowerCase())) return false
        seen.add(book.title.toLowerCase())
        return true
      }).slice(0, 8)
    }
    return CATALOG_PRESET_BOOKS.slice(0, 8)
  }, [backendBooks])

  // Real dynamic shelves from backend books
  const dynamicShelves = useMemo(() => {
    if (backendBooks && backendBooks.length > 0) {
      const counts = {}
      backendBooks.forEach((b) => {
        const cat = b.category || 'General'
        counts[cat] = (counts[cat] || 0) + 1
      })
      const entries = Object.entries(counts).map(([name, count], i) => {
        const icons = ['code', 'lightbulb', 'rocket', 'chart']
        return {
          id: `cat-${i}`,
          name,
          count,
          icon: icons[i % icons.length],
        }
      })
      if (entries.length >= 2) return entries.slice(0, 4)
    }
    return SAVED_SHELVES
  }, [backendBooks])

  return (
    <>
      <SEO
        title="Readify - Your Next Chapter Awaits"
        description="Immerse yourself in a world of infinite stories. Experience reading redefined with our premium digital library."
      />

      <div className="space-y-8 sm:space-y-12 pb-16 pt-1">
        {/* ========================================================================= */}
        {/* 1. HERO SECTION: "Your Next Chapter Awaits" + Responsive Featured Book    */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br from-[#0c101a] via-[#111626] to-[#0a0d16] p-5 sm:p-8 lg:p-12 shadow-2xl shadow-black/80">
          {/* Ambient Glows */}
          <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-violet-600/15 blur-[120px]" />
          <div className="pointer-events-none absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-pink-600/10 blur-[120px]" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
            {/* Left Column: Heading, Subtext, Action Buttons */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-300 mb-3">
                <MdAutoAwesome className="h-3 w-3 text-violet-400" />
                <span>Featured Digital Collection</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-6xl font-black tracking-tight text-white leading-[1.15]">
                Your Next Chapter <br />
                <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-rose-300 bg-clip-text text-transparent">
                  Awaits
                </span>
              </h1>

              <p className="mt-3 sm:mt-5 max-w-xl text-xs sm:text-base leading-relaxed text-slate-300 font-normal">
                Immerse yourself in a world of infinite stories. Experience reading redefined with our premium digital library designed for absolute focus.
              </p>

              {/* Action Buttons */}
              <div className="mt-5 sm:mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
                <Link
                  to={`/read/${featuredBook.slug}`}
                  className="inline-flex items-center justify-center rounded-full bg-[#c4b5fd] hover:bg-[#d8b4fe] px-5 sm:px-7 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-[#080c14] shadow-lg shadow-purple-950/40 transition duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Start Reading
                </Link>

                <Link
                  to="/books"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-5 sm:px-7 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white transition duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Explore Catalog
                </Link>
              </div>

              {/* Mobile Featured Pick Bar (Shown only on small screens) */}
              <div
                onClick={() => navigate(`/read/${featuredBook.slug}`)}
                className="mt-5 flex lg:hidden w-full items-center gap-3.5 rounded-2xl border border-white/10 bg-black/40 p-2.5 backdrop-blur-md cursor-pointer hover:border-violet-500/40 transition"
              >
                <img
                  src={featuredBook.coverImage}
                  alt={featuredBook.title}
                  className="h-16 w-12 rounded-lg object-cover border border-white/10 shadow shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-amber-400 text-[10px]">
                    <MdStar className="h-3 w-3 fill-current" />
                    <span className="font-bold text-white">{featuredBook.rating}</span>
                    <span className="text-slate-400 font-normal">• {featuredBook.category}</span>
                  </div>
                  <h4 className="text-xs font-bold text-white truncate mt-0.5">{featuredBook.title}</h4>
                  <p className="text-[10px] text-slate-400 truncate">{featuredBook.author}</p>
                </div>
                <span className="rounded-xl bg-violet-600/30 border border-violet-500/40 px-3 py-1.5 text-[11px] font-bold text-violet-200 shrink-0">
                  Read
                </span>
              </div>
            </div>

            {/* Right Column: 3D Tablet Mockup / Featured Book (Desktop & Tablet) */}
            <div className="hidden lg:flex lg:col-span-5 justify-end">
              <div
                onClick={() => navigate(`/read/${featuredBook.slug}`)}
                className="group relative w-full max-w-[320px] cursor-pointer transition-transform duration-500 hover:scale-[1.02]"
              >
                {/* Outer Device Bezel */}
                <div className="relative rounded-[2rem] border-4 border-[#1e2436] bg-[#0c101a] p-3 shadow-2xl shadow-violet-950/60 ring-1 ring-white/10">
                  <div className="mb-2 flex items-center justify-between px-3 text-[10px] text-slate-400 font-medium">
                    <span className="text-slate-300 font-semibold">Readify</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px]">Browse</span>
                      <div className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                    </div>
                  </div>

                  <div className="relative aspect-[3/4.2] w-full overflow-hidden rounded-2xl bg-slate-950 border border-white/5 shadow-inner">
                    <img
                      src={featuredBook.coverImage}
                      alt={featuredBook.title}
                      className="h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-[#090d16] via-[#090d16]/60 to-black/40 p-4 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-amber-400 text-xs">
                          {[...Array(5)].map((_, i) => (
                            <MdStar key={i} className="h-3.5 w-3.5 fill-current" />
                          ))}
                          <span className="ml-1 text-[11px] font-bold text-white">4.9</span>
                        </div>
                        <span className="inline-block rounded-full bg-violet-500/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-300 border border-violet-500/30">
                          {featuredBook.category}
                        </span>
                      </div>

                      <div className="my-auto space-y-2 py-2">
                        <p className="text-[11px] leading-relaxed text-slate-200 line-clamp-3">
                          {featuredBook.description}
                        </p>
                        <button
                          type="button"
                          className="rounded-full bg-[#60a5fa] hover:bg-[#93c5fd] px-4 py-1.5 text-[11px] font-bold text-[#080c14] shadow-sm transition"
                        >
                          Read Now
                        </button>
                      </div>

                      <div className="flex items-center gap-2 border-t border-white/10 pt-2 text-[10px] text-slate-300">
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider">Recommended</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between px-2 pt-1 text-left">
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-violet-300 transition">
                        {featuredBook.title}
                      </h4>
                      <p className="text-[10px] text-slate-400">{featuredBook.author}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleSaveBook(featuredBook.slug)
                      }}
                      className="text-slate-400 hover:text-amber-400 p-1"
                    >
                      <MdStar className={`h-4 w-4 ${savedBookIds.includes(featuredBook.slug) ? 'text-amber-400' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. MAIN CONTENT GRID: CONTINUE READING + TRENDING (LEFT) & SIDEBAR (RIGHT)*/}
        {/* ========================================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ================= LEFT COLUMN: 8 COLS ================= */}
          <div className="lg:col-span-8 space-y-8 sm:space-y-10">
            {/* Section A: Continue Reading */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 text-white">
                <MdMenuBook className="h-5 w-5 text-violet-400" />
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">Continue Reading</h2>
              </div>

              {/* Continue Reading Card */}
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121624]/90 p-4 sm:p-5 shadow-xl shadow-black/40 backdrop-blur-xl">
                <div className="flex items-center gap-4 sm:gap-5">
                  {/* Book Thumbnail Preview */}
                  <div className="relative h-20 w-16 sm:h-20 sm:w-28 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#090d16] p-1 shadow-md">
                    <img
                      src={activeContinueBook.coverImage}
                      alt={activeContinueBook.title}
                      className="h-full w-full object-cover rounded-lg opacity-90"
                    />
                  </div>

                  {/* Book Info & Slider */}
                  <div className="flex-1 min-w-0 space-y-2 sm:space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-white truncate">
                          {activeContinueBook.title}
                        </h3>
                        <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                          {activeContinueBook.author} • {activeContinueBook.chapter}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/read/${activeContinueBook.slug}`)}
                        className="inline-flex items-center gap-1 rounded-lg bg-violet-600 hover:bg-violet-500 px-3 sm:px-4 py-1.5 text-xs font-bold text-white transition active:scale-95 shadow-md shadow-violet-950/40 shrink-0"
                      >
                        <MdPlayArrow className="h-3.5 w-3.5" />
                        <span>Resume</span>
                      </button>
                    </div>

                    {/* Progress details */}
                    <div className="space-y-1">
                      <div className="relative h-2 w-full rounded-full bg-[#1e2438]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500"
                          style={{ width: `${activeContinueBook.progress}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-medium text-slate-400">
                        <span>{activeContinueBook.progress}% Completed</span>
                        <span>{activeContinueBook.timeLeft}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section B: Top Trending Books (Swipeable Carousel on Mobile, Grid on Tablet/Desktop) */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <MdTrendingUp className="h-5 w-5 text-pink-400" />
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight">Top Trending Titles</h2>
                </div>
                <Link
                  to="/books"
                  className="text-xs font-semibold text-slate-400 hover:text-violet-300 transition"
                >
                  View All &rarr;
                </Link>
              </div>

              {/* Mobile Swipe Carousel (< sm) */}
              <div className="sm:hidden flex gap-3.5 overflow-x-auto snap-x snap-mandatory pb-2 pt-1 scrollbar-none -mx-4 px-4">
                {trendingList.map((book) => (
                  <div
                    key={book.id}
                    onClick={() => navigate(`/read/${book.slug}`)}
                    className="shrink-0 snap-start w-[145px] group relative cursor-pointer flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#121624] p-2.5 transition active:scale-95 shadow-lg shadow-black/40"
                  >
                    {/* Cover Aspect */}
                    <div className="relative aspect-[3/4.2] w-full overflow-hidden rounded-xl border border-white/10 bg-slate-950 shadow-inner">
                      <img
                        src={book.coverImage}
                        alt={book.title}
                        className="h-full w-full object-cover rounded-lg group-hover:scale-105 transition duration-500"
                      />
                      {/* Rank Badge */}
                      <span className="absolute top-2 left-2 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 border border-white/20 text-[9px] font-black text-pink-300 backdrop-blur-sm">
                        #{book.rank}
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="mt-2 space-y-0.5">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-violet-300 transition">
                        {book.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate">{book.author}</p>
                      <div className="flex items-center gap-1 pt-0.5 text-amber-400 text-[10px] font-semibold">
                        <MdStar className="h-3 w-3 fill-current" />
                        <span>{book.rating || '4.8'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop / Tablet Grid (sm+) */}
              <div className="hidden sm:grid sm:grid-cols-3 gap-5">
                {trendingList.slice(0, 3).map((book) => (
                  <div
                    key={book.id}
                    onClick={() => navigate(`/read/${book.slug}`)}
                    className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121624] p-3 transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/40 hover:bg-[#161b2c] hover:shadow-xl shadow-black/50 flex flex-col justify-between"
                  >
                    <div className="relative aspect-[3/4.2] w-full overflow-hidden rounded-xl border border-white/5 bg-slate-950 p-2 shadow-inner">
                      <img
                        src={book.coverImage}
                        alt={book.title}
                        className="h-full w-full object-cover rounded-lg opacity-90 transition-transform duration-500 group-hover:scale-105"
                      />

                      <div className="absolute top-2.5 left-2.5 flex items-center justify-between text-[8px] text-slate-300 font-bold drop-shadow">
                        <span className="rounded-md bg-black/70 px-1.5 py-0.5 border border-white/10 text-pink-300">
                          #{book.rank} TRENDING
                        </span>
                      </div>

                      <div className="absolute inset-x-2 bottom-2 rounded-lg bg-black/60 p-2 backdrop-blur-sm text-center">
                        <p className="text-[10px] font-black uppercase text-white tracking-wide truncate">
                          {book.title}
                        </p>
                        <p className="text-[8px] font-semibold text-violet-300 truncate mt-0.5">
                          {book.author}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between px-1">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white group-hover:text-violet-300 transition truncate">
                          {book.title}
                        </h4>
                        <p className="text-[10px] text-slate-400 truncate">{book.author}</p>
                      </div>
                      <MdChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 group-hover:text-white transition shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section C: Curated Masterpieces (2-Column Mobile Grid for Rich Density) */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <MdAutoAwesome className="h-5 w-5 text-violet-400" />
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight">Curated Masterpieces</h2>
                </div>
                <Link
                  to="/books"
                  className="text-xs font-semibold text-slate-400 hover:text-violet-300 transition"
                >
                  Explore All &rarr;
                </Link>
              </div>

              {/* 2-Column on Mobile, 3 on tablet, 4 on desktop */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-5">
                {curatedBooks.slice(0, 4).map((book) => {
                  const isSaved = savedBookIds.includes(book.slug)
                  return (
                    <div
                      key={book.id}
                      onClick={() => navigate(`/read/${book.slug}`)}
                      className="group relative cursor-pointer flex flex-col justify-between rounded-2xl border border-white/[0.07] bg-[#101420]/95 p-2.5 sm:p-3 transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/40 hover:bg-[#151928] hover:shadow-xl shadow-black/60"
                    >
                      {/* Vertical Cover */}
                      <div className="relative aspect-[3/4.2] w-full overflow-hidden rounded-xl bg-slate-950 border border-white/5 shadow-inner">
                        <img
                          src={book.coverImage}
                          alt={book.title}
                          className="h-full w-full object-cover rounded-lg opacity-90 transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            e.target.style.display = 'none'
                          }}
                        />

                        {/* Top Bookmark */}
                        <div className="absolute top-2 right-2 flex justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleSaveBook(book.slug)
                            }}
                            className="grid h-6 w-6 sm:h-7 sm:w-7 place-items-center rounded-full bg-black/60 text-slate-300 backdrop-blur-sm transition hover:scale-110 hover:text-pink-400"
                            title={isSaved ? 'Remove Bookmark' : 'Bookmark Book'}
                          >
                            {isSaved ? (
                              <MdBookmark className="h-3.5 w-3.5 text-pink-500" />
                            ) : (
                              <MdBookmarkBorder className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Bottom Read Time Badge */}
                        <div className="absolute bottom-2 left-2 flex items-center">
                          <span className="inline-flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[8px] sm:text-[9px] font-semibold text-slate-200 backdrop-blur-sm border border-white/10">
                            <MdAccessTime className="h-2.5 w-2.5 text-slate-300" />
                            {book.readTime || '6h read'}
                          </span>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="mt-2.5 space-y-0.5">
                        <h4 className="truncate text-xs sm:text-sm font-bold text-white group-hover:text-violet-300 transition-colors">
                          {book.title}
                        </h4>
                        <p className="truncate text-[10px] sm:text-xs text-slate-400">
                          {book.author}
                        </p>

                        <div className="pt-1 flex items-center justify-between text-[10px]">
                          <span className="text-amber-400 font-bold flex items-center gap-0.5">
                            <MdStar className="h-3 w-3 fill-current" />
                            {book.rating || '4.8'}
                          </span>
                          <span className="text-slate-500 font-medium">
                            {book.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN / SIDEBAR: 4 COLS ================= */}
          <div className="lg:col-span-4 space-y-6">
            {/* Widget 1: Reading Streak */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#121624]/90 p-5 shadow-xl shadow-black/40 backdrop-blur-xl">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Reading Streak</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Keep it up!</p>
                </div>
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.2)]">
                  <MdWhatshot className="h-5 w-5" />
                </div>
              </div>

              {/* Circular Gauge Ring */}
              <div className="mt-6 flex justify-center">
                <div className="relative flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center">
                  <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#1e2438"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="url(#streakGradient)"
                      strokeWidth="8"
                      strokeDasharray="251.2"
                      strokeDashoffset="60"
                      strokeLinecap="round"
                      fill="transparent"
                    />
                    <defs>
                      <linearGradient id="streakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#a855f7" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                  </svg>

                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-2xl sm:text-3xl font-black text-white leading-none">14</span>
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                      DAYS
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Widget 2: Saved Shelves */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#121624]/90 p-5 shadow-xl shadow-black/40 backdrop-blur-xl">
              <h3 className="text-base font-bold text-white mb-4">Saved Shelves</h3>

              <div className="space-y-2.5 sm:space-y-3">
                {dynamicShelves.map((shelf) => {
                  let Icon = MdCode
                  if (shelf.icon === 'lightbulb') Icon = MdLightbulbOutline
                  if (shelf.icon === 'rocket') Icon = MdRocketLaunch
                  if (shelf.icon === 'chart') Icon = MdShowChart

                  return (
                    <Link
                      key={shelf.id}
                      to={`/categories?category=${encodeURIComponent(shelf.name)}`}
                      className="group flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5 sm:p-3 transition duration-200 hover:border-violet-500/30 hover:bg-white/[0.06]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/10 text-violet-300">
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition">
                          {shelf.name}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {shelf.count} items
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
