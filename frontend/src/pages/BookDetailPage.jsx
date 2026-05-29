import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MdChevronLeft, MdBook, MdTimer, MdLanguage } from 'react-icons/md'
import apiClient from '../lib/apiClient'
import { getBookThumbnailUrl, applyThumbnailFallback } from '../lib/mediaUrls'
import { buildReaderHash } from '../lib/readerLink'
import SEO from '../components/SEO'

export default function BookDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [book, setBook] = useState(null)
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
    };
    fetchBookDetails()
  }, [id])

  const readerLink = useMemo(() => {
    if (!book) return '#'
    return buildReaderHash(book)
  }, [book])

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
    return (
      <div className="min-h-screen grid place-items-center bg-slate-950 text-slate-200">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-sm font-semibold tracking-wider opacity-60">Loading book details...</p>
        </div>
      </div>
    )
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
      className="mx-auto mt-6 w-full max-w-5xl px-4 sm:px-6 pb-24 text-slate-100"
    >
      <SEO
        title={`${book.title} by ${book.author} - Readify AI`}
        description={book.description || `Read ${book.title} by ${book.author} online. Readify AI offers the ultimate streamlined reading experience with full formatting controls.`}
        image={getBookThumbnailUrl(book)}
        path={`/book/${book._id}`}
        schema={bookSchema}
      />

      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-4 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 mb-6"
      >
        <MdChevronLeft className="text-base" />
        Go Back
      </button>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start">
        {/* Book Cover Cover */}
        <div className="md:col-span-4 flex flex-col items-center">
          <div className="relative aspect-[3/4] w-full max-w-[280px] overflow-hidden rounded-2xl bg-slate-950/50 shadow-2xl ring-1 ring-white/15">
            <img
              loading="lazy"
              src={getBookThumbnailUrl(book)}
              onError={applyThumbnailFallback}
              alt={`Cover art for the book ${book.title} by ${book.author}`}
              className="h-full w-full object-cover shadow-2xl"
            />
          </div>
          {book.category && (
            <span className="mt-4 inline-flex items-center rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-xs font-bold text-indigo-400">
              {book.category}
            </span>
          )}
        </div>

        {/* Book Info Panel */}
        <div className="md:col-span-8 space-y-6">
          <div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight text-white mb-2">
              {book.title}
            </h1>
            <p className="text-lg font-medium text-slate-400">
              By <strong className="text-slate-300 font-semibold">{book.author || 'Unknown Author'}</strong>
            </p>
          </div>

          <div className="flex flex-wrap gap-4 py-2 border-y border-white/10">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <MdBook className="text-base text-indigo-400" />
              <span>Format: {book.fileType?.toUpperCase() || 'EBook'}</span>
            </div>
            {book.language && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <MdLanguage className="text-base text-emerald-400" />
                <span>Language: {book.language}</span>
              </div>
            )}
            {book.difficulty && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <MdTimer className="text-base text-amber-400" />
                <span>Level: {book.difficulty}</span>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-bold text-white mb-2">Description</h2>
            <p className="text-sm leading-relaxed text-slate-300 whitespace-pre-line font-medium">
              {book.description || 'No description has been added for this book yet.'}
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <a
              href={readerLink}
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-8 py-3 text-sm font-bold text-white shadow-lg hover:from-indigo-600 hover:to-violet-700 transition"
            >
              Start Reading Book
            </a>
            <button
              type="button"
              onClick={() => navigate('/books')}
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/10"
            >
              Back to Shelf
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
