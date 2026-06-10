import { API_ORIGIN } from './apiConfig'

function resolveAbsoluteUploadPath(path) {
  const sanitized = path.startsWith('/') ? path : `/${path}`
  return API_ORIGIN ? `${API_ORIGIN}${sanitized}` : sanitized
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

export function stripCloudinaryTransforms(url = '') {
  if (!url || !url.includes('res.cloudinary.com')) return url
  let cleaned = url
  // Match and replace any transform segment immediately following /upload/
  // A transform segment starts with 1-2 letters/numbers followed by an underscore (e.g. w_, h_, c_, q_, f_, fl_, pg_)
  const regex = /\/upload\/(?:[a-z0-9]{1,2}_[^/]+)\//i
  while (regex.test(cleaned)) {
    cleaned = cleaned.replace(regex, '/upload/')
  }
  return cleaned
}

function optimizeCloudinaryThumbnail(url = '') {
  if (!url.includes('res.cloudinary.com')) return url
  const cleanUrl = stripCloudinaryTransforms(url)
  return cleanUrl.replace('/upload/', '/upload/w_400,h_600,c_fill,q_auto,f_auto/')
}

export function getBookThumbnailUrl(bookOrUrl) {
  const rawUrl = typeof bookOrUrl === 'string'
    ? bookOrUrl
    : bookOrUrl?.thumbnail || ''
  const normalizedUrl = normalizeMediaUrl(rawUrl)
  if (normalizedUrl) return optimizeCloudinaryThumbnail(normalizedUrl)
  return FALLBACK_THUMBNAIL
}

export function applyThumbnailFallback(event) {
  const img = event?.currentTarget
  if (!img) return
  if (img.src === FALLBACK_THUMBNAIL) return
  img.src = FALLBACK_THUMBNAIL
}
