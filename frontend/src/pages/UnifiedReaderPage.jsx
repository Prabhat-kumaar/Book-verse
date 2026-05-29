import { Suspense, lazy, useMemo } from 'react'

const PdfReaderPage = lazy(() => import('./PdfReaderPage'))
const EpubReaderPage = lazy(() => import('./EpubReaderPage'))

function getReaderTypeFromHash(hash) {
  const queryString = hash.includes('?') ? hash.split('?')[1] : ''
  const params = new URLSearchParams(queryString)
  const fileType = (params.get('fileType') || '').toLowerCase()
  const fileUrl = (params.get('fileUrl') || params.get('pdf') || '').toLowerCase()
  if (fileType === 'epub' || fileUrl.endsWith('.epub')) return 'epub'
  return 'pdf'
}

export default function UnifiedReaderPage() {
  const readerType = useMemo(() => getReaderTypeFromHash(window.location.hash || ''), [])
  return (
    <div className="min-h-screen w-full animate-reader-fade-up">
      <Suspense
        fallback={(
          <div className="grid min-h-screen place-items-center bg-slate-950 text-sm text-slate-300">
            Loading reader...
          </div>
        )}
      >
        {readerType === 'epub' ? <EpubReaderPage /> : <PdfReaderPage />}
      </Suspense>
    </div>
  )
}
