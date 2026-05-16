import { API_URL } from './apiConfig'

const API = API_URL

function resolveAbsoluteUploadPath(path) {
  const sanitized = path.startsWith('/') ? path : `/${path}`
  return `${API}${sanitized}`
}

export function normalizeMediaUrl(value = '') {
  const raw = (value || '').trim()
  if (!raw) return ''
  if (/^(blob:|data:)/i.test(raw)) return raw
  if (raw.startsWith('/uploads/')) return resolveAbsoluteUploadPath(raw)
  if (raw.startsWith('uploads/')) return resolveAbsoluteUploadPath(raw)

  try {
    const parsed = new URL(raw)
    if (parsed.pathname.startsWith('/uploads/')) {
      return resolveAbsoluteUploadPath(`${parsed.pathname}${parsed.search || ''}`)
    }
    if (/^https?:/i.test(raw)) return raw
  } catch {
    // no-op
  }

  return raw
}

export const FALLBACK_THUMBNAIL =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 900'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%231e3a8a'/><stop offset='100%' stop-color='%234c1d95'/></linearGradient></defs><rect width='600' height='900' fill='url(%23g)'/><g fill='white' fill-opacity='0.9'><rect x='130' y='250' width='340' height='24' rx='12'/><rect x='130' y='295' width='280' height='20' rx='10'/><rect x='130' y='335' width='240' height='20' rx='10'/></g></svg>"

export function getBookThumbnailUrl(bookOrUrl) {
  if (typeof bookOrUrl === 'string') {
    return normalizeMediaUrl(bookOrUrl) || FALLBACK_THUMBNAIL
  }
  return (
    normalizeMediaUrl(bookOrUrl?.thumbnail || '') ||
    FALLBACK_THUMBNAIL
  )
}

export function applyThumbnailFallback(event) {
  const img = event?.currentTarget
  if (!img) return
  if (img.src === FALLBACK_THUMBNAIL) return
  img.src = FALLBACK_THUMBNAIL
}
