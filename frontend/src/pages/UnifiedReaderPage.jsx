import { Suspense, lazy, useMemo } from 'react'
import SEO from '../components/SEO'

const CHUNK_RELOAD_KEY = 'readify_reader_chunk_reload_at'
const CHUNK_RELOAD_TTL_MS = 30000

function isChunkLoadError(error) {
  const message = String(error?.message || error || '')
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(message)
}

function shouldReloadForChunkError() {
  try {
    const lastReloadAt = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0)
    if (lastReloadAt && Date.now() - lastReloadAt < CHUNK_RELOAD_TTL_MS) return false
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()))
    return true
  } catch {
    return true
  }
}

function lazyWithRetry(importer) {
  return lazy(() => importer().catch((error) => {
    if (isChunkLoadError(error) && shouldReloadForChunkError()) {
      window.location.reload()
      return new Promise(() => { })
    }
    throw error
  }))
}

const PdfReaderPage = lazyWithRetry(() => import('./PdfReaderPage'))
const EpubReaderPage = lazyWithRetry(() => import('./EpubReaderPage'))

function getReaderTypeFromBook(book) {
  const fileType = (book?.fileType || '').toLowerCase()
  const fileUrl = (book?.fileUrl || book?.pdf || '').toLowerCase()
  if (fileType === 'epub' || fileUrl.endsWith('.epub')) return 'epub'
  return 'pdf'
}

function getReaderTypeFromHash(hash) {
  const queryString = hash.includes('?') ? hash.split('?')[1] : ''
  const params = new URLSearchParams(queryString)
  const fileType = (params.get('fileType') || '').toLowerCase()
  const fileUrl = (params.get('fileUrl') || params.get('pdf') || '').toLowerCase()
  if (fileType === 'epub' || fileUrl.endsWith('.epub')) return 'epub'
  return 'pdf'
}

export default function UnifiedReaderPage({ book = null }) {
  const readerType = useMemo(
    () => (book ? getReaderTypeFromBook(book) : getReaderTypeFromHash(window.location.hash || '')),
    [book],
  )
  return (
    <div className="min-h-screen w-full animate-reader-fade-up">
      {!book && (
        <SEO
          title="Reader - Readify AI"
          description="Read classic books online free with the Readify AI reader. Experience fast, distraction-free EPUB and PDF reading with bookmarks and progress tracking tools."
          path="/reader"
        />
      )}
      <Suspense
        fallback={(
          <div className="grid min-h-screen place-items-center bg-slate-950 text-sm text-slate-300">
            Loading reader...
          </div>
        )}
      >
        {readerType === 'epub' ? <EpubReaderPage book={book} /> : <PdfReaderPage book={book} />}
      </Suspense>
    </div>
  )
}