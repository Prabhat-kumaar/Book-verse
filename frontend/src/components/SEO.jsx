import { Helmet } from 'react-helmet-async'

const PRODUCTION_DOMAIN = 'https://readifyai.vercel.app'
const SITE_NAME = 'Readify AI'
const DEFAULT_IMAGE = `${PRODUCTION_DOMAIN}/favicon.svg`
const TWITTER_CREATOR = '@ReadifyAI'

const normalizePath = (value = '') => {
  const path = String(value || '').trim()
  if (!path) return ''
  const normalized = path.startsWith('/') ? path : `/${path}`
  return normalized.replace(/\/+$|\/+(?=\?)/, '')
}

const buildCanonicalUrl = (path = '') => {
  const normalized = normalizePath(path)
  if (!normalized || normalized === '/') return `${PRODUCTION_DOMAIN}/`
  return `${PRODUCTION_DOMAIN}${normalized}/`
}

const renderStructuredData = (schema) => {
  if (!schema) return null
  const schemas = Array.isArray(schema) ? schema : [schema]
  return schemas.map((payload, index) => (
    <script key={`ld-json-${index}`} type="application/ld+json">
      {JSON.stringify(payload)}
    </script>
  ))
}

export default function SEO({ title, description, image, path, schema }) {
  const canonicalUrl = buildCanonicalUrl(path)
  const robots = path?.startsWith('/admin') ? 'noindex, nofollow' : 'index, follow'
  const pageTitle = title ? title : 'Readify AI - Read Books Online Free'
  const pageDescription = description || 'Read books, track your reading, and discover free ebooks on Readify AI.'
  const openGraphImage = image || DEFAULT_IMAGE

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <link rel="canonical" href={canonicalUrl} />
      <meta name="robots" content={robots} />
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content="free ebooks, read online, reading progress, book reader, digital library, book summaries" />
      <meta name="theme-color" content="#0f172a" />
      <link rel="alternate" hrefLang="en" href={canonicalUrl} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={openGraphImage} />
      <meta property="og:image:alt" content={description || 'Readify AI book reader and library'} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@ReadifyAI" />
      <meta name="twitter:creator" content={TWITTER_CREATOR} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={openGraphImage} />
      {renderStructuredData(schema)}
    </Helmet>
  )
}
