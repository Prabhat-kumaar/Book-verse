import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MdChevronLeft, MdBook, MdTimer, MdLanguage, MdVisibility, MdFolderOpen } from 'react-icons/md'
import apiClient from '../lib/apiClient'
import { getBookThumbnailUrl, applyThumbnailFallback } from '../lib/mediaUrls'
import { buildReaderHash } from '../lib/readerLink'
import SaveBookHeart from '../components/SaveBookHeart'
import EmptyState from '../components/EmptyState'
import OptimizedImage from '../components/OptimizedImage'

const BOOK_SEO_ATTR = 'data-book-detail-seo'
const PRODUCTION_DOMAIN = 'https://readifyai.vercel.app'

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

  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [sortBy, setSortBy] = useState('recent')
  const [visibleReviewsCount, setVisibleReviewsCount] = useState(5)
  const [formRating, setFormRating] = useState(0)
  const [formHoverRating, setFormHoverRating] = useState(0)
  const [formText, setFormText] = useState('')
  const [formSubmitError, setFormSubmitError] = useState('')
  const [formSubmitLoading, setFormSubmitLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const authUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('authUser')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [])

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true)
      const res = await apiClient.get(`/reviews/${id}`, { params: { sortBy } })
      if (res.data?.success) {
        setReviews(res.data.data || [])
      }
    } catch (err) {
      console.error('Failed to load reviews:', err)
    } finally {
      setReviewsLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [id, sortBy])

  const myReview = useMemo(() => {
    if (!authUser || !reviews.length) return null
    return reviews.find((r) => (r.user?._id === authUser._id || r.user === authUser._id))
  }, [reviews, authUser])

  useEffect(() => {
    if (myReview && !isEditing) {
      setFormRating(myReview.rating || 0)
      setFormText(myReview.reviewText || '')
    }
  }, [myReview, isEditing])

  const getFirstName = (username) => {
    if (!username) return 'Anonymous'
    return username.trim().split(/[\s._-]+/)[0]
  }

  const renderFormStars = () => {
    return (
      <div className="flex items-center gap-2 select-none">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = formHoverRating ? star <= formHoverRating : star <= formRating
          return (
            <button
              key={`star-selector-${star}`}
              type="button"
              onMouseEnter={() => setFormHoverRating(star)}
              onMouseLeave={() => setFormHoverRating(0)}
              onClick={() => {
                if (!authUser) {
                  setFormSubmitError('Login to continue')
                  return
                }
                setFormRating(star)
              }}
              className="text-2xl sm:text-3xl focus:outline-none transition-transform active:scale-95 duration-100"
            >
              <span className={isFilled ? 'text-amber-400 font-bold' : 'text-slate-700 font-normal'}>
                {isFilled ? '★' : '☆'}
              </span>
            </button>
          )
        })}
        {formRating > 0 && (
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
            {formRating === 1 ? 'Poor' : formRating === 2 ? 'Fair' : formRating === 3 ? 'Good' : formRating === 4 ? 'Very Good' : 'Excellent'}
          </span>
        )}
      </div>
    )
  }

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (!authUser) {
      setFormSubmitError('Login to continue')
      return
    }
    if (formRating === 0) {
      setFormSubmitError('Please select a rating before submitting')
      return
    }
    try {
      setFormSubmitLoading(true)
      setFormSubmitError('')
      const res = await apiClient.post(`/reviews/${id}`, {
        rating: formRating,
        reviewText: formText
      })
      if (res.data?.success) {
        await fetchReviews()
        const bookDetailsRes = await apiClient.get(`/books/${id}`)
        if (bookDetailsRes.data?.success) {
          setBook(bookDetailsRes.data.data)
        }
        setIsEditing(false)
      }
    } catch (err) {
      setFormSubmitError(err.response?.data?.message || err.message || 'Failed to submit review')
    } finally {
      setFormSubmitLoading(false)
    }
  }

  const handleDeleteReview = async () => {
    if (!window.confirm('Are you sure you want to delete your review?')) return
    try {
      const res = await apiClient.delete(`/reviews/${id}`)
      if (res.data?.success) {
        setFormRating(0)
        setFormText('')
        await fetchReviews()
        const bookDetailsRes = await apiClient.get(`/books/${id}`)
        if (bookDetailsRes.data?.success) {
          setBook(bookDetailsRes.data.data)
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to delete review')
    }
  }

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

  const seoDescription = useMemo(() => {
    return (book?.description || '').slice(0, 160)
  }, [book])

  useEffect(() => {
    if (!book) return undefined

    const previousTitle = document.title
    const bookUrl = `${PRODUCTION_DOMAIN}/book/${book._id}`
    const fullDescription = `${seoDescription} - Read ${book.title} free on Readify AI`
    const taggedSelector = `[${BOOK_SEO_ATTR}="true"]`

    document.querySelectorAll(taggedSelector).forEach((node) => node.remove())
    document.title = `${book.title} by ${book.author} - Read Free on Readify AI`

    const addMetaTag = (attribute, key, content) => {
      const meta = document.createElement('meta')
      meta.setAttribute(attribute, key)
      meta.setAttribute('content', content || '')
      meta.setAttribute(BOOK_SEO_ATTR, 'true')
      document.head.appendChild(meta)
    }

    addMetaTag('name', 'description', fullDescription)
    addMetaTag('name', 'keywords', `${book.title}, ${book.author}, ${book.category}, read online free, epub, ebook`)
    addMetaTag('property', 'og:title', `${book.title} by ${book.author}`)
    addMetaTag('property', 'og:description', seoDescription)
    addMetaTag('property', 'og:image', book.thumbnail)
    addMetaTag('property', 'og:url', bookUrl)
    addMetaTag('property', 'og:type', 'book')
    addMetaTag('name', 'twitter:card', 'summary_large_image')
    addMetaTag('name', 'twitter:title', `${book.title} by ${book.author}`)
    addMetaTag('name', 'twitter:image', book.thumbnail)

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.setAttribute(BOOK_SEO_ATTR, 'true')
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Book',
      name: book.title,
      author: {
        '@type': 'Person',
        name: book.author
      },
      description: book.description,
      image: book.thumbnail,
      genre: book.category,
      inLanguage: book.language || 'English',
      url: bookUrl,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock'
      }
    })
    document.head.appendChild(script)

    return () => {
      document.querySelectorAll(taggedSelector).forEach((node) => node.remove())
      document.title = previousTitle
    }
  }, [book, seoDescription])

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
      {/* Mobile Top Header Backdrop (Cover Image) */}
      <div className="relative md:hidden w-full aspect-[4/3] sm:aspect-[16/9] overflow-hidden bg-slate-950">
        <OptimizedImage
          src={getBookThumbnailUrl(book)}
          onError={applyThumbnailFallback}
          alt={`Cover background of ${book.title}`}
          loading="eager"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover blur-md opacity-30 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="relative aspect-[3/4] h-[85%] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/15">
            <OptimizedImage
              src={getBookThumbnailUrl(book)}
              onError={applyThumbnailFallback}
              alt={`Cover of ${book.title}`}
              loading="eager"
              fetchPriority="high"
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
              <OptimizedImage
                src={getBookThumbnailUrl(book)}
                onError={applyThumbnailFallback}
                alt={`Cover art for ${book.title}`}
                loading="eager"
                fetchPriority="high"
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

              {/* Star rating under author */}
              <div className="mt-2.5 flex items-center gap-2 select-none">
                <div className="flex items-center text-sm text-amber-400 font-bold">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= Math.round(book.averageRating || 0);
                    return <span key={`header-star-${star}`} className="text-base">{isFilled ? '★' : '☆'}</span>;
                  })}
                </div>
                {book.totalReviews > 0 ? (
                  <p className="text-xs font-semibold text-slate-300">
                    <span className="text-sm font-black text-white">{Number(book.averageRating || 0).toFixed(1)}</span>{' '}
                    <span className="text-slate-400 font-medium">({book.totalReviews} {book.totalReviews === 1 ? 'review' : 'reviews'})</span>
                  </p>
                ) : (
                  <p className="text-xs font-semibold text-slate-500 italic">No reviews yet</p>
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

        {/* 6. REVIEWS AND RATINGS SECTION */}
        <div className="mt-16 pt-8 border-t border-white/10 animate-[fadeIn_350ms_ease-out]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Reviews List (Left Column) */}
            <div className="lg:col-span-8 space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    💬 Book Reviews
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Hear from other readers in the community</p>
                </div>
                
                {reviews.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sort by:</span>
                    <div className="inline-flex rounded-lg bg-slate-900 border border-white/5 p-0.5">
                      <button
                        type="button"
                        onClick={() => setSortBy('recent')}
                        className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition-all ${sortBy === 'recent' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                      >
                        Recent
                      </button>
                      <button
                        type="button"
                        onClick={() => setSortBy('rating')}
                        className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition-all ${sortBy === 'rating' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                      >
                        Highest Rated
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {reviewsLoading ? (
                <div className="space-y-4 py-2">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-28 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
                  ))}
                </div>
              ) : reviews.length === 0 ? (
                <EmptyState
                  className="py-12 bg-white/[0.01] border border-white/5 rounded-2xl"
                  icon="💬"
                  title="No reviews yet"
                  description="Be the very first reader to review this book and help others on their reading journey."
                  compact
                />
              ) : (
                <div className="space-y-4">
                  {reviews.slice(0, visibleReviewsCount).map((review) => {
                    const reviewerName = review.user?.username || 'Anonymous';
                    const firstName = getFirstName(reviewerName);
                    const reviewDate = new Date(review.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                    
                    return (
                      <article
                        key={review._id}
                        className="group relative flex flex-col gap-3 rounded-2xl border border-white/5 bg-[#0f1424]/30 p-4 transition duration-300 hover:border-white/10 hover:bg-[#0f1424]/40"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-800 border border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.3)] flex items-center justify-center text-xs font-black text-white bg-gradient-to-br from-indigo-500/30 to-violet-500/30">
                              {review.user?.avatar ? (
                                <img src={review.user.avatar} alt={reviewerName} className="h-full w-full object-cover" />
                              ) : (
                                (firstName?.[0] || 'A').toUpperCase()
                              )}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-white tracking-wide">{firstName}</h4>
                              <p className="text-[9px] text-slate-500 font-semibold mt-0.5">{reviewDate}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center text-xs text-amber-400 select-none">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span key={`review-star-${review._id}-${star}`}>
                                {star <= review.rating ? '★' : '☆'}
                              </span>
                            ))}
                          </div>
                        </div>

                        {review.reviewText && (
                          <p className="text-xs leading-relaxed text-slate-300 font-medium whitespace-pre-line bg-white/[0.01] border border-white/5 rounded-xl p-3">
                            {review.reviewText}
                          </p>
                        )}

                        {authUser && (review.user?._id === authUser._id || review.user === authUser._id) && (
                          <div className="flex items-center gap-3 mt-1 justify-end border-t border-white/5 pt-2">
                            <button
                              type="button"
                              onClick={() => setIsEditing(true)}
                              className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 transition"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={handleDeleteReview}
                              className="text-[10px] font-bold uppercase tracking-wider text-rose-400 hover:text-rose-300 transition"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </article>
                    )
                  })}

                  {reviews.length > visibleReviewsCount && (
                    <button
                      type="button"
                      onClick={() => setVisibleReviewsCount(prev => prev + 5)}
                      className="w-full flex items-center justify-center rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-white transition hover:bg-white/10"
                    >
                      Load More Reviews
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Review Form (Right Column) */}
            <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-slate-950/50 p-5 sm:p-6 backdrop-blur-md">
              <h3 className="text-base font-bold text-white mb-2 tracking-tight">
                {myReview && !isEditing ? 'Your Submitted Review' : myReview ? 'Edit Your Review' : 'Write a Review'}
              </h3>
              <p className="text-[10px] text-slate-400 mb-4 font-semibold leading-relaxed">
                {myReview && !isEditing 
                  ? 'Thank you for reviewing this title. You can modify or delete your feedback at any time.'
                  : 'Share your stars and written thoughts about this book with the community.'}
              </p>

              {formSubmitError && (
                <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 font-semibold leading-normal">
                  {formSubmitError}
                </div>
              )}

              {myReview && !isEditing ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-white/5 bg-[#0f1424]/20 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-amber-400 text-sm select-none">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={`my-review-star-${star}`}>
                            {star <= myReview.rating ? '★' : '☆'}
                          </span>
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        {new Date(myReview.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {myReview.reviewText && (
                      <p className="mt-3 text-xs text-slate-300 font-medium whitespace-pre-line italic">
                        "{myReview.reviewText}"
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-bold text-white transition hover:bg-white/10"
                    >
                      ✏️ Edit Review
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteReview}
                      className="flex-1 rounded-xl border border-rose-500/20 bg-rose-500/10 py-2 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Rating</label>
                    {renderFormStars()}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Review (Optional)</label>
                    <textarea
                      maxLength="500"
                      value={formText}
                      onChange={(e) => setFormText(e.target.value)}
                      className="w-full h-24 rounded-xl border border-white/10 bg-slate-950/65 p-3 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500/50 resize-none font-medium"
                      placeholder="What did you think of the author, pace, or key insights? (max 500 characters)"
                    />
                    <div className="flex justify-between mt-1 text-[9px] font-bold text-slate-500">
                      <span>{formText.length}/500</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    {myReview && isEditing && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="flex-1 rounded-xl border border-white/10 bg-transparent py-2 text-xs font-bold text-white transition hover:bg-white/5"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={formSubmitLoading}
                      className="flex-1 rounded-xl bg-indigo-600 py-2 text-xs font-bold text-white shadow-md transition hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {formSubmitLoading ? 'Saving...' : myReview ? 'Update Review' : 'Submit Review'}
                    </button>
                  </div>
                </form>
              )}
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
                    <OptimizedImage
                      src={getBookThumbnailUrl(item)}
                      onError={applyThumbnailFallback}
                      alt={item.title}
                      loading="lazy"
                      fetchPriority="low"
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
