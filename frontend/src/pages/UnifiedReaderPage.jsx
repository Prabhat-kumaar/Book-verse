import { useMemo } from 'react'
import PdfReaderPage from './PdfReaderPage'
import EpubReaderPage from './EpubReaderPage'

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
      {readerType === 'epub' ? <EpubReaderPage /> : <PdfReaderPage />}
    </div>
  )
}

