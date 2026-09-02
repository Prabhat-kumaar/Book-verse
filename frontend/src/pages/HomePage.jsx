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
} from 'react-icons/md'
import useBooks from '../hooks/useBooks'
import useProgress from '../hooks/useProgress'
import {
  BOOK_OF_THE_WEEK,
  CONTINUE_READING_BOOKS,
  TRENDING_BOOKS,
  SAVED_SHELVES,
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
      return backendBooks.slice(0, 3).map((b, i) => ({
        rank: i + 1,
        id: b._id || b.id,
        slug: b.slug || b._id,
        title: b.title,
        subtitle: (b.category || 'BESTSELLER').toUpperCase(),
        author: b.author || 'Author',
        category: b.category || 'Fiction',
        coverImage: b.coverImage || b.thumbnail || TRENDING_BOOKS[i % TRENDING_BOOKS.length].coverImage,
      }))
    }
    return TRENDING_BOOKS
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

      <div className="space-y-12 pb-16 pt-2">
        {/* ========================================================================= */}
        {/* 1. HERO SECTION: "Your Next Chapter Awaits" + 3D Tablet Mockup           */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br from-[#0c101a] via-[#111626] to-[#0a0d16] p-6 sm:p-10 lg:p-12 shadow-2xl shadow-black/80">
          {/* Subtle Ambient Glows */}
          <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-violet-600/15 blur-[120px]" />
          <div className="pointer-events-none absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-pink-600/10 blur-[120px]" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: Heading, Subtext, Action Buttons */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.12]">
                Your Next Chapter <br />
                <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-rose-300 bg-clip-text text-transparent">
                  Awaits
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-sm sm:text-base leading-relaxed text-slate-300 font-normal">
                Immerse yourself in a world of infinite stories. Experience reading redefined with our premium digital library designed for absolute focus.
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to={`/read/${featuredBook.slug}`}
                  className="inline-flex items-center justify-center rounded-full bg-[#c4b5fd] hover:bg-[#d8b4fe] px-7 py-3 text-sm font-bold text-[#080c14] shadow-lg shadow-purple-950/40 transition duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Start Reading Today
                </Link>

                <Link
                  to="/books"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-7 py-3 text-sm font-semibold text-white transition duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Explore Library
                </Link>
              </div>
            </div>

            {/* Right Column: 3D Tablet Mockup / Featured Book */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div
                onClick={() => navigate(`/read/${featuredBook.slug}`)}
                className="group relative w-full max-w-[340px] cursor-pointer transition-transform duration-500 hover:scale-[1.02]"
              >
                {/* Outer Device Bezel */}
                <div className="relative rounded-[2rem] border-4 border-[#1e2436] bg-[#0c101a] p-3 shadow-2xl shadow-violet-950/60 ring-1 ring-white/10">
                  {/* Tablet Top Header Bar Simulation */}
                  <div className="mb-2 flex items-center justify-between px-3 text-[10px] text-slate-400 font-medium">
                    <span className="text-slate-300 font-semibold">Readify</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px]">Browse</span>
                      <div className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                    </div>
                  </div>

                  {/* Tablet Screen Container */}
                  <div className="relative aspect-[3/4.2] w-full overflow-hidden rounded-2xl bg-slate-950 border border-white/5 shadow-inner">
                    {/* Background Galaxy Cosmic Cover */}
                    <img
                      src={featuredBook.coverImage}
                      alt={featuredBook.title}
                      className="h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
                    />

                    {/* Gradient Overlay & Book Reader Info */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#090d16] via-[#090d16]/60 to-black/40 p-4 flex flex-col justify-between">
                      {/* Top Excerpt Overlay */}
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

                      {/* Middle Description Excerpt */}
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

                      {/* Recommended thumbnail preview inside tablet */}
                      <div className="flex items-center gap-2 border-t border-white/10 pt-2 text-[10px] text-slate-300">
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider">Recommended</span>
                      </div>
                    </div>
                  </div>

                  {/* Lower Bezel: Title & Star */}
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
          <div className="lg:col-span-8 space-y-10">
            {/* Section A: Continue Reading */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white">
                <MdMenuBook className="h-5 w-5 text-violet-400" />
                <h2 className="text-xl font-bold tracking-tight">Continue Reading</h2>
              </div>

              {/* Continue Reading Card */}
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121624]/90 p-5 shadow-xl shadow-black/40 backdrop-blur-xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  {/* Book Device / Thumbnail Preview */}
                  <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#090d16] p-1.5 shadow-md">
                    <img
                      src={activeContinueBook.coverImage}
                      alt={activeContinueBook.title}
                      className="h-full w-full object-cover rounded-lg opacity-85"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-1 text-center">
                      <span className="text-[9px] font-black text-white uppercase tracking-wider">
                        {activeContinueBook.title}
                      </span>
                    </div>
                  </div>

                  {/* Book Info & Slider */}
                  <div className="flex-1 min-w-0 w-full space-y-3">
                    <div>
                      <h3 className="text-base font-bold text-white truncate">
                        {activeContinueBook.title}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {activeContinueBook.author} • {activeContinueBook.chapter}
                      </p>
                    </div>

                    {/* Progress details */}
                    <div className="space-y-1.5">
                      {/* Gradient Bar with Knob */}
                      <div className="relative h-2 w-full rounded-full bg-[#1e2438]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500"
                          style={{ width: `${activeContinueBook.progress}%` }}
                        />
                        {/* Circle Thumb Knob */}
                        <div
                          className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-white shadow-md shadow-pink-500/50 ring-2 ring-pink-400"
                          style={{ left: `calc(${activeContinueBook.progress}% - 7px)` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
                        <span>{activeContinueBook.progress}% Completed</span>
                        <span>{activeContinueBook.timeLeft}</span>
                      </div>
                    </div>

                    {/* Resume Button */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => navigate(`/read/${activeContinueBook.slug}`)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/15 px-4 py-1.5 text-xs font-semibold text-white transition active:scale-95"
                      >
                        Resume
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section B: Top 10 Trending */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <MdTrendingUp className="h-5 w-5 text-pink-400" />
                  <h2 className="text-xl font-bold tracking-tight">Top 10 Trending</h2>
                </div>
                <Link
                  to="/books"
                  className="text-xs font-semibold text-slate-400 hover:text-violet-300 transition"
                >
                  View All
                </Link>
              </div>

              {/* 3 Tablet / E-Reader Style Framed Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {trendingList.map((book) => (
                  <div
                    key={book.id}
                    onClick={() => navigate(`/read/${book.slug}`)}
                    className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121624] p-3 transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/40 hover:bg-[#161b2c] hover:shadow-xl shadow-black/50"
                  >
                    {/* Digital Tablet Bezel Simulation */}
                    <div className="relative aspect-[3/4.4] w-full overflow-hidden rounded-xl border border-white/5 bg-slate-950 p-2 shadow-inner">
                      <img
                        src={book.coverImage}
                        alt={book.title}
                        className="h-full w-full object-cover rounded-lg opacity-85 transition-transform duration-500 group-hover:scale-105"
                      />

                      {/* Header Notch on Tablet */}
                      <div className="absolute top-2.5 inset-x-3 flex items-center justify-between text-[8px] text-slate-300 font-bold drop-shadow">
                        <span>Readify</span>
                        <div className="h-1.5 w-1.5 rounded-full bg-pink-400" />
                      </div>

                      {/* Book Title & Author Overlay */}
                      <div className="absolute inset-x-2 bottom-2 rounded-lg bg-black/60 p-2 backdrop-blur-sm text-center">
                        <p className="text-[10px] font-black uppercase text-white tracking-wide truncate">
                          {book.title}
                        </p>
                        <p className="text-[8px] font-semibold text-violet-300 truncate mt-0.5">
                          {book.author}
                        </p>
                      </div>
                    </div>

                    {/* Metadata Footer */}
                    <div className="mt-3 flex items-center justify-between px-1">
                      <div>
                        <h4 className="text-xs font-bold text-white group-hover:text-violet-300 transition truncate">
                          {book.title}
                        </h4>
                        <p className="text-[10px] text-slate-400 truncate">{book.author}</p>
                      </div>
                      <MdChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 group-hover:text-white transition" />
                    </div>
                  </div>
                ))}
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
                <div className="relative flex h-32 w-32 items-center justify-center">
                  <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                    {/* Background track circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#1e2438"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    {/* Animated Progress Ring (14 days = approx 75% of goal) */}
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

                  {/* Inside Center Text */}
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-black text-white leading-none">14</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                      DAYS
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Widget 2: Saved Shelves */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#121624]/90 p-5 shadow-xl shadow-black/40 backdrop-blur-xl">
              <h3 className="text-base font-bold text-white mb-4">Saved Shelves</h3>

              <div className="space-y-3">
                {dynamicShelves.map((shelf) => {
                  let Icon = MdCode
                  if (shelf.icon === 'lightbulb') Icon = MdLightbulbOutline
                  if (shelf.icon === 'rocket') Icon = MdRocketLaunch
                  if (shelf.icon === 'chart') Icon = MdShowChart

                  return (
                    <Link
                      key={shelf.id}
                      to={`/categories?cat=${encodeURIComponent(shelf.name)}`}
                      className="group flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 transition duration-200 hover:border-violet-500/30 hover:bg-white/[0.06]"
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
