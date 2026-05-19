const isBrowser = typeof window !== 'undefined'

function normalizeOrigin(url = '') {
  const trimmed = String(url || '').trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  return trimmed.replace(/\/api$/i, '')
}

function isTemplateOrigin(origin = '') {
  const value = String(origin || '').toLowerCase()
  return (
    !value ||
    value.includes('your-render-service.onrender.com') ||
    value.includes('your-vercel-app.vercel.app') ||
    /<[^>]+>/.test(value)
  )
}

function isLocalHost(hostname = '') {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

const rawEnvOrigin = normalizeOrigin(import.meta.env.VITE_API_URL)
const envOrigin = isTemplateOrigin(rawEnvOrigin) ? '' : rawEnvOrigin

const browserFallbackOrigin = (() => {
  if (!isBrowser) return ''
  const { protocol, hostname, port } = window.location
  if (!isLocalHost(hostname)) return ''
  if (import.meta.env.DEV && port === '5173') {
    return `${protocol}//${hostname}:5000`
  }
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`
})()

export const API_ORIGIN = envOrigin || browserFallbackOrigin
export const API_URL = API_ORIGIN ? `${API_ORIGIN}/api` : '/api'

if (!envOrigin && !import.meta.env.DEV) {
  console.warn(
    '[apiConfig] VITE_API_URL is not set for production. Configure it to your Render backend URL.',
  )
}

export function buildApiUrl(path = '') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const withoutApiPrefix = normalizedPath.replace(/^\/api(?=\/|$)/i, '') || '/'
  return `${API_URL}${withoutApiPrefix === '/' ? '' : withoutApiPrefix}`
}
