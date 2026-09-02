import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdSearch, MdBookmark, MdBookmarkBorder } from 'react-icons/md'
import { MY_LIBRARY_BOOKS } from '../lib/stitchBooks'
import CircularProgressRing from '../components/CircularProgressRing'
import { useSavedBooksContext } from '../context/SavedBooksContext'
import useProgress from '../hooks/useProgress'
import SEO from '../components/SEO'

export default function SavedBooksPage() {
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState('reading') // 'reading', 'completed', 'to-read'
  const [searchQuery, setSearchQuery] = useState('')

  const authUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('authUser')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [])

  const { progressItems } = useProgress(authUser?._id)
  const { savedBooksByCollection, selectedCollectionId } = useSavedBooksContext()

  // Integrate backend saved books or use curated stitch mock library
  const libraryBooks = useMemo(() => {
    // If backend progress items exist and user has progress, enhance or merge
    let baseList = MY_LIBRARY_BOOKS

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      baseList = baseList.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q)
      )
    }

    if (activeFilter === 'completed') {
      return baseList.filter((b) => b.progress === 100 || b.status === 'completed')
    } else if (activeFilter === 'to-read') {
      return baseList.filter((b) => b.progress < 10 || b.status === 'to-read')
    } else {
      // 'reading'
      return baseList.filter((b) => b.progress > 0 && b.progress < 100)
    }
  }, [activeFilter, searchQuery])

  return (
    <>
      <SEO
        title="My Library - Readify AI"
        description="View your personal reading list, continue in-progress books, and track completion progress."
      />

      <div className="space-y-6 pb-12">
        {/* Page Title */}
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          My Library
        </h1>

        {/* Filter Tabs & Search Bar Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-2">
            {[
              { id: 'reading', label: 'READING' },
              { id: 'completed', label: 'COMPLETED' },
              { id: 'to-read', label: 'TO READ' },
            ].map((tab) => {
              const active = activeFilter === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  type="button"
                  className={`rounded-full px-5 py-2 text-xs font-black tracking-wider transition-all duration-200 uppercase ${
                    active
                      ? 'border border-white/30 bg-white/10 text-white shadow-md'
                      : 'border border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Search Library Box */}
          <div className="relative w-full sm:w-72">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <MdSearch className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search library..."
              className="w-full rounded-xl border border-white/[0.08] bg-[#141628] py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-400 transition focus:border-indigo-500/80 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
            />
          </div>
        </div>

        {/* 5-Column Responsive Book Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 pt-2">
          {libraryBooks.map((book) => (
            <div
              key={book.id}
              onClick={() => navigate(`/read/${book.slug || book.id}`)}
              className="group flex flex-col justify-between rounded-2xl border border-white/[0.07] bg-[#141628] p-3 transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/40 hover:bg-[#181a30] hover:shadow-2xl shadow-black/40 cursor-pointer"
            >
              {/* Cover Card with Circular Progress Ring Floating Overlay */}
              <div>
                <div className="relative aspect-[3/4.2] w-full overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-2 shadow-inner">
                  <img
                    src={book.coverImage}
                    alt={book.title}
                    className="h-full w-full object-cover rounded-lg opacity-85 group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />

                  {/* Dark book overlay text */}
                  <div className="absolute inset-0 flex flex-col justify-between p-2.5 bg-black/40 rounded-xl">
                    <span className="text-[7px] font-bold text-slate-400 tracking-wider">
                      {book.coverBadge || 'BOOK'}
                    </span>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-white leading-tight uppercase drop-shadow-md">
                        {book.title}
                      </p>
                      <p className="text-[8px] text-indigo-300 font-semibold mt-0.5">
                        {book.author}
                      </p>
                    </div>
                    <div className="h-2" />
                  </div>

                  {/* Floating Circular Percentage Ring (Bottom Right) */}
                  <div className="absolute bottom-2 right-2">
                    <CircularProgressRing progress={book.progress} size={36} strokeWidth={3} />
                  </div>
                </div>

                {/* Metadata */}
                <div className="mt-3.5">
                  <h3 className="line-clamp-1 text-xs sm:text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {book.title}
                  </h3>
                  <p className="line-clamp-1 text-[11px] text-slate-400 mt-0.5">{book.author}</p>
                </div>
              </div>

              {/* Category Pill Tag */}
              <div className="mt-3">
                <span className="inline-block rounded-md bg-[#202540] px-2.5 py-1 text-[10px] font-bold tracking-wider text-indigo-300 uppercase border border-indigo-500/20">
                  {book.category}
                </span>
              </div>
            </div>
          ))}
        </div>

        {libraryBooks.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-[#141628]/50 py-16 text-center">
            <p className="text-sm font-semibold text-slate-300">No books found in this filter.</p>
            <button
              onClick={() => {
                setActiveFilter('reading')
                setSearchQuery('')
              }}
              className="mt-3 text-xs font-bold text-indigo-400 hover:underline"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>
    </>
  )
}
