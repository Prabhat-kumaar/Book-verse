import { Helmet } from 'react-helmet-async'

const PRODUCTION_DOMAIN = 'https://readifyai.vercel.app'

export default function SEO({ title, description, image, path, schema }) {
  const canonicalUrl = `${PRODUCTION_DOMAIN}${path || ''}`
  const siteName = 'Readify AI'
  const defaultImage = `${PRODUCTION_DOMAIN}/favicon.svg`

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title ? `${title}` : 'Readify AI - Read Books Online Free'}</title>
      <link rel="canonical" href={canonicalUrl} />
      {description && <meta name="description" content={description} />}

      {/* Open Graph Tags */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title || 'Readify AI'} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:image" content={image || defaultImage} />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title || 'Readify AI'} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={image || defaultImage} />

      {/* Structured Data JSON-LD */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  )
}
