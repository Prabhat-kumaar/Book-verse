import React, { useState, useEffect } from 'react'
import { stripCloudinaryTransforms } from '../lib/mediaUrls'

/**
 * Parses and returns a low-resolution placeholder URL for the blur-up strategy.
 */
function getLowResPlaceholder(src = '') {
  if (!src) return ''
  // 1. Open Library covers: convert -L.jpg / -M.jpg to -S.jpg
  if (src.includes('covers.openlibrary.org')) {
    return src.replace(/-(L|M)\.jpg$/i, '-S.jpg')
  }
  // 2. Cloudinary: resize to width 40 and apply heavy blur
  if (src.includes('res.cloudinary.com')) {
    const cleanSrc = stripCloudinaryTransforms(src)
    return cleanSrc.replace('/upload/', '/upload/w_40,h_60,c_fill,e_blur:200,q_auto,f_auto/')
  }
  // 3. Fallback: return the source itself (or inline empty SVG)
  return src
}

/**
 * Parses and returns the responsive srcSet attribute for specific CDNs.
 */
function getSrcSetAndSizes(src = '') {
  if (!src) return {}

  // Open Library supports Small (-S), Medium (-M), and Large (-L) covers
  if (src.includes('covers.openlibrary.org')) {
    const base = src.replace(/-(L|M|S)\.jpg$/i, '')
    return {
      srcSet: `${base}-S.jpg 180w, ${base}-M.jpg 360w, ${base}-L.jpg 600w`,
      sizes: '(max-width: 640px) 180px, (max-width: 1024px) 360px, 600px'
    }
  }

  // Cloudinary supports dynamic width parameters
  if (src.includes('res.cloudinary.com')) {
    const base = stripCloudinaryTransforms(src)
    return {
      srcSet: `
        ${base.replace('/upload/', '/upload/w_180,h_270,c_fill,q_auto,f_auto/')} 180w,
        ${base.replace('/upload/', '/upload/w_360,h_540,c_fill,q_auto,f_auto/')} 360w,
        ${base.replace('/upload/', '/upload/w_600,h_900,c_fill,q_auto,f_auto/')} 600w
      `,
      sizes: '(max-width: 640px) 180px, (max-width: 1024px) 360px, 600px'
    }
  }

  return {}
}

const OptimizedImage = React.memo(function OptimizedImage({
  src,
  alt,
  className = '',
  loading = 'lazy',
  fetchPriority = 'low',
  onError,
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(src)
  const [hasError, setHasError] = useState(false)

  // Sync state if source changes
  useEffect(() => {
    setCurrentSrc(src)
    setIsLoaded(false)
    setHasError(false)
  }, [src])

  const placeholderUrl = getLowResPlaceholder(currentSrc)
  const { srcSet, sizes } = getSrcSetAndSizes(currentSrc)

  const handleImageLoad = () => {
    setIsLoaded(true)
  }

  const handleImageError = (e) => {
    setHasError(true)
    if (onError) onError(e)
  }

  // If there's an error, fallback to inline SVG placeholder
  if (hasError || !currentSrc) {
    return (
      <div className={`relative bg-slate-950 flex items-center justify-center ${className}`}>
        <svg
          className="w-12 h-12 text-slate-800"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* 1. Low-res blur-up placeholder */}
      {placeholderUrl && !isLoaded && (
        <img
          src={placeholderUrl}
          alt=""
          role="presentation"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover filter blur-md scale-105 transition-opacity duration-500 opacity-100"
        />
      )}

      {/* 2. High-res target image */}
      <img
        src={currentSrc}
        srcSet={srcSet || undefined}
        sizes={sizes || undefined}
        alt={alt || ''}
        loading={loading}
        decoding="async"
        fetchpriority={fetchPriority !== 'low' ? fetchPriority : undefined}
        onLoad={handleImageLoad}
        onError={handleImageError}
        className={`w-full h-full object-cover transition-all duration-500 ${isLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'
          }`}
        {...props}
      />
    </div>
  )
})

export default OptimizedImage
