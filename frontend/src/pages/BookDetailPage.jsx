import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MdChevronLeft, MdBook, MdTimer, MdLanguage, MdVisibility, MdFolderOpen } from 'react-icons/md'
import apiClient from '../lib/apiClient'
import { getBookThumbnailUrl, applyThumbnailFallback } from '../lib/mediaUrls'
import { buildReaderHash } from '../lib/readerLink'
import SEO from '../components/SEO'
import SaveBookHeart from '../components/SaveBookHeart'

const getCategoryColorStyles = (category) => {
  const cat = (category || '').toString().trim().toLowerCase()
  if (cat.includes('business') || cat.includes('finance')) {
    return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
  }
  if (cat.includes('programming') || cat.includes('code') || cat.includes('software')) {
    return 'bg-blue-500/10 border-blue-500/20 text-blue-400'
  }
  if (cat.includes('self') || cat.includes('psychology')) {
    return 'bg-purple-500/10 border-purple-500/20 text-purple-400'
  }
  if (cat.includes('productivity') || cat.includes('time')) {
    return 'bg-amber-500/10 border-amber-500/20 text-amber-400'
  }
  if (cat.includes('startup') || cat.includes('entrepreneur')) {
    return 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
  }
  if (cat.includes('design') || cat.includes('art')) {
    return 'bg-pink-500/10 border-pink-500/20 text-pink-400'
  }
  if (cat.includes('ai') || cat.includes('artificial') || cat.includes('machine')) {
    return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
  }
  return 'bg-slate-500/10 border-slate-500/20 text-slate-400'
}

const getDifficultyStyles = (difficulty) => {
  const diff = (difficulty || '').toString().trim().toLowerCase()
  if (diff === 'beginner') return 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300'
  if (diff === 'intermediate') return 'bg-amber-500/15 border-amber-500/25 text-amber-300'
  if (diff === 'advanced') return 'bg-rose-500/15 border-rose-500/25 text-rose-300'
  return 'bg-indigo-500/15 border-indigo-500/25 text-indigo-300' // default
}

function SkeletonLoader() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 md:py-16 text-slate-100 animate-pulse">
      <div className="h-6 w-24 bg-slate-800 rounded-full mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start">
        {/* Cover Skeleton */}
        <div className="md:col-span-4 flex flex-col items-center">
          <div className="aspect-[3/4] w-full max-w-[280px] rounded-3xl bg-slate-800 shadow-2xl" />
          <div className="h-6 w-32 bg-slate-800 rounded-full mt-4" />
        </div>
        {/* Details Skeleton */}
        <div className="md:col-span-8 space-y-6">
          <div className="space-y-3">
            <div className="h-10 w-3/4 bg-slate-800 rounded-2xl" />
            <div className="h-5 w-1/3 bg-slate-800 rounded-xl" />
          </div>
          <div className="flex gap-3">
            <div className="h-6 w-20 bg-slate-800 rounded-full" />
            <div className="h-6 w-24 bg-slate-800 rounded-full" />
          </div>
          <div className="h-24 w-full bg-slate-800 rounded-2xl" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-16 bg-slate-800 rounded-2xl" />
            <div className="h-16 bg-slate-800 rounded-2xl" />
            <div className="h-16 bg-slate-800 rounded-2xl" />
          </div>
          <div className="flex gap-4">
            <div className="h-12 w-40 bg-slate-800 rounded-xl" />
            <div className="h-12 w-40 bg-slate-800 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BookDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [book, setBook] = useState(null)
  const [relatedBooks, setRelatedBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        setLoading(true)
        setError('')
        const response = await apiClient.get(`/books/${id}`)
        if (response.data?.success) {
          setBook(response.data.data)
        } else {
          setError('Book details could not be retrieved.')
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load book details.')
      } finally {
        setLoading(false)
      }
    }
    fetchBookDetails()
  }, [id])

  useEffect(() => {
    if (!book?.category) return
    const fetchRelated = async () => {
      try {
        const response = await apiClient.get('/books', { params: { category: book.category } })
        const payload = response.data
        const allBooks = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.books)
            ? payload.books
            : Array.isArray(payload?.data)
              ? payload.data
              : []
        // Filter out current book and limit to 5
        const filtered = allBooks
          .filter(b => b._id !== book._id)
          .slice(0, 5)
        setRelatedBooks(filtered)
      } catch (err) {
        console.error('Failed to load related books:', err)
      }
    }
    fetchRelated()
  }, [book])

  const readerLink = useMemo(() => {
    if (!book) return '#'
    return buildReaderHash(book)
  }, [book])

  // Estimating pages and reading times safely
  const pageCount = useMemo(() => {
    if (!book) return 0
    return book.pages || book.totalPages || (book.fileType === 'pdf' ? 180 : 240)
  }, [book])

  const estimatedReadTime = useMemo(() => {
    return pageCount * 2 // 2 minutes per page
  }, [pageCount])

  const bookSchema = useMemo(() => {
    if (!book) return null
    return {
      "@context": "https://schema.org",
      "@type": "Book",
      "name": book.title,
      "author": {
        "@type": "Person",
        "name": book.author || 'Unknown Author'
      },
      "image": getBookThumbnailUrl(book),
      "description": book.description || `Read ${book.title} by ${book.author} on Readify AI free online.`,
      "workExample": {
        "@type": "Book",
        "name": book.title,
        "bookFormat": "https://schema.org/EBook",
        "potentialAction": {
          "@type": "ReadAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": `https://readifyai.vercel.app/#reader?bookId=${book._id}`
          }
        }
      }
    }
  }, [book])

  if (loading) {
    return <SkeletonLoader />
  }

  if (error || !book) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4 text-center">
        <p className="text-rose-400 font-medium mb-4">{error || 'Book not found'}</p>
        <button
          type="button"
          onClick={() => navigate('/books')}
          className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
        >
          <MdChevronLeft className="text-lg" />
          Back to Explorations
        </button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      transition={{ duration: 0.35 }}
      className="mx-auto w-full max-w-6xl text-slate-100 bg-slate-950"
    >
      <SEO
        title={`${book.title} by ${book.author} - Readify AI`}
        description={book.description || `Read ${book.title} by ${book.author} online. Readify AI offers the ultimate streamlined reading experience with full formatting controls.`}
        image={getBookThumbnailUrl(book)}
        path={`/book/${book._id}`}
        schema={bookSchema}
      />

      {/* Mobile Top Header Backdrop (Cover Image) */}
      <div className="relative md:hidden w-full aspect-[4/3] sm:aspect-[16/9] overflow-hidden bg-slate-950">
        <img
          src={getBookThumbnailUrl(book)}
          onError={applyThumbnailFallback}
          alt={`Cover background of ${book.title}`}
          className="absolute inset-0 h-full w-full object-cover blur-md opacity-30 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="relative aspect-[3/4] h-[85%] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/15">
            <img
              loading="lazy"
              src={getBookThumbnailUrl(book)}
              onError={applyThumbnailFallback}
              alt={`Cover of ${book.title}`}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-6 md:py-16">
        {/* Navigation Breadcrumb */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-4 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 mb-8"
        >
          <MdChevronLeft className="text-base" />
          Go Back
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start">
          {/* Desktop Left Column Cover */}
          <div className="hidden md:block md:col-span-4 lg:col-span-4 flex flex-col items-center">
            <div className="relative aspect-[3/4] w-full max-w-[280px] overflow-hidden rounded-3xl bg-slate-950/50 shadow-2xl ring-1 ring-white/15 transition-transform duration-300 hover:scale-[1.01]">
              <img
                loading="lazy"
                src={getBookThumbnailUrl(book)}
                onError={applyThumbnailFallback}
                alt={`Cover art for ${book.title}`}
                className="h-full w-full object-cover"
              />
            </div>
            {book.category && (
              <span className={`mt-4 inline-flex items-center rounded-full border px-4 py-1 text-xs font-bold uppercase tracking-wider ${getCategoryColorStyles(book.category)}`}>
                {book.category}
              </span>
            )}
          </div>

          {/* Right Column details */}
          <div className="md:col-span-8 lg:col-span-8 space-y-6">
            <div>
              {/* Badges on Mobile */}
              <div className="flex flex-wrap gap-2 mb-3 md:hidden">
                {book.category && (
                  <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getCategoryColorStyles(book.category)}`}>
                    {book.category}
                  </span>
                )}
                {book.difficulty && (
                  <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getDifficultyStyles(book.difficulty)}`}>
                    {book.difficulty}
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight text-white mb-2">
                {book.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-base text-slate-400">
                  By <strong className="text-slate-300 font-semibold">{book.author || 'Unknown Author'}</strong>
                </p>
                {/* Desktop Difficulty Badge */}
                {book.difficulty && (
                  <span className={`hidden md:inline-flex items-center rounded-full border px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getDifficultyStyles(book.difficulty)}`}>
                    {book.difficulty}
                  </span>
                )}
              </div>
            </div>

            {/* Tags Pills Section */}
            {book.tags && book.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {book.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-xl bg-slate-900 border border-white/5 hover:border-indigo-500/20 px-3 py-1 text-xs font-medium text-slate-300 transition duration-200 cursor-default"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Book Description */}
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-white tracking-wide">Description</h2>
              <p className="text-sm leading-relaxed text-slate-300 whitespace-pre-line font-medium bg-white/[0.02] border border-white/5 rounded-2xl p-4 sm:p-5">
                {book.description || 'No description has been added for this book yet.'}
              </p>
            </div>

            {/* High-Fidelity Stats Grid */}
            <div className="grid grid-cols-3 gap-4 border-y border-white/10 py-5">
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                <MdBook className="text-xl text-indigo-400 mb-1" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Pages</span>
                <span className="text-sm sm:text-base font-extrabold text-white mt-0.5">{pageCount}</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                <MdTimer className="text-xl text-amber-400 mb-1" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Read Time</span>
                <span className="text-sm sm:text-base font-extrabold text-white mt-0.5">{estimatedReadTime}m</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                <MdVisibility className="text-xl text-cyan-400 mb-1" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Read Count</span>
                <span className="text-sm sm:text-base font-extrabold text-white mt-0.5">{book.openCount || 0}</span>
              </div>
            </div>

            {/* Book Properties (Language, Format) */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-slate-400">
              {book.language && (
                <div className="flex items-center gap-1.5">
                  <MdLanguage className="text-emerald-400 text-sm" />
                  <span>Language: {book.language}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <MdFolderOpen className="text-violet-400 text-sm" />
                <span>Format: {book.fileType?.toUpperCase() || 'EBook'}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <a
                href={readerLink}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/10 hover:from-indigo-600 hover:to-violet-700 hover:shadow-indigo-500/20 hover:scale-[1.01] transition duration-200"
              >
                Start Reading Book
              </a>
              <SaveBookHeart
                bookId={book._id}
                book={book}
                asButton={true}
                className="w-full sm:w-auto"
              />
            </div>
          </div>
        </div>

        {/* Related Books Section */}
        {relatedBooks.length > 0 && (
          <div className="mt-16 pt-8 border-t border-white/10 animate-[fadeIn_350ms_ease-out]">
            <h3 className="text-xl font-bold text-white mb-6 tracking-tight">More in {book.category}</h3>
            
            <div className="flex overflow-x-auto md:grid md:grid-cols-4 lg:grid-cols-5 gap-6 pb-4 scrollbar-none snap-x snap-mandatory">
              {relatedBooks.map((item) => (
                <div 
                  key={item._id} 
                  onClick={() => {
                    navigate(`/book/${item._id}`);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="group min-w-[160px] max-w-[160px] md:min-w-0 md:max-w-none snap-start cursor-pointer transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-white/10 relative shadow-md group-hover:ring-white/20 group-hover:shadow-indigo-500/10">
                    <img
                      loading="lazy"
                      src={getBookThumbnailUrl(item)}
                      onError={applyThumbnailFallback}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <h4 className="mt-3 truncate text-sm font-bold text-white leading-tight group-hover:text-indigo-400 transition-colors">
                    {item.title}
                  </h4>
                  <p className="truncate text-xs text-slate-400 mt-0.5">{item.author}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
