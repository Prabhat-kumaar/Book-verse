import { useEffect, useMemo, useRef, useState } from 'react'
import ePub from 'epubjs'
import { MdDarkMode, MdFullscreen, MdFullscreenExit, MdLightMode, MdMenuBook } from 'react-icons/md'
import { ReaderSkeleton } from '../components/Skeletons'
import apiClient from '../lib/apiClient'
import { API_URL } from '../lib/apiConfig'
import './epubReader.css'

const API = API_URL
const EPUB_PROGRESS_SYNC_MS = 2000
const SWIPE_MIN_DISTANCE = 40

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

function getProgressKey({ bookId, fileUrl }) {
  return `epubProgress:${bookId || fileUrl || ''}`
}

function getLocationsKey({ bookId, fileUrl }) {
  return `epubLocations:${bookId || fileUrl || ''}`
}

function normalizeHref(href = '') {
  return href.split('#')[0].trim().toLowerCase()
}

function getLocationsCount(book) {
  const raw = book?.locations?.length
  const value = typeof raw === 'function' ? raw.call(book.locations) : raw
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

function findChapterIndexFromLocation(location, toc = []) {
  const href = normalizeHref(location?.start?.href || '')
  if (!toc.length) return -1

  const hrefMatch = toc.findIndex((item) => href && (normalizeHref(item.href).includes(href) || href.includes(normalizeHref(item.href))))
  if (hrefMatch >= 0) return hrefMatch

  return -1
}

function flattenToc(items = [], depth = 0) {
  return items.reduce((acc, item) => {
    acc.push({
      id: item.id || item.href || `${item.label}-${acc.length}`,
      label: item.label || 'Untitled Chapter',
      href: item.href || '',
      depth,
    })
    if (item.subitems?.length) {
      acc.push(...flattenToc(item.subitems, depth + 1))
    }
    return acc
  }, [])
}

function buildThemeStyles({ dark }) {
  return {
    body: {
      margin: '0',
      padding: '20px 18px',
      color: dark ? '#f1f5f9' : '#111827',
      background: dark ? '#0b1220' : '#ffffff',
      'line-height': '1.7',
      'font-size': '18px',
      '-webkit-font-smoothing': 'antialiased',
    },
    p: { margin: '0 0 1em 0' },
    img: { 'max-width': '100%', height: 'auto' },
    a: { color: dark ? '#93c5fd' : '#1d4ed8' },
    h1: { color: dark ? '#f8fafc' : '#111827' },
    h2: { color: dark ? '#f8fafc' : '#111827' },
    h3: { color: dark ? '#f8fafc' : '#111827' },
  }
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
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('epubTheme') === 'dark')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showToc, setShowToc] = useState(false)
  const [tocItems, setTocItems] = useState([])
  const [activeChapterIndex, setActiveChapterIndex] = useState(0)
  const [currentChapterTitle, setCurrentChapterTitle] = useState('')
  const [progressPercent, setProgressPercent] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [currentCfi, setCurrentCfi] = useState('')
  const [currentSpineHref, setCurrentSpineHref] = useState('')
  const [loadingMessage, setLoadingMessage] = useState('Loading book...')
  const viewerRef = useRef(null)
  const frameRef = useRef(null)
  const bookRef = useRef(null)
  const renditionRef = useRef(null)
  const lastSavedCfi = useRef(null)
  const touchStartXRef = useRef(0)
  const progressMetaRef = useRef({
    percentage: 0,
    currentPage: 1,
    totalPages: 1,
    chapterTitle: '',
    chapterIndex: 0,
  })

  const authUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('authUser')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [])

  const resolvedFileUrl = useMemo(() => toAbsoluteUrl(params.fileUrl), [params.fileUrl])
  const progressKey = useMemo(() => getProgressKey(params), [params])
  const locationsKey = useMemo(() => getLocationsKey(params), [params])

  useEffect(() => {
    const onHashChange = () => setParams(parseReaderParams())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    localStorage.setItem('epubTheme', isDarkMode ? 'dark' : 'light')
    if (!renditionRef.current) return
    renditionRef.current.themes.register('app-theme', buildThemeStyles({ dark: isDarkMode }))
    renditionRef.current.themes.select('app-theme')
  }, [isDarkMode])

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === frameRef.current)
      renditionRef.current?.resize()
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    if (!resolvedFileUrl || !viewerRef.current) return undefined
    let active = true

    ;(async () => {
      try {
        setLoading(true)
        setError('')
        renditionRef.current?.destroy()
        bookRef.current?.destroy()

        const book = await loadEpubBook(resolvedFileUrl)
        if (!active || !viewerRef.current) return

        const rendition = book.renderTo(viewerRef.current, {
          manager: 'continuous',
          flow: 'scrolled',
          width: '100%',
          height: '100%',
          spread: 'none',
          allowScriptedContent: true,
          allowPopups: true,
        })

        bookRef.current = book
        renditionRef.current = rendition
        rendition.themes.register('app-theme', buildThemeStyles({ dark: isDarkMode }))
        rendition.themes.select('app-theme')

        await book.ready

        setLoadingMessage('Generating page map...')
        const savedLocations = localStorage.getItem(locationsKey)
        if (savedLocations) {
          book.locations.load(savedLocations)
        } else {
          await book.locations.generate(1024)
          localStorage.setItem(locationsKey, book.locations.save())
        }

        const count = Math.max(1, getLocationsCount(book) || 1)
        setTotalPages(count)

        const toc = await book.loaded.navigation.then((nav) => flattenToc(nav.toc || []))
        setTocItems(toc)

        let savedCfi = params.cfi || ''
        if (!savedCfi && authUser?._id && params.bookId) {
          try {
            const response = await apiClient.get(`/api/progress?userId=${encodeURIComponent(authUser._id)}`)
            const match = (response?.data || []).find((item) => (item?.book?._id || item?.book) === params.bookId)
            savedCfi = match?.locationCfi || ''
          } catch {
            // no-op
          }
        }
        if (!savedCfi) savedCfi = localStorage.getItem(progressKey) || ''

        if (savedCfi) {
          await rendition.display(savedCfi)
        } else {
          await rendition.display()
        }

        const onRelocated = (location) => {
          const cfi = location?.start?.cfi || ''
          if (!cfi) return
          setCurrentCfi((prev) => (prev === cfi ? prev : cfi))
          setCurrentSpineHref(location?.start?.href || '')
          localStorage.setItem(progressKey, cfi)

          const percentageRaw = book.locations.percentageFromCfi(cfi) || 0
          const percent = Math.max(0, Math.min(100, Math.round(percentageRaw * 100)))
          const total = Math.max(1, getLocationsCount(book) || 1)
          const pageNumber = Math.max(1, Math.min(total, (location?.start?.location || 0) + 1))

          setProgressPercent(percent)
          setCurrentPage(pageNumber)
          setTotalPages(total)

          const chapterIdx = findChapterIndexFromLocation(location, toc)
          if (chapterIdx >= 0) {
            setActiveChapterIndex(chapterIdx)
            setCurrentChapterTitle(toc[chapterIdx]?.label || '')
          }
          progressMetaRef.current = {
            percentage: percent,
            currentPage: pageNumber,
            totalPages: total,
            chapterTitle: chapterIdx >= 0 ? (toc[chapterIdx]?.label || '') : progressMetaRef.current.chapterTitle,
            chapterIndex: chapterIdx >= 0 ? chapterIdx : progressMetaRef.current.chapterIndex,
          }

          const viewport = viewerRef.current?.querySelector('iframe')
          if (viewport) {
            viewport.classList.add('page-fade')
            window.setTimeout(() => viewport.classList.remove('page-fade'), 160)
          }
        }

        const onLocationChanged = (loc) => {
          const cfi = loc?.start?.cfi || ''
          const href = loc?.start?.href || ''
          if (cfi) setCurrentCfi((prev) => (prev === cfi ? prev : cfi))
          const match = toc.find((item) => (
            href && item?.href && (href.includes(item.href) || item.href.includes(href))
          ))
          if (match) {
            setCurrentChapterTitle(match.label || '')
            const idx = toc.findIndex((item) => item.id === match.id)
            if (idx >= 0) setActiveChapterIndex(idx)
          }
          onRelocated(loc)
        }
        rendition.on('relocated', onRelocated)
        rendition.on('locationChanged', onLocationChanged)
        setLoadingMessage('Loading book...')
        setLoading(false)
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
  }, [authUser?._id, isDarkMode, locationsKey, params.bookId, params.cfi, progressKey, resolvedFileUrl])

  const saveProgress = async ({ cfi, percentage, chapter }) => {
    if (!authUser?._id || !params.bookId || !cfi) return
    const meta = progressMetaRef.current
    const payload = {
      userId: authUser._id,
      bookId: params.bookId,
      currentPage: meta.currentPage,
      totalPages: meta.totalPages,
      progressPercentage: typeof percentage === 'number' ? percentage : meta.percentage,
      locationCfi: cfi,
      chapterTitle: chapter || meta.chapterTitle || '',
      chapterIndex: Math.max(0, meta.chapterIndex || 0),
    }
    await apiClient.post('/api/progress', payload)
  }

  useEffect(() => {
    if (!currentCfi) return
    if (currentCfi === lastSavedCfi.current) return

    const timer = window.setTimeout(async () => {
      try {
        await saveProgress({
          cfi: currentCfi,
          percentage: progressMetaRef.current.percentage,
          chapter: currentChapterTitle || progressMetaRef.current.chapterTitle,
        })
        lastSavedCfi.current = currentCfi
      } catch (err) {
        console.error('Progress save failed:', err)
      }
    }, EPUB_PROGRESS_SYNC_MS)

    return () => window.clearTimeout(timer)
  }, [currentCfi])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!renditionRef.current) return
      if (event.key === 'ArrowLeft') renditionRef.current.prev()
      if (event.key === 'ArrowRight') renditionRef.current.next()
    }

    const onTouchStart = (event) => {
      touchStartXRef.current = event.changedTouches?.[0]?.clientX || 0
    }

    const onTouchEnd = (event) => {
      if (!renditionRef.current) return
      const endX = event.changedTouches?.[0]?.clientX || 0
      const delta = endX - touchStartXRef.current
      if (Math.abs(delta) < SWIPE_MIN_DISTANCE) return
      if (delta > 0) renditionRef.current.prev()
      else renditionRef.current.next()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  const handleChapterClick = async (item, index) => {
    const rendition = renditionRef.current
    const book = bookRef.current
    if (!rendition || !book || !item?.href) return
    try {
      await rendition.display(item.href)
    } catch (e1) {
      try {
        const spineItem = book.spine.get(item.href)
        if (spineItem) {
          await rendition.display(spineItem.href)
        } else {
          const allItems = book.spine?.spineItems || []
          const match = allItems.find((s) => (
            s?.href && item?.href && (
              normalizeHref(s.href).includes(normalizeHref(item.href)) ||
              normalizeHref(item.href).includes(normalizeHref(s.href))
            )
          ))
          if (match) await rendition.display(match.href)
        }
      } catch (e2) {
        console.error('Chapter navigation failed:', item.href, e2)
      }
    }
    if (typeof index === 'number') setActiveChapterIndex(index)
    setCurrentChapterTitle(item.label || '')
    if (window.innerWidth < 768) setShowToc(false)
  }

  const goNextChapter = async () => {
    const book = bookRef.current
    const rendition = renditionRef.current
    if (!book || !rendition) return
    const spineItems = book.spine?.spineItems || []
    const currentIndex = spineItems.findIndex((item) => item?.href === currentSpineHref)
    const next = spineItems[currentIndex + 1]
    if (next?.href) await rendition.display(next.href)
  }

  const goPrevChapter = async () => {
    const book = bookRef.current
    const rendition = renditionRef.current
    if (!book || !rendition) return
    const spineItems = book.spine?.spineItems || []
    const currentIndex = spineItems.findIndex((item) => item?.href === currentSpineHref)
    const prev = spineItems[currentIndex - 1]
    if (prev?.href) await rendition.display(prev.href)
  }

  const toggleFullscreen = async () => {
    if (!frameRef.current) return
    if (document.fullscreenElement === frameRef.current) await document.exitFullscreen()
    else await frameRef.current.requestFullscreen()
  }

  return (
    <section className={`epub-reader-root ${isDarkMode ? 'dark' : 'light'}`}>
      <div ref={frameRef} className={`epub-reader-shell ${isFullscreen ? 'fullscreen' : ''}`}>
        <header className="epub-reader-header">
          <div className="book-meta">
            <p className="book-title">{params.title}</p>
            <p className="book-subtitle">{params.author}{currentChapterTitle ? ` - ${currentChapterTitle}` : ''}</p>
          </div>
          <div className="header-actions">
            <button type="button" onClick={() => setShowToc((v) => !v)}><MdMenuBook /></button>
            <button type="button" onClick={() => setIsDarkMode((v) => !v)}>{isDarkMode ? <MdLightMode /> : <MdDarkMode />}</button>
            <button type="button" onClick={toggleFullscreen}>{isFullscreen ? <MdFullscreenExit /> : <MdFullscreen />}</button>
            <button type="button" onClick={() => { window.location.hash = '' }}>Exit</button>
          </div>
        </header>

        <div className="epub-reader-body">
          <aside className={`toc-sidebar ${showToc ? 'open' : ''}`}>
            <div className="toc-header">
              <p className="toc-title">Table of Contents</p>
              <button type="button" className="toc-close" onClick={() => setShowToc(false)}>X</button>
            </div>
            <div className="toc-list">
              {tocItems.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={`toc-item ${index === activeChapterIndex ? 'active' : ''} ${item.depth > 0 ? 'sub-item' : ''}`}
                  onClick={() => handleChapterClick(item, index)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </aside>

          <div className="reader-main">
            <div className="reader-controls">
              <button type="button" onClick={() => renditionRef.current?.prev()}>Previous Page</button>
              <button type="button" onClick={() => renditionRef.current?.next()}>Next Page</button>
              <button type="button" onClick={goPrevChapter}>Previous Chapter</button>
              <button type="button" onClick={goNextChapter}>Next Chapter</button>
            </div>

            <div className="reader-stage reader-container">
              {loading ? <ReaderSkeleton /> : null}
              {loading ? <p className="reader-loading">{loadingMessage}</p> : null}
              {error ? <p className="reader-error">{error}</p> : null}
              <div id="viewer" ref={viewerRef} className="epub-viewer" />
            </div>

            <footer className="reader-footer">
              <p>Page {currentPage} of {totalPages}</p>
              <p>{progressPercent}% complete</p>
            </footer>
          </div>
        </div>
      </div>
    </section>
  )
}
