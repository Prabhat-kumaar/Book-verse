import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useParams } from 'react-router-dom'
import apiClient from '../lib/apiClient'
import UnifiedReaderPage from './UnifiedReaderPage'

const SITE_NAME = 'Readify AI'
const PRODUCTION_DOMAIN = 'https://readifyai.vercel.app'
const FALLBACK_DESCRIPTION = 'Read this book free online on Readify AI.'

function truncateMeta(value = '', maxLength = 160) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`
}

function absoluteUrl(value = '') {
  if (!value) return ''
  try {
    return new URL(value, window.location.origin).toString()
  } catch {
    return ''
  }
}

function getCanonicalUrl(slug = '') {
  return `${PRODUCTION_DOMAIN}/read/${encodeURIComponent(slug)}/`
}

function buildBookSchema(book, canonicalUrl, imageUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: book.title,
    author: {
      '@type': 'Person',
      name: book.author || 'Unknown Author',
    },
    description: book.description || FALLBACK_DESCRIPTION,
    image: imageUrl || undefined,
    genre: book.category || undefined,
    url: canonicalUrl,
    inLanguage: book.language || undefined,
    workExample: {
      '@type': 'Book',
      bookFormat: book.fileType === 'epub' ? 'EBook' : 'http://schema.org/EBook',
      url: canonicalUrl,
    },
  }
}

export default function BookReadPage() {
  const { bookSlug } = useParams()
  const [book, setBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadBook = async () => {
      try {
        setLoading(true)
        setError('')
        const cleanedSlug = String(bookSlug || '').replace(/\/$/, '')
        const response = await apiClient.get(`/api/books/slug/${encodeURIComponent(cleanedSlug)}`)
        const nextBook = response.data?.data || response.data?.book || response.data

        if (!cancelled) {
          if (nextBook?._id || nextBook?.id) {
            setBook(nextBook)
          } else {
            setError('Book not found.')
          }
        }
      } catch (err) {
        if (!cancelled) {
          const status = err?.response?.status
          setError(status === 404 ? 'Book not found.' : 'Unable to load this book.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (bookSlug) {
      loadBook()
    } else {
      setError('Book not found.')
      setLoading(false)
    }

    return () => {
      cancelled = true
    }
  }, [bookSlug])

  const seo = useMemo(() => {
    if (!book) return null

    const title = book.title || 'Untitled Book'
    const author = book.author || 'Unknown Author'
    const description = truncateMeta(book.description || FALLBACK_DESCRIPTION)
    const canonicalUrl = getCanonicalUrl(book.slug || bookSlug)
    const imageUrl = absoluteUrl(book.coverImage || book.thumbnail || '')
    const keywords = [title, author, book.category, 'read online', 'free book'].filter(Boolean).join(', ')
    const pageTitle = `${title} by ${author} - Read Free Online | ${SITE_NAME}`
    const schema = buildBookSchema({ ...book, title, author }, canonicalUrl, imageUrl)

    return {
      pageTitle,
      description,
      keywords,
      canonicalUrl,
      imageUrl,
      schema,
    }
  }, [book, bookSlug])

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-200">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-indigo-400" />
      </div>
    )
  }

  if (error || !book) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 px-4 text-center text-slate-100">
        <div>
          <h1 className="text-2xl font-bold">Book not found</h1>
          <p className="mt-2 text-sm text-slate-300">{error || 'This book could not be found.'}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {seo && (
        <Helmet>
          <title>{seo.pageTitle}</title>
          <meta name="description" content={seo.description} />
          <meta name="keywords" content={seo.keywords} />
          <meta name="robots" content="index, follow" />
          <link rel="canonical" href={seo.canonicalUrl} />

          <meta property="og:type" content="book" />
          <meta property="og:site_name" content={SITE_NAME} />
          <meta property="og:title" content={seo.pageTitle} />
          <meta property="og:description" content={seo.description} />
          <meta property="og:url" content={seo.canonicalUrl} />
          {seo.imageUrl ? <meta property="og:image" content={seo.imageUrl} /> : null}

          <meta name="twitter:card" content={seo.imageUrl ? 'summary_large_image' : 'summary'} />
          <meta name="twitter:title" content={seo.pageTitle} />
          <meta name="twitter:description" content={seo.description} />
          {seo.imageUrl ? <meta name="twitter:image" content={seo.imageUrl} /> : null}

          <script type="application/ld+json">{JSON.stringify(seo.schema)}</script>
        </Helmet>
      )}
      <UnifiedReaderPage book={book} />
    </>
  )
}
