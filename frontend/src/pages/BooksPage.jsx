import React, { useState, useMemo, useEffect } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import {
  MdStar,
  MdBookmark,
  MdBookmarkBorder,
  MdAccessTime,
  MdChevronLeft,
  MdChevronRight,
  MdSchool,
  MdLightbulb,
  MdMilitaryTech,
} from 'react-icons/md'
import useBooks from '../hooks/useBooks'
import { CATALOG_PRESET_BOOKS } from '../lib/stitchBooks'
import SEO from '../components/SEO'

const TOPICS = ['All', 'Fiction', 'Tech', 'Business', 'Science', 'History']
const LEVELS = [
  { id: 'Beginner', label: 'Beginner', icon: MdSchool },
  { id: 'Intermediate', label: 'Intermediate', icon: MdLightbulb },
  { id: 'Advanced', label: 'Advanced', icon: MdMilitaryTech },
]

export default function BooksPage() {
  const navigate = useNavigate()
  const { books: backendBooks, loading } = useBooks()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''

  const [selectedTopic, setSelectedTopic] = useState('All')
  const [selectedLevel, setSelectedLevel] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [savedBookIds, setSavedBookIds] = useState(() => {
    try {
      const raw = localStorage.getItem('saved_book_slugs')
      return raw ? JSON.parse(raw) : ['shattered-markets']
    } catch {
      return ['shattered-markets']
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

  // Combine backend books with preset catalog books (real database books first)
  const allCatalogBooks = useMemo(() => {
    if (backendBooks && backendBooks.length > 0) {
      const mapped = backendBooks.map((b, idx) => ({
        id: b._id || b.id,
        slug: b.slug || b._id,
        title: b.title,
        coverTitle: (b.title || '').toUpperCase(),
        author: b.author || 'Author',
        coverAuthor: (b.author || '').toUpperCase(),
        category: b.category || 'General',
        difficulty: b.difficulty || (idx % 3 === 0 ? 'Beginner' : idx % 3 === 1 ? 'Intermediate' : 'Advanced'),
        readTime: b.readTime || `${Math.max(4, Math.round((b.pages || 200) / 30))}h read`,
        rating: Number(b.averageRating || 4.7).toFixed(1),
        coverImage: b.coverImage || b.thumbnail || CATALOG_PRESET_BOOKS[idx % CATALOG_PRESET_BOOKS.length].coverImage,
      }))
      const seen = new Set()
      return [...mapped, ...CATALOG_PRESET_BOOKS].filter((book) => {
        if (!book.title || seen.has(book.title.toLowerCase())) return false
        seen.add(book.title.toLowerCase())
        return true
      })
    }
    return CATALOG_PRESET_BOOKS
  }, [backendBooks])

  // Filter books by Search, Topic, and Level
  const filteredBooks = useMemo(() => {
    let result = [...allCatalogBooks]

    // 1. Filter by query
    const q = (query || '').trim().toLowerCase()
    if (q) {
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q)
      )
    }

    // 2. Filter by Topic
    if (selectedTopic !== 'All') {
      result = result.filter((b) => {
        const cat = (b.category || '').toLowerCase()
        const topic = selectedTopic.toLowerCase()
        if (topic === 'tech') return cat.includes('tech') || cat.includes('program') || cat.includes('code')
        return cat.includes(topic)
      })
    }

    // 3. Filter by Level
    if (selectedLevel) {
      result = result.filter(
        (b) => (b.difficulty || '').toLowerCase() === selectedLevel.toLowerCase()
      )
    }

    return result
  }, [allCatalogBooks, query, selectedTopic, selectedLevel])

  const booksPerPage = 8
  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / booksPerPage))
  const paginatedBooks = filteredBooks.slice(
    (currentPage - 1) * booksPerPage,
    currentPage * booksPerPage
  )

  return (
    <div className="space-y-8 pb-12">
      <SEO
        title="Explore Catalog - Readify"
        description="Discover our immersive library of digital books across topics and reading levels."
      />

      {/* ========================================================================= */}
      {/* 1. FILTER ROWS: TOPICS & LEVEL                                            */}
      {/* ========================================================================= */}
      <div className="space-y-4 pt-2">
        {/* Row 1: TOPICS */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] font-bold tracking-[0.2em] text-slate-400 uppercase w-16">
            TOPICS
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {TOPICS.map((topic) => {
              const active = selectedTopic === topic
              return (
                <button
                  key={topic}
                  type="button"
                  onClick={() => {
                    setSelectedTopic(topic)
                    setCurrentPage(1)
                  }}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 ${
                    active
                      ? 'bg-[#2b3558] text-white shadow-sm ring-1 ring-white/10'
                      : 'border border-white/[0.06] bg-[#121624] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
                  }`}
                >
                  {topic}
                </button>
              )
            })}
          </div>
        </div>

        {/* Row 2: LEVEL */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] font-bold tracking-[0.2em] text-slate-400 uppercase w-16">
            LEVEL
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {LEVELS.map((lvl) => {
              const Icon = lvl.icon
              const active = selectedLevel === lvl.id
              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => {
                    setSelectedLevel((prev) => (prev === lvl.id ? null : lvl.id))
                    setCurrentPage(1)
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                    active
                      ? 'bg-[#2b3558] text-white ring-1 ring-violet-400/40 shadow-sm'
                      : 'border border-white/[0.06] bg-[#121624] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{lvl.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. BOOKS GRID (4 COLUMNS EXACT MATCH)                                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {paginatedBooks.map((book) => {
          const isSaved = savedBookIds.includes(book.slug)
          return (
            <div
              key={book.id}
              onClick={() => navigate(`/read/${book.slug}`)}
              className="group relative cursor-pointer flex flex-col justify-between rounded-2xl border border-white/[0.07] bg-[#101420]/95 p-3.5 transition-all duration-300 hover:-translate-y-1.5 hover:border-violet-500/40 hover:bg-[#151928] hover:shadow-2xl shadow-black/60"
            >
              {/* Vertical Book Cover Ratio */}
              <div className="relative aspect-[3/4.2] w-full overflow-hidden rounded-xl bg-slate-950 border border-white/5 shadow-inner">
                <img
                  src={book.coverImage}
                  alt={book.title}
                  className="h-full w-full object-cover rounded-lg opacity-85 transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />

                {/* Cover Overlay Top & Bottom */}
                <div className="absolute inset-0 flex flex-col justify-between p-3 bg-gradient-to-t from-black/80 via-transparent to-black/50 rounded-xl">
                  {/* Top Right Heart Bookmark Button */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleSaveBook(book.slug)
                      }}
                      className="grid h-7 w-7 place-items-center rounded-full bg-black/50 text-slate-300 backdrop-blur-sm transition hover:scale-110 hover:text-pink-400"
                      title={isSaved ? 'Remove Bookmark' : 'Bookmark Book'}
                    >
                      {isSaved ? (
                        <MdBookmark className="h-4 w-4 text-pink-500" />
                      ) : (
                        <MdBookmarkBorder className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Middle Cover Title Text Simulation */}
                  <div className="text-center my-auto py-1">
                    <p className="text-[11px] font-black uppercase text-white tracking-widest drop-shadow-md leading-tight">
                      {book.coverTitle || book.title}
                    </p>
                    <p className="text-[8px] font-semibold text-violet-300 tracking-wider mt-0.5">
                      {book.coverAuthor || book.author}
                    </p>
                  </div>

                  {/* Bottom Left Read Time Badge */}
                  <div className="flex items-center">
                    <span className="inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[9px] font-semibold text-slate-200 backdrop-blur-sm">
                      <MdAccessTime className="h-3 w-3 text-slate-300" />
                      {book.readTime || '8h read'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Book Metadata Footer */}
              <div className="mt-4 space-y-1">
                <h3 className="line-clamp-1 text-sm font-bold text-white group-hover:text-violet-300 transition-colors">
                  {book.title}
                </h3>
                <p className="line-clamp-1 text-xs text-slate-400">
                  {book.author}
                </p>

                {/* Rating with Pink/Rose Star */}
                <div className="pt-2 flex items-center gap-1 text-pink-400 text-xs font-bold">
                  <MdStar className="h-4 w-4 fill-current" />
                  <span className="text-white text-xs">{book.rating || '4.8'}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ========================================================================= */}
      {/* 3. PAGINATION CONTROLS (EXACT DESIGN MATCH)                              */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-center gap-2 pt-6">
        <button
          type="button"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] bg-[#121624] text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
        >
          <MdChevronLeft className="h-5 w-5" />
        </button>

        {[1, 2, 3].map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => setCurrentPage(page)}
            className={`grid h-9 w-9 place-items-center rounded-xl text-xs font-bold transition-all ${
              currentPage === page
                ? 'bg-[#3b82f6] text-white shadow-md shadow-blue-600/30'
                : 'border border-white/[0.08] bg-[#121624] text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {page}
          </button>
        ))}

        <span className="px-1 text-xs text-slate-500 font-bold">...</span>

        <button
          type="button"
          onClick={() => setCurrentPage(12)}
          className={`grid h-9 w-9 place-items-center rounded-xl text-xs font-bold transition-all ${
            currentPage === 12
              ? 'bg-[#3b82f6] text-white shadow-md shadow-blue-600/30'
              : 'border border-white/[0.08] bg-[#121624] text-slate-400 hover:bg-white/10 hover:text-white'
          }`}
        >
          12
        </button>

        <button
          type="button"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] bg-[#121624] text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
        >
          <MdChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 4. FOOTER BAR (EXACT DESIGN MATCH)                                       */}
      {/* ========================================================================= */}
      <footer className="mt-16 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">Readify</span>
          <span>© 2026 Readify. Immersive Reading Experience.</span>
        </div>

        <div className="flex items-center gap-5">
          <Link to="/privacy" className="hover:text-slate-200 transition">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-slate-200 transition">Terms of Service</Link>
          <Link to="/help" className="hover:text-slate-200 transition">Help Center</Link>
          <Link to="/contact" className="hover:text-slate-200 transition">Contact Us</Link>
        </div>
      </footer>
    </div>
  )
}
