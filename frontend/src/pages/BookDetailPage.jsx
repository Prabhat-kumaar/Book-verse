import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MdChevronLeft,
  MdStar,
  MdStarBorder,
  MdBookmark,
  MdBookmarkBorder,
  MdMenuBook,
  MdArrowForward,
  MdAccessTime,
  MdLanguage,
  MdCalendarToday,
  MdBusiness,
  MdFormatListNumbered,
} from 'react-icons/md'
import apiClient from '../lib/apiClient'
import { getBookThumbnailUrl, applyThumbnailFallback } from '../lib/mediaUrls'
import { buildReaderHash } from '../lib/readerLink'
import SEO from '../components/SEO'
import { SIMILAR_READS_PRESET } from '../lib/stitchBooks'
import useBooks from '../hooks/useBooks'

export default function BookDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { books: allBackendBooks } = useBooks()

  const [book, setBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('summary') // 'summary' | 'toc' | 'reviews'

  // Saved bookmark state
  const [isSaved, setIsSaved] = useState(false)

  // Reviews state
  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [formRating, setFormRating] = useState(0)
  const [formHoverRating, setFormHoverRating] = useState(0)
  const [formText, setFormText] = useState('')
  const [formSubmitError, setFormSubmitError] = useState('')
  const [formSubmitLoading, setFormSubmitLoading] = useState(false)

  const authUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('authUser')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [])

  // Sync saved bookmarks from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('saved_book_slugs')
      const saved = raw ? JSON.parse(raw) : []
      if (book) {
        setIsSaved(saved.includes(book.slug || id))
      }
    } catch {
      setIsSaved(false)
    }
  }, [book, id])

  const toggleBookmark = () => {
    try {
      const raw = localStorage.getItem('saved_book_slugs')
      const saved = raw ? JSON.parse(raw) : []
      const targetSlug = book?.slug || id
      const exists = saved.includes(targetSlug)
      const next = exists ? saved.filter((s) => s !== targetSlug) : [...saved, targetSlug]
      localStorage.setItem('saved_book_slugs', JSON.stringify(next))
      setIsSaved(!exists)
    } catch (e) {
      console.error(e)
    }
  }

  // Fetch book details from backend or use LuminaBooks preset
  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        setLoading(true)
        setError('')
        let foundBook = null
        try {
          const res = await apiClient.get(`/books/${id}`)
          if (res.data?.success && res.data.data) {
            foundBook = res.data.data
          } else if (res.data?.book) {
            foundBook = res.data.book
          }
        } catch (idErr) {
          // If ID lookup fails, try by slug
          try {
            const slugRes = await apiClient.get(`/books/slug/${encodeURIComponent(id)}`)
            if (slugRes.data?.success && slugRes.data.data) {
              foundBook = slugRes.data.data
            } else if (slugRes.data?.book) {
              foundBook = slugRes.data.book
            }
          } catch (slugErr) {
            console.log('Book slug lookup fallback')
          }
        }

        if (foundBook) {
          setBook({
            ...foundBook,
            _id: foundBook._id || foundBook.id || id,
            slug: foundBook.slug || id,
            title: foundBook.title || 'Untitled Book',
            author: foundBook.author || 'Unknown Author',
            coverAuthor: (foundBook.author || 'Author').toUpperCase(),
            category: foundBook.category || 'General',
            tags: foundBook.tags && foundBook.tags.length ? foundBook.tags : [foundBook.category || 'FICTION', 'FEATURED'],
            rating: Number(foundBook.averageRating || foundBook.rating || 4.8).toFixed(1),
            totalReviews: foundBook.totalReviews || 120,
            pages: foundBook.pages || 320,
            publisher: foundBook.publisher || 'LuminaBooks Publishing',
            releaseDate: foundBook.createdAt ? new Date(foundBook.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '2026',
            language: foundBook.language || 'English',
            description: foundBook.description || 'An inspiring literary masterpiece ready for your digital reading experience.',
            coverImage: foundBook.coverImage || foundBook.thumbnail || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
          })
        } else {
          // Fallback to Void Spire mockup preset if ID is slug or offline
          setBook({
            _id: id,
            slug: id || 'the-void-spire',
            title: 'The Void Spire',
            author: 'Arthur Vance',
            coverAuthor: 'ELARA VANCE',
            category: 'Sci-Fi',
            tags: ['SCI-FI', 'MYSTERY', 'SPACE OPERA'],
            rating: 4.8,
            totalReviews: 12400,
            pages: 412,
            publisher: 'Aethelgard Press',
            releaseDate: 'Oct 12, 2142',
            language: 'English',
            description: `In the forgotten edges of the Orion Cygnus arm, humanity's expansion has ground to a halt against an anomaly simply known as The Boundary. For centuries, ships that ventured too close vanished into deep static, leaving behind only fractured telemetry data and haunting whispers on the subspace bands.\n\nCommander Elara Vance, disgraced after the disastrous loss of the exploration vessel Aethelgard, is offered a final, suicidal commission: command a retrofit scout ship and trace a newly discovered signal bleeding through The Boundary. The signal is organized, repeating, and impossibly old. It emanates from a structure massive enough to cast a shadow across a nebula—a structure classified by deep-space probes as the Void Spire.\n\nAs Elara's crew navigates the gravity-warped space surrounding the Spire, they realize the monument isn't just derelict architecture; it is a functioning machine of staggering scale. And it has been waiting. What they uncover within its impossibly vast halls will challenge their understanding of physics, memory, and the true cost of survival in a universe that is far from empty.`,
            coverImage:
              'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
          })
        }
      } catch (err) {
        // Preset fallback for instant display
        setBook({
          _id: id,
          slug: id || 'the-void-spire',
          title: 'The Void Spire',
          author: 'Arthur Vance',
          coverAuthor: 'ELARA VANCE',
          category: 'Sci-Fi',
          tags: ['SCI-FI', 'MYSTERY', 'SPACE OPERA'],
          rating: 4.8,
          totalReviews: 12400,
          pages: 412,
          publisher: 'Aethelgard Press',
          releaseDate: 'Oct 12, 2142',
          language: 'English',
          description: `In the forgotten edges of the Orion Cygnus arm, humanity's expansion has ground to a halt against an anomaly simply known as The Boundary. For centuries, ships that ventured too close vanished into deep static, leaving behind only fractured telemetry data and haunting whispers on the subspace bands.\n\nCommander Elara Vance, disgraced after the disastrous loss of the exploration vessel Aethelgard, is offered a final, suicidal commission: command a retrofit scout ship and trace a newly discovered signal bleeding through The Boundary. The signal is organized, repeating, and impossibly old. It emanates from a structure massive enough to cast a shadow across a nebula—a structure classified by deep-space probes as the Void Spire.\n\nAs Elara's crew navigates the gravity-warped space surrounding the Spire, they realize the monument isn't just derelict architecture; it is a functioning machine of staggering scale. And it has been waiting. What they uncover within its impossibly vast halls will challenge their understanding of physics, memory, and the true cost of survival in a universe that is far from empty.`,
          coverImage:
            'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
        })
      } finally {
        setLoading(false)
      }
    }
    fetchBookDetails()
  }, [id])

  // Fetch reviews
  const fetchReviews = async () => {
    try {
      setReviewsLoading(true)
      const res = await apiClient.get(`/reviews/${id}`)
      if (res.data?.success) {
        setReviews(res.data.data || [])
      }
    } catch (err) {
      console.log('Reviews fetch skipped:', err.message)
    } finally {
      setReviewsLoading(false)
    }
  }

  useEffect(() => {
    if (id) fetchReviews()
  }, [id])

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (!authUser) {
      navigate('/login')
      return
    }
    if (formRating === 0) {
      setFormSubmitError('Please select a star rating')
      return
    }
    try {
      setFormSubmitLoading(true)
      setFormSubmitError('')
      const res = await apiClient.post(`/reviews/${id}`, {
        rating: formRating,
        reviewText: formText,
      })
      if (res.data?.success) {
        setFormText('')
        setFormRating(0)
        fetchReviews()
      }
    } catch (err) {
      setFormSubmitError(err.response?.data?.message || 'Failed to submit review')
    } finally {
      setFormSubmitLoading(false)
    }
  }

  // Similar reads combining presets & backend books
  const similarReads = useMemo(() => {
    if (allBackendBooks && allBackendBooks.length >= 4) {
      return allBackendBooks
        .filter((b) => b._id !== id && b.slug !== id)
        .slice(0, 5)
        .map((b, i) => ({
          id: b._id || b.id,
          slug: b.slug || SIMILAR_READS_PRESET[i % SIMILAR_READS_PRESET.length].slug,
          title: b.title,
          author: b.author || 'Author',
          coverImage: b.coverImage || b.thumbnail || SIMILAR_READS_PRESET[i % SIMILAR_READS_PRESET.length].coverImage,
        }))
    }
    return SIMILAR_READS_PRESET
  }, [allBackendBooks, id])

  const readerUrl = book?.slug ? `/read/${book.slug}` : `/read/${id}`

  const tags = useMemo(() => {
    if (book?.tags && Array.isArray(book.tags) && book.tags.length) return book.tags
    return ['SCI-FI', 'MYSTERY', 'SPACE OPERA']
  }, [book])

  // Table of Contents chapters simulation
  const tableOfContents = useMemo(
    () => [
      { number: '01', title: 'The Boundary Anomaly', length: '18 mins' },
      { number: '02', title: 'The Vessel Aethelgard', length: '24 mins' },
      { number: '03', title: 'Gravity Drift In The Dark', length: '31 mins' },
      { number: '04', title: 'Signal From The Void Spire', length: '29 mins' },
      { number: '05', title: 'The Monolith Awakening', length: '35 mins' },
      { number: '06', title: 'Physics Of The Forgotten', length: '22 mins' },
      { number: '07', title: 'Nebula Protocol', length: '40 mins' },
      { number: '08', title: 'Beyond The Event Horizon', length: '45 mins' },
    ],
    []
  )

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl py-12 px-4 animate-pulse space-y-8">
        <div className="h-8 w-32 bg-slate-800 rounded-full" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5 h-96 bg-slate-800 rounded-3xl" />
          <div className="lg:col-span-7 space-y-4">
            <div className="h-12 w-3/4 bg-slate-800 rounded-2xl" />
            <div className="h-6 w-1/3 bg-slate-800 rounded-xl" />
            <div className="h-32 w-full bg-slate-800 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  const bookRating = Number(book?.averageRating || book?.rating || 4.8).toFixed(1)

  return (
    <>
      <SEO
        title={`${book?.title || 'Book Details'} - LuminaBooks`}
        description={book?.description?.slice(0, 150) || 'Read on LuminaBooks.'}
      />

      <div className="space-y-12 pb-16 pt-2">
        {/* ========================================================================= */}
        {/* 1. TOP BOOK HERO SECTION: 3D TABLET MOCKUP + METADATA & RATINGS          */}
        {/* ========================================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: 3D E-Reader Tablet Bezel */}
          <div className="lg:col-span-5 flex justify-center lg:justify-start">
            <div className="relative w-full max-w-[340px] transition-transform duration-500 hover:scale-[1.02]">
              {/* Outer Tablet Frame */}
              <div className="relative rounded-[2rem] border-4 border-[#1e2436] bg-[#0c101a] p-3.5 shadow-2xl shadow-violet-950/60 ring-1 ring-white/10">
                {/* Tablet Top Header Navigation Simulation */}
                <div className="mb-2 flex items-center justify-between px-3 text-[10px] text-slate-400 font-medium">
                  <div className="flex items-center gap-1.5">
                    <MdMenuBook className="h-3 w-3 text-slate-300" />
                    <span className="text-slate-300 font-semibold">Home</span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px]">
                    <span>Library</span>
                    <span>Settings</span>
                  </div>
                  <div className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                </div>

                {/* Tablet Screen Container */}
                <div className="relative aspect-[3/4.2] w-full overflow-hidden rounded-2xl bg-slate-950 border border-white/5 shadow-inner">
                  <img
                    src={book?.coverImage || getBookThumbnailUrl(book)}
                    onError={applyThumbnailFallback}
                    alt={book?.title}
                    className="h-full w-full object-cover opacity-90"
                  />

                  {/* Gradient Overlay with Book Information Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#090d16] via-[#090d16]/50 to-black/30 p-4 flex flex-col justify-between">
                    {/* Header simulated title */}
                    <div className="text-center pt-1">
                      <p className="text-[12px] font-black uppercase text-white tracking-widest drop-shadow">
                        {book?.title || 'THE VOID SPIRE'}
                      </p>
                      <p className="text-[8px] font-bold text-violet-300 tracking-wider">
                        {book?.coverAuthor || book?.author || 'ELARA VANCE'}
                      </p>
                    </div>

                    {/* Bottom overlay simulation card */}
                    <div className="rounded-xl bg-black/60 p-2.5 backdrop-blur-md border border-white/10 space-y-1.5">
                      <p className="text-[8px] text-slate-400 font-medium">E-book / Audiobook</p>
                      <div className="flex items-center justify-between text-[9px] text-slate-300">
                        <span className="flex items-center gap-1 text-amber-400 font-bold">
                          ★ {bookRating}
                          <span className="text-slate-400 font-normal">(14.7k Ratings)</span>
                        </span>
                      </div>
                      <p className="text-[8px] text-slate-400">
                        Science Fiction | Space Opera • {book?.pages || 512} Pages
                      </p>
                      <div className="flex gap-1.5 pt-1">
                        <Link
                          to={readerUrl}
                          className="flex-1 rounded-md bg-white/15 py-1 text-center text-[9px] font-bold text-white hover:bg-white/25"
                        >
                          Read Now (Sample)
                        </Link>
                        <button
                          type="button"
                          onClick={toggleBookmark}
                          className="rounded-md bg-white/10 px-2 py-1 text-[9px] font-semibold text-slate-300 hover:bg-white/20"
                        >
                          {isSaved ? 'Saved' : 'Add to Library'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Title, Category Pills, Rating Bar & Action Buttons */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                {book?.title || 'The Void Spire'}
              </h1>
              <p className="mt-1.5 text-base sm:text-lg font-medium text-slate-400">
                {book?.author || 'Arthur Vance'}
              </p>
            </div>

            {/* Category / Genre Pills */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="rounded-full border border-white/[0.08] bg-[#141828] px-3.5 py-1 text-[10px] font-bold tracking-wider text-slate-300 uppercase"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Rating Box with Distribution Bars */}
            <div className="flex items-center gap-6 py-2">
              {/* Big Rating Number */}
              <div className="flex flex-col items-center justify-center">
                <span className="text-4xl sm:text-5xl font-black text-white leading-none">
                  {bookRating}
                </span>
                <div className="mt-2 flex items-center gap-1 text-pink-400 text-sm">
                  {[...Array(5)].map((_, i) => (
                    <MdStar key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <span className="mt-1 text-[11px] text-slate-400 font-medium">
                  {book?.totalReviews ? `${(book.totalReviews / 1000).toFixed(1)}k` : '12.4k'} Reviews
                </span>
              </div>

              {/* Star Rating Breakdown Bars */}
              <div className="flex-1 max-w-xs space-y-1.5 text-[10px] text-slate-400 font-semibold">
                {[
                  { star: 5, width: '85%', gradient: 'from-violet-500 to-pink-500' },
                  { star: 4, width: '15%', gradient: 'from-violet-500/70 to-pink-500/70' },
                  { star: 3, width: '4%', gradient: 'from-slate-600 to-slate-600' },
                  { star: 2, width: '2%', gradient: 'from-slate-600 to-slate-600' },
                  { star: 1, width: '1%', gradient: 'from-slate-600 to-slate-600' },
                ].map((row) => (
                  <div key={row.star} className="flex items-center gap-2">
                    <span className="w-2">{row.star}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1b2034]">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${row.gradient}`}
                        style={{ width: row.width }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons: Read Now & Bookmark */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to={readerUrl}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#c4b5fd] hover:bg-[#d8b4fe] px-8 py-3.5 text-sm font-bold text-[#090d16] shadow-xl shadow-purple-950/40 transition duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <MdMenuBook className="h-4 w-4" />
                <span>Read Now</span>
              </Link>

              <button
                type="button"
                onClick={toggleBookmark}
                className={`inline-flex items-center justify-center gap-2 rounded-full border px-8 py-3.5 text-sm font-semibold transition duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                  isSaved
                    ? 'border-pink-500/50 bg-pink-500/15 text-pink-300'
                    : 'border-white/15 bg-white/5 hover:bg-white/10 text-white'
                }`}
              >
                {isSaved ? <MdBookmark className="h-4 w-4 text-pink-400" /> : <MdBookmarkBorder className="h-4 w-4" />}
                <span>{isSaved ? 'Bookmarked' : 'Bookmark'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. TABBED SECTION: SUMMARY / TABLE OF CONTENTS / REVIEWS                  */}
        {/* ========================================================================= */}
        <section className="space-y-6 pt-4 border-t border-white/[0.08]">
          {/* Tab Navigation Header */}
          <div className="flex items-center gap-8 border-b border-white/[0.06] pb-3 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`relative py-1 transition-colors ${
                activeTab === 'summary' ? 'text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Summary</span>
              {activeTab === 'summary' && (
                <motion.div
                  layoutId="detailTab"
                  className="absolute -bottom-3 left-0 right-0 h-0.5 rounded-full bg-white"
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('toc')}
              className={`relative py-1 transition-colors ${
                activeTab === 'toc' ? 'text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Table of Contents</span>
              {activeTab === 'toc' && (
                <motion.div
                  layoutId="detailTab"
                  className="absolute -bottom-3 left-0 right-0 h-0.5 rounded-full bg-white"
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`relative py-1 transition-colors ${
                activeTab === 'reviews' ? 'text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Reviews</span>
              {activeTab === 'reviews' && (
                <motion.div
                  layoutId="detailTab"
                  className="absolute -bottom-3 left-0 right-0 h-0.5 rounded-full bg-white"
                />
              )}
            </button>
          </div>

          {/* TAB 1: SUMMARY */}
          {activeTab === 'summary' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Rich Multi-paragraph Synopsis */}
              <div className="lg:col-span-8 space-y-4 text-sm leading-relaxed text-slate-300">
                {(book?.description || '')
                  .split('\n\n')
                  .filter(Boolean)
                  .map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
              </div>

              {/* Right Column: Book Details Card */}
              <div className="lg:col-span-4 rounded-2xl border border-white/[0.08] bg-[#121624]/90 p-5 shadow-xl shadow-black/40 backdrop-blur-xl">
                <h3 className="text-sm font-bold text-white mb-4">Book Details</h3>

                <div className="space-y-3.5 text-xs">
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
                    <span className="text-slate-400">Length</span>
                    <span className="font-semibold text-white">{book?.pages || 412} Pages</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
                    <span className="text-slate-400">Publisher</span>
                    <span className="font-semibold text-white">{book?.publisher || 'Aethelgard Press'}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
                    <span className="text-slate-400">Release Date</span>
                    <span className="font-semibold text-white">{book?.releaseDate || 'Oct 12, 2142'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Language</span>
                    <span className="font-semibold text-white">{book?.language || 'English'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TABLE OF CONTENTS */}
          {activeTab === 'toc' && (
            <div className="max-w-3xl space-y-3">
              {tableOfContents.map((chap) => (
                <div
                  key={chap.number}
                  className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-[#121624]/80 p-3.5 transition hover:border-violet-500/30 hover:bg-[#151a2d]"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono font-bold text-violet-400">{chap.number}</span>
                    <span className="text-sm font-semibold text-white">{chap.title}</span>
                  </div>
                  <span className="text-xs text-slate-400">{chap.length}</span>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: REVIEWS */}
          {activeTab === 'reviews' && (
            <div className="max-w-3xl space-y-6">
              {/* Review Submission Box */}
              <form onSubmit={handleSubmitReview} className="rounded-2xl border border-white/[0.08] bg-[#121624]/90 p-5 space-y-4">
                <h4 className="text-sm font-bold text-white">Leave a Review</h4>

                {/* Interactive Star Picker */}
                <div className="flex items-center gap-1 text-2xl">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setFormHoverRating(star)}
                      onMouseLeave={() => setFormHoverRating(0)}
                      onClick={() => setFormRating(star)}
                      className="text-pink-400 hover:scale-110 transition"
                    >
                      {star <= (formHoverRating || formRating) ? <MdStar /> : <MdStarBorder />}
                    </button>
                  ))}
                  {formRating > 0 && <span className="ml-2 text-xs font-bold text-slate-300">{formRating} / 5</span>}
                </div>

                <textarea
                  rows="3"
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  placeholder="Share your thoughts on this book..."
                  className="w-full rounded-xl border border-white/10 bg-[#0a0d16] p-3 text-xs text-white placeholder:text-slate-500 outline-none focus:border-violet-400"
                />

                {formSubmitError && <p className="text-xs text-rose-400">{formSubmitError}</p>}

                <button
                  type="submit"
                  disabled={formSubmitLoading}
                  className="rounded-full bg-violet-600 hover:bg-violet-500 px-6 py-2 text-xs font-bold text-white transition disabled:opacity-50"
                >
                  {formSubmitLoading ? 'Submitting...' : 'Post Review'}
                </button>
              </form>

              {/* Reviews List */}
              <div className="space-y-3">
                {reviews.length === 0 ? (
                  <p className="text-xs text-slate-400">No community reviews yet. Be the first to leave one!</p>
                ) : (
                  reviews.map((r, i) => (
                    <div key={i} className="rounded-xl border border-white/[0.06] bg-[#121624]/60 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{r.user?.username || 'Reader'}</span>
                        <div className="flex items-center text-pink-400 text-xs">
                          {[...Array(r.rating || 5)].map((_, idx) => (
                            <MdStar key={idx} />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{r.reviewText}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* 3. SIMILAR READS CAROUSEL                                                 */}
        {/* ========================================================================= */}
        <section className="space-y-4 pt-6 border-t border-white/[0.08]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-white">Similar Reads</h2>
            <Link to="/books" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-violet-300 transition">
              <span>View All</span>
              <MdArrowForward className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {similarReads.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/read/${item.slug}`)}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121624] p-3 transition-all duration-300 hover:-translate-y-1.5 hover:border-violet-500/40 hover:bg-[#161b2c] hover:shadow-xl shadow-black/50"
              >
                {/* Digital Tablet Bezel Simulation */}
                <div className="relative aspect-[3/4.4] w-full overflow-hidden rounded-xl border border-white/5 bg-slate-950 p-2 shadow-inner">
                  <img
                    src={item.coverImage}
                    alt={item.title}
                    className="h-full w-full object-cover rounded-lg opacity-85 transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Overlay Title */}
                  <div className="absolute inset-x-2 bottom-2 rounded-lg bg-black/60 p-2 backdrop-blur-sm text-center">
                    <p className="text-[9px] font-black uppercase text-white tracking-wide truncate">
                      {item.coverTitle || item.title}
                    </p>
                    <p className="text-[7px] font-semibold text-violet-300 truncate mt-0.5">
                      {item.coverAuthor || item.author}
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <h4 className="text-xs font-bold text-white group-hover:text-violet-300 transition truncate">
                    {item.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate">{item.author}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
