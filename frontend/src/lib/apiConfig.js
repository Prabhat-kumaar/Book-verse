const RAILWAY_BACKEND_ORIGIN = 'https://book-verse-production.up.railway.app'

function normalizeOrigin(url = '') {
  const trimmed = String(url || '').trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  return trimmed.replace(/\/api$/i, '')
}

const envOrigin = normalizeOrigin(import.meta.env.VITE_API_URL)

// Safety guard: when env is missing or accidentally points to Vercel frontend,
// force backend origin to Railway so deployed builds still call the API server.
const isVercelHost = (() => {
  if (!envOrigin) return false
  try {
    return /\.vercel\.app$/i.test(new URL(envOrigin).hostname)
  } catch {
    return true
  }
})()

const shouldUseRailway = !envOrigin || isVercelHost

export const API_ORIGIN = shouldUseRailway ? RAILWAY_BACKEND_ORIGIN : envOrigin
export const API_URL = `${API_ORIGIN}/api`

export function buildApiUrl(path = '') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const withoutApiPrefix = normalizedPath.replace(/^\/api(?=\/|$)/i, '') || '/'
  return `${API_URL}${withoutApiPrefix === '/' ? '' : withoutApiPrefix}`
}
