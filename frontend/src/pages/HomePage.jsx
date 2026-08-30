import React, { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  MdPlayArrow,
  MdBookmarkBorder,
  MdBookmark,
  MdChevronRight,
  MdStar,
  MdCheck,
} from 'react-icons/md'
import useBooks from '../hooks/useBooks'
import useProgress from '../hooks/useProgress'
import {
  BOOK_OF_THE_WEEK,
  CONTINUE_READING_BOOKS,
  TRENDING_BOOKS,
  NEW_ARRIVALS,
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
  const [addedToLibrary, setAddedToLibrary] = useState(false)
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

  // Combine or fallback continue reading books
  const continueReadingList = useMemo(() => {
    if (progressItems && progressItems.length > 0) {
      const mapped = progressItems.slice(0, 2).map((item) => ({
        id: item.book?._id || item.book?.id || item._id,
        slug: item.book?.slug || 'the-design-of-everyday-things',
        title: item.book?.title || 'Current Reading',
        author: item.book?.author || 'Author',
        progress: Math.round(Number(item.progressPercentage || item.progress || 50)),
        timeLeft: `${Math.max(1, Math.round((100 - Number(item.progressPercentage || 50)) / 15))}h left`,
        coverImage: item.book?.coverImage || item.book?.thumbnail || 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?q=80&w=600&auto=format&fit=crop',
        coverBadge: (item.book?.title || 'READING').toUpperCase(),
      }))
      if (mapped.length >= 2) return mapped
      return [...mapped, CONTINUE_READING_BOOKS[1]]
    }
    return CONTINUE_READING_BOOKS
  }, [progressItems])

  // New arrivals with backend books or curated stitch books
  const newArrivalsList = useMemo(() => {
    if (backendBooks && backendBooks.length >= 6) {
      return backendBooks.slice(0, 6).map((b, i) => ({
        id: b._id || b.id,
        slug: b.slug || NEW_ARRIVALS[i]?.slug || 'the-design-of-everyday-things',
        title: b.title,
        author: b.author || 'Unknown Author',
        coverImage: b.coverImage || b.thumbnail || NEW_ARRIVALS[i % NEW_ARRIVALS.length].coverImage,
        coverBadge: (b.title || '').toUpperCase(),
        category: b.category || 'General',
      }))
    }
    return NEW_ARRIVALS
  }, [backendBooks])

  return (
    <>
      <SEO
        title="Readify AI - Intelligent Reading"
        description="Readify AI helps you discover, read, and track intelligent books with AI assistance and beautiful reader interface."
      />

      <div className="space-y-10 pb-12">
        {/* ========================================================================= */}
        {/* 1. HERO BANNER: BOOK OF THE WEEK (Screen 1 exact match)                   */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#141629] via-[#121528] to-[#0f1122] p-6 sm:p-8 md:p-10 shadow-2xl shadow-black/40">
          {/* Subtle background glow */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-purple-600/15 blur-[120px]" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-96 w-96 rounded-full bg-indigo-600/10 blur-[120px]" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            {/* Left: 3D E-Reader Device Frame */}
            <div className="shrink-0 w-full max-w-[280px] sm:max-w-[320px] transition-transform duration-500 hover:scale-105">
              <div className="relative rounded-[2rem] border-[6px] border-[#22253c] bg-[#0c0e18] p-3 shadow-2xl shadow-purple-950/50 ring-1 ring-white/10">
                {/* Tablet Top Notch & Nav Simulation */}
                <div className="mb-2.5 flex items-center justify-between px-2 text-[9px] text-slate-400">
                  <span>Home</span>
                  <div className="flex items-center gap-2">
                    <span>Library</span>
                    <span>Search</span>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-indigo-500/80" />
                </div>

                {/* E-Reader Screen with Book Cover Graphic */}
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-gradient-to-br from-[#0c0e1a] via-[#16182e] to-[#251b3f] p-4 flex flex-col justify-between border border-white/5 shadow-inner">
                  {/* Neural Network Brain Glowing Visual */}
                  <div className="text-center pt-2">
                    <p className="text-[11px] font-black tracking-widest text-indigo-300 uppercase">
                      The Algorithm of Thought
                    </p>
                    <p className="text-[8px] tracking-widest text-slate-400 mt-0.5">
                      EXPLORING COGNITIVE AI
                    </p>
                  </div>

                  {/* Brain Graphic Glowing SVG / Image */}
                  <div className="relative my-auto flex items-center justify-center py-2">
                    <div className="relative h-28 w-28 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-xl animate-pulse" />
                      <img
                        src={BOOK_OF_THE_WEEK.coverImage}
                        alt={BOOK_OF_THE_WEEK.title}
                        className="relative z-10 h-24 w-24 object-cover rounded-full mix-blend-screen opacity-90 filter drop-shadow-[0_0_15px_rgba(168,85,247,0.7)]"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div className="text-center pb-1">
                    <span className="inline-block rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[8px] font-bold text-purple-300 border border-purple-500/20">
                      READIFY AI EDITION
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Book Details & Actions */}
            <div className="flex flex-1 flex-col items-start text-left">
              {/* Badge */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#232742] px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-indigo-300 border border-indigo-500/20">
                <MdStar className="h-3.5 w-3.5 text-indigo-400" />
                {BOOK_OF_THE_WEEK.categoryBadge}
              </span>

              {/* Title */}
              <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
                {BOOK_OF_THE_WEEK.title}
              </h1>

              {/* Description */}
              <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-300 max-w-2xl font-normal">
                {BOOK_OF_THE_WEEK.description}
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Link
                  to="/read/the-design-of-everyday-things"
                  className="inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-purple-950/40 transition hover:brightness-110 active:scale-[0.98]"
                >
                  <MdPlayArrow className="h-5 w-5 fill-current" />
                  <span>Start Reading</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setAddedToLibrary((prev) => !prev)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition active:scale-[0.98] ${
                    addedToLibrary
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                      : 'border-white/20 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {addedToLibrary ? (
                    <>
                      <MdCheck className="h-4 w-4" />
                      <span>Added to Library</span>
                    </>
                  ) : (
                    <>
                      <MdBookmarkBorder className="h-4 w-4" />
                      <span>Add to Library</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. TWO COLUMN SECTION: CONTINUE READING & TRENDING (Screen 1 exact match) */}
        {/* ========================================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (7 cols): Continue Reading */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight text-white">Continue Reading</h2>
              <Link
                to="/library"
                className="text-xs font-semibold text-slate-400 hover:text-indigo-300 transition"
              >
                View All
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {continueReadingList.map((book) => (
                <div
                  key={book.id}
                  onClick={() => navigate(`/read/the-design-of-everyday-things`)}
                  className="group relative flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-[#141629] p-4 transition-all duration-300 hover:border-indigo-500/40 hover:bg-[#181a30] hover:shadow-xl cursor-pointer"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 p-2 shadow-md">
                    <img
                      src={book.coverImage}
                      alt={book.title}
                      className="h-full w-full object-cover rounded-lg opacity-85 group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 flex items-center justify-center p-1 text-center bg-black/40">
                      <span className="text-[8px] font-black text-white leading-tight">
                        {book.coverBadge}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 flex-col justify-between py-0.5">
                    <div>
                      <h3 className="line-clamp-1 text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {book.title}
                      </h3>
                      <p className="line-clamp-1 text-xs text-slate-400 mt-0.5">{book.author}</p>
                    </div>

                    {/* Progress Bar & Subtext */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-300">{book.progress}% completed</span>
                        <span className="text-slate-400">{book.timeLeft}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#22253d]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                          style={{ width: `${book.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column (5 cols): Trending */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-white">Trending</h2>

            <div className="rounded-2xl border border-white/[0.07] bg-[#141629] p-4 shadow-xl">
              <div className="space-y-3">
                {TRENDING_BOOKS.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/read/the-design-of-everyday-things`)}
                    className="group flex items-center justify-between rounded-xl p-2.5 transition hover:bg-white/[0.04] cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Rank Number */}
                      <span className="w-4 text-base font-extrabold text-slate-400 group-hover:text-indigo-400 transition-colors">
                        {item.rank}
                      </span>

                      {/* Cover Thumbnail */}
                      <div className="h-11 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-800">
                        <img
                          src={item.coverImage}
                          alt={item.title}
                          className="h-full w-full object-cover opacity-85 group-hover:scale-105 transition-transform"
                        />
                      </div>

                      {/* Titles */}
                      <div className="flex flex-col">
                        <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                          {item.title}
                        </h4>
                        <span className="text-[11px] text-slate-400">{item.category}</span>
                      </div>
                    </div>

                    <MdChevronRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-white" />
                  </div>
                ))}
              </div>

              <Link
                to="/books"
                className="mt-3 block w-full rounded-xl border border-white/10 py-2.5 text-center text-xs font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                See Full List
              </Link>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. NEW ARRIVALS SECTION (Screen 1 exact match: 6 cards grid)              */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-white">New Arrivals</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {newArrivalsList.map((book) => {
              const isSaved = savedBookIds.includes(book.slug)
              return (
                <div
                  key={book.id}
                  className="group flex flex-col justify-between rounded-2xl border border-white/[0.06] bg-[#141629] p-3 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/40 hover:bg-[#181b32] hover:shadow-xl shadow-black/30"
                >
                  <div
                    onClick={() => navigate(`/read/the-design-of-everyday-things`)}
                    className="cursor-pointer"
                  >
                    {/* Vertical Book Cover Ratio */}
                    <div className="relative aspect-[3/4.2] w-full overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-2 shadow-inner">
                      <img
                        src={book.coverImage}
                        alt={book.title}
                        className="h-full w-full object-cover rounded-lg opacity-85 group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                      {/* Overlay Cover Title Text (like Stitch covers) */}
                      <div className="absolute inset-0 flex flex-col justify-between p-2 bg-black/40 rounded-xl">
                        <span className="text-[7px] font-bold text-slate-400 tracking-wider">
                          HOME
                        </span>
                        <div className="text-center py-2">
                          <p className="text-[9px] font-black text-white leading-tight uppercase drop-shadow-md">
                            {book.coverBadge || book.title}
                          </p>
                          <p className="text-[7px] text-indigo-300 font-semibold mt-0.5">
                            {book.author}
                          </p>
                        </div>
                        <div className="h-1" />
                      </div>
                    </div>

                    {/* Book Metadata */}
                    <div className="mt-3">
                      <h4 className="line-clamp-1 text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {book.title}
                      </h4>
                      <p className="line-clamp-1 text-[11px] text-slate-400 mt-0.5">
                        {book.author}
                      </p>
                    </div>
                  </div>

                  {/* Bookmark quick action */}
                  <div className="mt-2.5 flex items-center justify-between border-t border-white/[0.05] pt-2">
                    <span className="text-[10px] text-indigo-400 font-semibold">
                      {book.category || 'Featured'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleSaveBook(book.slug)
                      }}
                      className="text-slate-400 hover:text-purple-400 p-1"
                      title={isSaved ? 'Saved' : 'Save to Library'}
                    >
                      {isSaved ? (
                        <MdBookmark className="h-4 w-4 text-purple-400" />
                      ) : (
                        <MdBookmarkBorder className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </>
  )
}
