import { useEffect, useMemo, useRef, useState } from 'react'
import ePub from 'epubjs'
import { MdDarkMode, MdFullscreen, MdFullscreenExit, MdLightMode, MdMenuBook } from 'react-icons/md'
import apiClient from '../lib/apiClient'
import { API_URL } from '../lib/apiConfig'
import './epubReader.css'

const API = API_URL
const EPUB_PROGRESS_SYNC_MS = 2000
const SWIPE_MIN_DISTANCE = 80

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

function getProgressKey({ bookId }) {
  return `progress-${bookId || ''}`
}

function getLocationsKey(bookId, fileUrl) {
  const urlHash = (fileUrl || '')
    .split('')
    .reduce((hash, char) => (((hash << 5) - hash) + char.charCodeAt(0)) | 0, 0)
    .toString(36)
  return `epub-locations-${bookId || 'unknown'}-${urlHash}`
}

function loadCachedLocations(locKey, book) {
  try {
    const raw = localStorage.getItem(locKey)
    if (!raw) return false

    const cached = JSON.parse(raw)
    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000
    if (!cached?.data || cached?.version !== '1' || (Date.now() - Number(cached.savedAt || 0)) > ONE_WEEK) {
      localStorage.removeItem(locKey)
      return false
    }

    book.locations.load(cached.data)
    return true
  } catch {
    return false
  }
}

function getActiveHref(locationHref = '') {
  return locationHref.split('#')[0].split('/').pop() || ''
}

function getLocationsCount(book) {
  const raw = book?.locations?.length
  const value = typeof raw === 'function' ? raw.call(book.locations) : raw
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

function flattenToc(items = [], depth = 0) {
  return items.reduce((acc, item) => {
    acc.push({
      id: item.id || item.href || `${item.label}-${acc.length}`,
      label: item.label || 'Untitled Chapter',
      href: item.href || '',
      depth,
    })
    if (item.subitems?.length) acc.push(...flattenToc(item.subitems, depth + 1))
    return acc
  }, [])
}

function buildThemeStyles({ dark }) {
  return {
    body: {
      margin: '0',
      padding: '24px 32px',
      color: dark ? '#f1f5f9' : '#111827',
      background: dark ? '#0b1220' : '#ffffff',
      'line-height': '1.7',
      '-webkit-font-smoothing': 'antialiased',
      'box-sizing': 'border-box',
      'max-width': '100%',
    },
    p: { margin: '0 0 1em 0' },
    img: { 'max-width': '100%', height: 'auto' },
    a: { color: dark ? '#93c5fd' : '#1d4ed8' },
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
  const [loadingState, setLoadingState] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('epubTheme') === 'dark')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('reader-font-size') || '100', 10))
  const [tocItems, setTocItems] = useState([])
  const [activeFilename, setActiveFilename] = useState('')
  const [currentChapterLabel, setCurrentChapterLabel] = useState('')
  const [progressPercent, setProgressPercent] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [currentCfi, setCurrentCfi] = useState('')
  const [currentSpineIndex, setCurrentSpineIndex] = useState(0)

  const viewerRef = useRef(null)
  const frameRef = useRef(null)
  const bookRef = useRef(null)
  const renditionRef = useRef(null)
  const lastSavedCfi = useRef(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const locationTimerRef = useRef(null)
  const spineItemsRef = useRef([])
  const spineIndexRef = useRef(0)
  const progressMetaRef = useRef({ percentage: 0, currentPage: 1, totalPages: 1, chapterTitle: '', chapterIndex: 0 })

  const getAuthUser = () => {
    try {
      const raw = localStorage.getItem('authUser')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  const resolvedFileUrl = useMemo(() => toAbsoluteUrl(params.fileUrl), [params.fileUrl])
  const fileUrl = resolvedFileUrl
  const bookId = params?.bookId || ''
  const progressKey = useMemo(() => getProgressKey({ bookId }), [bookId])
  const locationsKey = useMemo(() => getLocationsKey(bookId, fileUrl), [bookId, fileUrl])

  const updateSpineIndex = (idx) => {
    spineIndexRef.current = idx
    setCurrentSpineIndex(idx)
  }

  const increaseFontSize = () => {
    const newSize = Math.min(fontSize + 10, 200)
    setFontSize(newSize)
    renditionRef.current?.themes.fontSize(`${newSize}%`)
    localStorage.setItem('reader-font-size', String(newSize))
  }

  const decreaseFontSize = () => {
    const newSize = Math.max(fontSize - 10, 60)
    setFontSize(newSize)
    renditionRef.current?.themes.fontSize(`${newSize}%`)
    localStorage.setItem('reader-font-size', String(newSize))
  }

  async function goNextChapter() {
    const items = spineItemsRef.current
    const nextIdx = spineIndexRef.current + 1
    if (!items || nextIdx >= items.length || !renditionRef.current) return
    try {
      await renditionRef.current.display(items[nextIdx].href)
      updateSpineIndex(nextIdx)
    } catch (e) {
      console.error('Next chapter error:', e)
    }
  }

  async function goPrevChapter() {
    const items = spineItemsRef.current
    const prevIdx = spineIndexRef.current - 1
    if (!items || prevIdx < 0 || !renditionRef.current) return
    try {
      await renditionRef.current.display(items[prevIdx].href)
      updateSpineIndex(prevIdx)
    } catch (e) {
      console.error('Prev chapter error:', e)
    }
  }

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX
    const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY)
    if (dy > 60) return
    if (dx > SWIPE_MIN_DISTANCE) goNextChapter()
    if (dx < -SWIPE_MIN_DISTANCE) goPrevChapter()
  }

  useEffect(() => {
    const onHashChange = () => setParams(parseReaderParams())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (!activeFilename) return
    const activeEl = document.querySelector('.toc-item.active')
    if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeFilename])

  useEffect(() => {
    localStorage.setItem('epubTheme', isDarkMode ? 'dark' : 'light')
    if (!renditionRef.current) return
    renditionRef.current.themes.default({
      body: {
        background: isDarkMode ? '#1a1a2e !important' : '#ffffff !important',
        color: isDarkMode ? '#e2e8f0 !important' : '#1a1a2e !important',
      },
    })
    renditionRef.current.themes.register('app-theme', buildThemeStyles({ dark: isDarkMode }))
    renditionRef.current.themes.select('app-theme')
  }, [isDarkMode])

  useEffect(() => {
    if (!renditionRef.current) return
    renditionRef.current.themes.fontSize(`${fontSize}%`)
    localStorage.setItem('reader-font-size', String(fontSize))
  }, [fontSize])

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === frameRef.current)
      renditionRef.current?.resize()
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    if (!viewerRef.current || !fileUrl || !bookId) return undefined

    let isDestroyed = false
    const abortController = new AbortController()

    const initReader = async () => {
      try {
        setLoadingState('loading')
        setErrorMessage('')

        if (locationTimerRef.current) window.clearTimeout(locationTimerRef.current)
        if (renditionRef.current?.destroy) renditionRef.current.destroy()
        if (bookRef.current) {
          bookRef.current.destroy()
          bookRef.current = null
          renditionRef.current = null
        }
        if (viewerRef.current) viewerRef.current.innerHTML = ''

        const book = await loadEpubBook(fileUrl)
        if (isDestroyed || !viewerRef.current) return
        bookRef.current = book

        const rendition = book.renderTo(viewerRef.current, {
          manager: 'continuous',
          flow: 'scrolled',
          width: '100%',
          height: '100%',
          allowScriptedContent: false,
          allowPopups: false,
          spread: 'none',
        })
        if (isDestroyed) return
        renditionRef.current = rendition

        rendition.themes.register('app-theme', buildThemeStyles({ dark: isDarkMode }))
        rendition.themes.select('app-theme')
        rendition.themes.override('*', {
          'max-width': '100% !important',
          'overflow-x': 'hidden !important',
        })
        rendition.themes.override('body', {
          margin: '0 auto',
          padding: '24px 32px',
          'max-width': '100%',
          'box-sizing': 'border-box',
        })

        const savedFontSize = parseInt(localStorage.getItem('reader-font-size') || '100', 10) || 100
        rendition.themes.fontSize(`${savedFontSize}%`)
        setFontSize(savedFontSize)

        if (isDarkMode) {
          rendition.themes.default({
            body: {
              background: '#1a1a2e !important',
              color: '#e2e8f0 !important',
            },
          })
        } else {
          rendition.themes.default({
            body: {
              background: '#ffffff !important',
              color: '#1a1a2e !important',
            },
          })
        }

        await book.loaded.navigation
        if (isDestroyed) return
        const nav = await book.loaded.navigation
        const toc = flattenToc(nav.toc || [])
        setTocItems(toc)

        await book.spine.ready
        if (isDestroyed) return
        spineItemsRef.current = book.spine?.spineItems || []

        let savedCfi = params.cfi || ''
        const authUser = getAuthUser()
        if (!savedCfi && authUser?._id) {
          try {
            const response = await apiClient.get(
              `/api/progress?userId=${encodeURIComponent(authUser._id)}`,
              { signal: abortController.signal },
            )
            const match = (response?.data || []).find((item) => (item?.book?._id || item?.book) === bookId)
            savedCfi = match?.locationCfi || ''
          } catch (err) {
            if (abortController.signal.aborted || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return
            console.debug('Progress lookup skipped:', err?.message || err)
          }
        }
        if (!savedCfi) savedCfi = localStorage.getItem(progressKey) || ''
        await rendition.display(savedCfi || undefined)

        const cacheHit = loadCachedLocations(locationsKey, book)
        if (cacheHit) {
          setTotalPages(Math.max(1, getLocationsCount(book) || 1))
        } else {
          setTotalPages(1)
          book.locations.generate(1024).then(() => {
            if (!isDestroyed) {
              try {
                localStorage.setItem(locationsKey, JSON.stringify({
                  data: book.locations.save(),
                  savedAt: Date.now(),
                  version: '1',
                }))
              } catch (e) {
                console.warn('Could not cache locations:', e)
              }
              setTotalPages(Math.max(1, getLocationsCount(book) || 1))
            }
          })
        }

        const onLocationChanged = (loc) => {
          if (locationTimerRef.current) window.clearTimeout(locationTimerRef.current)
          locationTimerRef.current = window.setTimeout(() => {
            if (!loc?.start?.href) return
            const activeFile = getActiveHref(loc.start.href)
            setActiveFilename(activeFile)
            const match = toc.find((item) => getActiveHref(item?.href || '') === activeFile)
            if (match) setCurrentChapterLabel(match.label || '')

            const idx = spineItemsRef.current.findIndex((item) => (
              loc.start.href.includes(item?.href || '') || (item?.href || '').includes(loc.start.href)
            ))
            if (idx >= 0) updateSpineIndex(idx)

            const cfi = loc.start.cfi || ''
            if (!cfi) return
            setCurrentCfi((prev) => (prev === cfi ? prev : cfi))
            localStorage.setItem(progressKey, cfi)

            const pct = book.locations.percentageFromCfi ? book.locations.percentageFromCfi(cfi) : 0
            const percent = Math.max(0, Math.min(100, Math.round((pct || 0) * 100)))
            const total = Math.max(1, getLocationsCount(book) || 1)
            const pageNumber = Math.max(1, Math.min(total, (loc?.start?.location || 0) + 1))
            setProgressPercent(percent)
            setCurrentPage(pageNumber)
            setTotalPages(total)
            progressMetaRef.current = {
              percentage: percent,
              currentPage: pageNumber,
              totalPages: total,
              chapterTitle: match?.label || progressMetaRef.current.chapterTitle,
              chapterIndex: idx >= 0 ? idx : progressMetaRef.current.chapterIndex,
            }
          }, 300)
        }

        rendition.on('locationChanged', onLocationChanged)
        if (!isDestroyed) {
          setLoadingState('ready')
        }
      } catch (_loadErr) {
        if (!isDestroyed) {
          setLoadingState('error')
          setErrorMessage('Failed to load book. Please try again.')
        }
      }
    }

    initReader()

    return () => {
      isDestroyed = true
      abortController.abort()
      if (locationTimerRef.current) window.clearTimeout(locationTimerRef.current)
      if (renditionRef.current?.destroy) renditionRef.current.destroy()
      if (bookRef.current) {
        bookRef.current.destroy()
        bookRef.current = null
        renditionRef.current = null
      }
    }
  }, [fileUrl, bookId])

  const saveProgress = async ({ cfi, percentage, chapter }) => {
    const authUser = getAuthUser()
    if (!authUser?._id || !bookId || !cfi) return
    const meta = progressMetaRef.current
    await apiClient.post('/api/progress', {
      userId: authUser._id,
      bookId,
      currentPage: meta.currentPage,
      totalPages: meta.totalPages,
      progressPercentage: typeof percentage === 'number' ? percentage : meta.percentage,
      locationCfi: cfi,
      chapterTitle: chapter || meta.chapterTitle || '',
      chapterIndex: Math.max(0, meta.chapterIndex || 0),
    })
  }

  useEffect(() => {
    if (!currentCfi || currentCfi === lastSavedCfi.current) return
    const timer = window.setTimeout(async () => {
      try {
        await saveProgress({ cfi: currentCfi, percentage: progressMetaRef.current.percentage, chapter: currentChapterLabel || progressMetaRef.current.chapterTitle })
        lastSavedCfi.current = currentCfi
      } catch (err) {
        console.error('Progress save failed:', err)
      }
    }, EPUB_PROGRESS_SYNC_MS)
    return () => window.clearTimeout(timer)
  }, [currentCfi])

  const handleChapterClick = async (item, index) => {
    const rendition = renditionRef.current
    const book = bookRef.current
    if (!rendition || !book || !item?.href) return
    try {
      await rendition.display(item.href)
      if (typeof index === 'number') updateSpineIndex(index)
    } catch (e) {
      console.error('Chapter navigation failed:', item.href, e)
    }
    setActiveFilename(getActiveHref(item.href || ''))
    setCurrentChapterLabel(item.label || '')
    if (window.innerWidth < 768) setSidebarOpen(false)
  }

  const isTocItemActive = (item) => {
    if (!activeFilename || !item?.href) return false
    return getActiveHref(item.href) === activeFilename
  }

  const toggleFullscreen = async () => {
    if (!frameRef.current) return
    if (document.fullscreenElement === frameRef.current) await document.exitFullscreen()
    else await frameRef.current.requestFullscreen()
  }

  return (
    <section className={`epub-reader-root ${isDarkMode ? 'dark dark-mode' : 'light'}`}>
      <div ref={frameRef} className={`epub-reader-shell ${isFullscreen ? 'fullscreen' : ''}`}>
        <header className="epub-reader-header reader-header">
          <div className="book-meta">
            <p className="book-title header-title">{params.title}</p>
            <p className="book-subtitle">{params.author}{currentChapterLabel ? ` - ${currentChapterLabel}` : ''}</p>
          </div>
          <div className="header-actions">
            <button type="button" className="hamburger-btn" onClick={() => setSidebarOpen((v) => !v)} aria-label="Toggle Table of Contents">?</button>
            <button type="button" onClick={() => setSidebarOpen((v) => !v)}><MdMenuBook /></button>
            <button type="button" onClick={() => setIsDarkMode((v) => !v)}>{isDarkMode ? <MdLightMode /> : <MdDarkMode />}</button>
            <button type="button" onClick={decreaseFontSize}>A-</button>
            <button type="button" onClick={increaseFontSize}>A+</button>
            <button type="button" onClick={toggleFullscreen}>{isFullscreen ? <MdFullscreenExit /> : <MdFullscreen />}</button>
            <button type="button" onClick={() => { window.location.hash = '' }}>Exit</button>
          </div>
        </header>

        <div className="epub-reader-body">
          <div className={`toc-overlay ${sidebarOpen ? 'active' : ''}`} onClick={() => setSidebarOpen(false)} />
          <aside className={`toc-sidebar ${sidebarOpen ? 'open' : ''}`}>
            <div className="toc-header">
              <p className="toc-title">Table of Contents</p>
              <button type="button" className="toc-close" onClick={() => setSidebarOpen(false)}>X</button>
            </div>
            <div className="toc-list">
              {tocItems.map((item, index) => (
                <button key={item.id} type="button" className={`toc-item ${isTocItemActive(item) ? 'active' : ''} ${item.depth > 0 ? 'sub-item' : ''}`} onClick={() => handleChapterClick(item, index)}>
                  {item.label}
                </button>
              ))}
            </div>
          </aside>

          <div className="reader-main">
            <div className="reader-content">
              {loadingState === 'loading' ? (
                <div className="reader-loading">
                  <div className="spinner" />
                  <p>Loading book...</p>
                </div>
              ) : null}

              {loadingState === 'error' ? (
                <div className="reader-error">
                  <p>{errorMessage}</p>
                  <button type="button" onClick={() => window.location.reload()}>Try Again</button>
                </div>
              ) : null}

              <div
                id="viewer"
                ref={viewerRef}
                className="epub-viewer"
                style={{ visibility: loadingState === 'ready' ? 'visible' : 'hidden' }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              />
            </div>

            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
            </div>

            <div className="reader-nav nav-buttons">
              <div className="nav-row secondary">
                <button type="button" onClick={goPrevChapter}>Prev Chapter</button>
                <button type="button" onClick={goNextChapter}>Next Chapter</button>
              </div>
              <span className="reader-status">Page {currentPage} / {totalPages} - {progressPercent}% - Chapter {currentSpineIndex + 1}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
