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

export function buildReaderHash(book) {
  const slug = String(book?.slug || '').trim()
  if (slug) return `/read/${encodeURIComponent(slug)}`

  return book?._id ? `/book/${book._id}` : '/books'
}
