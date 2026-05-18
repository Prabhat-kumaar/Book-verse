import { normalizeMediaUrl } from './mediaUrls'

export function getBookFileUrl(book) {
  const fileUrl = normalizeMediaUrl(book?.fileUrl)
  if (fileUrl) return fileUrl
  if (book?.filename) return normalizeMediaUrl(`/uploads/${book.filename}`)
  return normalizeMediaUrl(book?.pdf || '')
}

export function getBookFileType(book) {
  if (book?.fileType === 'epub') return 'epub'
  if (book?.fileType === 'pdf') return 'pdf'
  const url = (getBookFileUrl(book) || '').toLowerCase()
  return url.endsWith('.epub') ? 'epub' : 'pdf'
}

export function buildReaderHash(book, page) {
  let resolvedPage = page
  let resumeCfi = ''
  if (typeof page === 'object' && page !== null) {
    resolvedPage = page.page
    resumeCfi = page.cfi || ''
  }

  const fileType = getBookFileType(book)
  const params = new URLSearchParams({
    bookId: book?._id || '',
    fileUrl: getBookFileUrl(book),
    fileType,
    title: book?.title || '',
    author: book?.author || '',
  })
  if (Number.isInteger(resolvedPage) && resolvedPage > 0) {
    params.set('page', String(resolvedPage))
  }
  if (resumeCfi) {
    params.set('cfi', resumeCfi)
  }
  return `#reader?${params.toString()}`
}
