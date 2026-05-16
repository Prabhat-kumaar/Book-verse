import { useEffect, useMemo, useRef, useState } from 'react'
import ePub from 'epubjs'
import { ReaderSkeleton } from '../components/Skeletons'
import { MdDarkMode, MdFullscreen, MdFullscreenExit, MdLightMode } from 'react-icons/md'
import apiClient from '../lib/apiClient'
import { API_URL } from '../lib/apiConfig'
import { computeProgress } from '../lib/readingProgress'

const API = API_URL
const EPUB_PROGRESS_SYNC_MS = 4000

function parseReaderParams() {
  const hash = window.location.hash || ''
  const queryString = hash.includes('?') ? hash.split('?')[1] : ''
  const params = new URLSearchParams(queryString)
  return {
    bookId: params.get('bookId') || '',
    fileUrl: params.get('fileUrl') || params.get('pdf') || '',
    title: params.get('title') || 'Untitled Book',
    author: params.get('author') || 'Unknown Author',
    cfi: params.get('cfi') || '',
  }
}

function toAbsoluteUrl(value) {
  const raw = (value || '').trim()
  if (!raw) return ''
  if (raw.startsWith('/uploads/')) return `${API}${raw}`
  if (raw.startsWith('uploads/')) return `${API}/${raw}`
  return raw
}

function buildThemeStyles({ theme, isMobile, isTablet }) {
  return {
    html: {
      background: `${theme.background} !important`,
    },
    body: {
      margin: '0',
      padding: isMobile ? '14px 12px 20px' : isTablet ? '18px 20px 24px' : '20px 24px 28px',
      width: '100%',
      'max-width': '100%',
      color: `${theme.text} !important`,
      background: `${theme.background} !important`,
      'line-height': '1.7',
      'font-size': isMobile ? '17px' : '19px',
      'word-break': 'normal',
      'white-space': 'normal',
      'writing-mode': 'horizontal-tb',
      'text-orientation': 'mixed',
      'overflow-wrap': 'break-word',
      '-webkit-font-smoothing': 'antialiased',
    },
    '*': {
      color: `${theme.text} !important`,
    },
    'body *': {
      color: `${theme.text} !important`,
      'border-color': theme.borderColor,
    },
    p: {
      color: `${theme.text} !important`,
      margin: '0 0 1em 0',
    },
    h1: { 'line-height': '1.3', margin: '0 0 0.8em 0', color: `${theme.heading} !important` },
    h2: { 'line-height': '1.35', margin: '0 0 0.8em 0', color: `${theme.heading} !important` },
    h3: { 'line-height': '1.4', margin: '0 0 0.7em 0', color: `${theme.heading} !important` },
    a: { color: `${theme.link} !important` },
    span: { color: `${theme.text} !important` },
    div: { color: `${theme.text} !important` },
    li: { color: `${theme.text} !important` },
    blockquote: { color: `${theme.text} !important` },
    img: {
      display: 'block',
      'max-width': '100%',
      width: 'auto',
      height: 'auto',
      'max-height': isMobile ? '64vh' : '72vh',
      margin: '0 auto 1rem',
      'object-fit': 'contain',
    },
    figure: {
      margin: '0 auto 1rem',
      'text-align': 'center',
    },
    svg: {
      'max-width': '100%',
      height: 'auto',
    },
    pre: {
      'white-space': 'pre-wrap',
      'overflow-wrap': 'anywhere',
    },
  }
}

function applyRenditionTheme(rendition, { theme, isMobile, isTablet }) {
  if (!rendition) return
  rendition.themes.register('app-light', buildThemeStyles({
    theme: {
      text: '#111827',
      heading: '#111827',
      background: '#ffffff',
      borderColor: 'rgba(15,23,42,0.26)',
      link: '#1D4ED8',
    }, isMobile, isTablet
  }))
  rendition.themes.register('app-dark', buildThemeStyles({
    theme: {
      text: '#E5E7EB',
      heading: '#F8FAFC',
      background: '#0b1220',
      borderColor: 'rgba(255,255,255,0.28)',
      link: '#93C5FD',
    }, isMobile, isTablet
  }))
  rendition.themes.select(theme.background === '#0b1220' ? 'app-dark' : 'app-light')
  rendition.themes.override('color', theme.text)
  rendition.themes.override('background', theme.background)
}

function applyContentStabilityStyles(content, { theme, isMobile, isTablet }) {
  const doc = content?.document
  if (!doc) return

  let viewport = doc.querySelector('meta[name="viewport"]')
  if (!viewport) {
    viewport = doc.createElement('meta')
    viewport.name = 'viewport'
    doc.head.appendChild(viewport)
  }
  viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover')

  let styleEl = doc.getElementById('epub-stability-style')
  if (!styleEl) {
    styleEl = doc.createElement('style')
    styleEl.id = 'epub-stability-style'
    doc.head.appendChild(styleEl)
  }

  const fontSize = isMobile ? '17px' : isTablet ? '18px' : '19px'
  styleEl.textContent = `
    html, body {
      width: 100% !important;
      max-width: 100% !important;
      min-width: 100% !important;
      height: auto !important;
      overflow-x: hidden !important;
      overflow-y: auto !important;
      writing-mode: horizontal-tb !important;
      text-orientation: mixed !important;
      column-count: 1 !important;
      column-width: auto !important;
      background: ${theme.background} !important;
      color: ${theme.text} !important;
      font-size: ${fontSize} !important;
      line-height: 1.7 !important;
      overflow-wrap: break-word !important;
      word-break: normal !important;
      hyphens: auto !important;
      -webkit-text-size-adjust: 100% !important;
    }
    * {
      writing-mode: horizontal-tb !important;
      text-orientation: mixed !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
    }
    img, svg, video, canvas {
      max-width: 100% !important;
      height: auto !important;
    }
  `
}

function getLocationsCount(book) {
  const raw = book?.locations?.length
  const value = typeof raw === 'function' ? raw.call(book.locations) : raw
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

async function loadEpubBook(fileUrl) {
  try {
    return ePub(fileUrl)
  } catch {
    const response = await fetch(fileUrl)
    if (!response.ok) throw new Error(`Unable to fetch EPUB (${response.status})`)
    const buffer = await response.arrayBuffer()
    return ePub(buffer)
  }
}

export default function EpubReaderPage() {
  const [params, setParams] = useState(parseReaderParams)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const [isTablet, setIsTablet] = useState(() => window.innerWidth >= 768 && window.innerWidth < 1024)
  const viewerRef = useRef(null)
  const bookRef = useRef(null)
  const renditionRef = useRef(null)
  const frameRef = useRef(null)
  const reflowTimerRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isFullscreenTransitioning, setIsFullscreenTransitioning] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return localStorage.getItem('epubTheme') === 'dark'
    } catch {
      return false
    }
  })
  const [progressPercent, setProgressPercent] = useState(0)
  const [virtualTotalPages, setVirtualTotalPages] = useState(100)
  const [virtualCurrentPage, setVirtualCurrentPage] = useState(1)

  const theme = useMemo(() => ({
    text: isDarkMode ? '#E5E7EB' : '#111827',
    heading: isDarkMode ? '#F8FAFC' : '#111827',
    background: isDarkMode ? '#0b1220' : '#ffffff',
    borderColor: isDarkMode ? 'rgba(255,255,255,0.28)' : 'rgba(15,23,42,0.26)',
    link: isDarkMode ? '#93C5FD' : '#1D4ED8',
  }), [isDarkMode])
  const themeRef = useRef(theme)

  useEffect(() => {
    themeRef.current = theme
  }, [theme])
  const currentCfiRef = useRef('')
  const lastRelocationSnapshotRef = useRef('')
  const lastSyncedSnapshotRef = useRef('')
  const lastSyncedAtRef = useRef(0)
  const authUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('authUser')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [])

  const progressKey = useMemo(() => `epubProgress:${params.bookId || params.fileUrl}`, [params.bookId, params.fileUrl])
  const resolvedFileUrl = useMemo(() => toAbsoluteUrl(params.fileUrl), [params.fileUrl])

  useEffect(() => {
    const onHashChange = () => setParams(parseReaderParams())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === frameRef.current)
      setIsFullscreenTransitioning(true)
      requestAnimationFrame(() => {
        renditionRef.current?.resize()
        if (reflowTimerRef.current) clearTimeout(reflowTimerRef.current)
        reflowTimerRef.current = setTimeout(() => {
          renditionRef.current?.resize()
          setIsFullscreenTransitioning(false)
        }, 220)
      })
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      if (reflowTimerRef.current) clearTimeout(reflowTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 768)
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024)
      requestAnimationFrame(() => renditionRef.current?.resize())
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('epubTheme', isDarkMode ? 'dark' : 'light')
    } catch {
      // no-op
    }
  }, [isDarkMode])

  useEffect(() => {
    const rendition = renditionRef.current
    if (!rendition) return
    applyRenditionTheme(rendition, { theme, isMobile, isTablet })
    const contents = rendition.getContents?.() || []
    contents.forEach((content) => applyContentStabilityStyles(content, { theme, isMobile, isTablet }))
  }, [theme, isMobile, isTablet])

  useEffect(() => {
    if (viewerRef.current) {
      viewerRef.current.style.backgroundColor = theme.background
      viewerRef.current.style.color = theme.text
    }
  }, [theme])

  useEffect(() => {
    if (!resolvedFileUrl || !viewerRef.current) return undefined
    setLoading(true)
    setError('')
    let active = true

      ; (async () => {
        try {
          // Ensure previous instances are fully cleaned before re-initializing.
          renditionRef.current?.destroy()
          bookRef.current?.destroy()
          renditionRef.current = null
          bookRef.current = null

          const book = await loadEpubBook(resolvedFileUrl)
          if (!active || !viewerRef.current) return
          const rendition = book.renderTo(viewerRef.current, {
            width: '100%',
            height: '100%',
            spread: 'none',
            manager: 'continuous',
            flow: 'scrolled-doc',
            allowScriptedContent: false,
          })
          rendition.flow('scrolled-doc')
          applyRenditionTheme(rendition, { theme: themeRef.current, isMobile, isTablet })
          rendition.hooks.content.register((content) => {
            applyContentStabilityStyles(content, { theme: themeRef.current, isMobile, isTablet })
          })
          bookRef.current = book
          renditionRef.current = rendition
          await book.ready
          try {
            await book.locations.generate(1200)
            const locationsCount = getLocationsCount(book)
            const safeTotal = Math.max(1, locationsCount || 100)
            setVirtualTotalPages(safeTotal)
          } catch {
            setVirtualTotalPages(100)
          }
          const savedCfi = params.cfi || localStorage.getItem(progressKey)
          try {
            await rendition.display(savedCfi || undefined)
          } catch {
            await rendition.display()
          }
          const epubContainer = viewerRef.current?.querySelector('.epub-container')
          const epubView = viewerRef.current?.querySelector('.epub-view')
          if (epubContainer) {
            epubContainer.style.height = '100%'
            epubContainer.style.overflowY = 'auto'
            epubContainer.style.overflowX = 'hidden'
            epubContainer.style.webkitOverflowScrolling = 'touch'
          }
          if (epubView) {
            epubView.style.height = 'auto'
            epubView.style.minHeight = '100%'
          }
          const onRelocated = (location) => {
            const cfi = location?.start?.cfi
            if (cfi) {
              localStorage.setItem(progressKey, cfi)
              currentCfiRef.current = cfi
            }
            const rawPercentage = typeof location?.start?.percentage === 'number'
              ? location.start.percentage
              : (cfi && book.locations ? book.locations.percentageFromCfi(cfi) : 0)
            const safeRaw = Number.isFinite(rawPercentage) ? rawPercentage : 0
            const safeTotal = Math.max(1, getLocationsCount(book) || virtualTotalPages || 100)
            const page = Math.max(1, Math.min(safeTotal, Math.round((safeRaw || 0) * safeTotal) || 1))
            const computed = computeProgress({ currentPage: page, totalPages: safeTotal, progressPercentage: safeRaw * 100 })
            const snapshot = `${computed.currentPage}:${computed.totalPages}:${computed.progressPercentage}:${cfi || ''}`
            if (snapshot === lastRelocationSnapshotRef.current) return
            lastRelocationSnapshotRef.current = snapshot
            setVirtualTotalPages((prev) => (prev === safeTotal ? prev : safeTotal))
            setVirtualCurrentPage((prev) => (prev === computed.currentPage ? prev : computed.currentPage))
            setProgressPercent((prev) => (prev === computed.progressPercentage ? prev : computed.progressPercentage))
            const contents = rendition.getContents?.() || []
            contents.forEach((content) => applyContentStabilityStyles(content, { theme: themeRef.current, isMobile, isTablet }))
            applyRenditionTheme(rendition, { theme: themeRef.current, isMobile, isTablet })
          }
          const onRendered = () => {
            const contents = rendition.getContents?.() || []
            contents.forEach((content) => applyContentStabilityStyles(content, { theme: themeRef.current, isMobile, isTablet }))
            applyRenditionTheme(rendition, { theme: themeRef.current, isMobile, isTablet })
          }
          rendition.on('relocated', onRelocated)
          rendition.on('rendered', onRendered)
          if (active) setLoading(false)
        } catch (loadErr) {
          if (active) {
            setError(loadErr?.message || 'Failed to load EPUB.')
            setLoading(false)
          }
        }
      })()

    return () => {
      active = false
      renditionRef.current?.destroy()
      bookRef.current?.destroy()
      renditionRef.current = null
      bookRef.current = null
    }
  }, [progressKey, resolvedFileUrl])

  useEffect(() => {
    if (!params.bookId || !authUser?._id) return
    let cancelled = false
    const computed = computeProgress({ currentPage: virtualCurrentPage, totalPages: virtualTotalPages, progressPercentage: progressPercent })
    const snapshot = `${params.bookId}:${computed.currentPage}:${computed.totalPages}:${computed.progressPercentage}:${currentCfiRef.current || ''}`
    const now = Date.now()
    if (snapshot === lastSyncedSnapshotRef.current && now - lastSyncedAtRef.current < EPUB_PROGRESS_SYNC_MS) return
    const sync = async () => {
      try {
        const response = await apiClient.post('/api/progress', {
          userId: authUser._id,
          bookId: params.bookId,
          currentPage: computed.currentPage,
          totalPages: computed.totalPages,
          progressPercentage: computed.progressPercentage,
          locationCfi: currentCfiRef.current || undefined,
        })
        lastSyncedSnapshotRef.current = snapshot
        lastSyncedAtRef.current = Date.now()
        if (!cancelled) {
          window.dispatchEvent(new CustomEvent('progressUpdated', {
            detail: {
              bookId: params.bookId,
              currentPage: computed.currentPage,
              totalPages: computed.totalPages,
              progressPercentage: computed.progressPercentage,
              locationCfi: currentCfiRef.current || '',
              lastReadAt: new Date().toISOString(),
              item: response?.data,
            },
          }))
        }
      } catch {
        // no-op
      }
    }
    sync()
    return () => {
      cancelled = true
    }
  }, [authUser?._id, params.bookId, progressPercent, virtualCurrentPage, virtualTotalPages])

  const readerShellClass = isMobile
    ? 'h-[100dvh] max-h-[100dvh] w-full rounded-none'
    : isTablet
      ? 'h-[96vh] min-h-[99vh] max-h-[99vh] w-full rounded-2xl'
      : 'h-[96vh] min-h-[99vh] max-h-[99vh] w-full max-w-[800px] rounded-2xl'

  const fontScaleClass = isMobile ? 'text-sm' : isTablet ? 'text-base' : 'text-lg'
  const safeDisplayTotal = Math.max(1, Number.isFinite(virtualTotalPages) ? Math.floor(virtualTotalPages) : 1)
  const safeDisplayPage = Math.max(1, Math.min(safeDisplayTotal, Number.isFinite(virtualCurrentPage) ? Math.floor(virtualCurrentPage) : 1))
  const toggleFullscreen = async () => {
    if (!frameRef.current) return
    if (document.fullscreenElement === frameRef.current) {
      await document.exitFullscreen()
      return
    }
    await frameRef.current.requestFullscreen()
  }

  return (
    <section style={{ backgroundColor: theme.background, color: theme.text }} className={`mx-auto flex h-screen w-full items-center justify-center px-0 py-0 md:px-4 md:py-6 ${fontScaleClass}`}>
      <div ref={frameRef} className={`mx-auto flex h-[96vh] max-h-[96vh] flex-col ${isDarkMode ? 'border border-white/10 bg-slate-950/70' : 'border border-slate-200 bg-white'} ${readerShellClass} ${isFullscreen ? '!h-[100dvh] !max-h-[100dvh] !w-full !max-w-none !rounded-none border-0' : ''}`}>
        <header className={`flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2.5 sm:px-4 sm:py-3 ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="min-w-0">
            <p className={`truncate text-xs font-semibold sm:text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{params.title}</p>
            <p className={`truncate text-[11px] sm:text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{params.author}</p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button type="button" onClick={() => setIsDarkMode((prev) => !prev)} className={`rounded-lg border p-1.5 ${isDarkMode ? 'border-white/15 text-slate-200' : 'border-slate-300 text-slate-700'}`} aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
              {isDarkMode ? <MdLightMode className="h-4 w-4" /> : <MdDarkMode className="h-4 w-4" />}
            </button>
            <button type="button" onClick={toggleFullscreen} className={`rounded-full border p-1.5 ${isDarkMode ? 'border-white/15 text-slate-200' : 'border-slate-300 text-slate-700'}`}>
              {isFullscreen ? <MdFullscreenExit className="h-4 w-4" /> : <MdFullscreen className="h-4 w-4" />}
            </button>
            <button type="button" onClick={() => (window.location.hash = '')} className={`rounded-full border px-2.5 py-1 text-[11px] font-medium sm:px-3 sm:text-xs ${isDarkMode ? 'border-white/15 text-slate-200' : 'border-slate-300 text-slate-700'}`}>
              Exit
            </button>
          </div>
        </header>
        <div className={`shrink-0 border-b px-3 py-2 sm:px-4 ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
          <div className={`h-1.5 w-full overflow-hidden rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{progressPercent}% - Page {safeDisplayPage} of {safeDisplayTotal}</p>
        </div>

        <div className={`relative min-h-0 flex-1 w-full overflow-hidden ${isFullscreenTransitioning ? 'opacity-95' : 'opacity-100'} transition-opacity duration-200`}>
          {loading ? <ReaderSkeleton /> : null}
          {error ? <p className="p-4 text-sm text-rose-600">{error}</p> : null}
          <div
            id="viewer"
            ref={viewerRef}
            style={{ backgroundColor: theme.background, color: theme.text }}
            className="h-full w-full [contain:layout_paint_style] [&_.epub-container]:!w-full [&_.epub-container]:!h-full [&_.epub-container]:!overflow-y-auto [&_.epub-container]:!overflow-x-hidden [&_.epub-container]:[scroll-behavior:smooth] [&_.epub-container]:[-webkit-overflow-scrolling:touch] [&_.epub-view]:!w-full [&_.epub-view]:!h-auto [&_.epub-view]:!min-h-full [&_iframe]:!w-full [&_iframe]:!border-0"
          />
        </div>
      </div>
    </section>
  )
}

