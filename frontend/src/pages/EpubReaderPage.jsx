import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ePub from 'epubjs'
import {
  MdBookmarkBorder,
  MdChevronLeft,
  MdChevronRight,
  MdClose,
  MdDarkMode,
  MdFullscreen,
  MdFullscreenExit,
  MdLightMode,
  MdMenu,
  MdSearch,
} from 'react-icons/md'
import { API_ORIGIN } from '../lib/apiConfig'
import { getEpubSavedCfi, setEpubSavedCfi } from '../lib/readingProgress'
import useReadingProgress from '../hooks/useReadingProgress'
import './epubReader.css'

const API = API_ORIGIN
const SWIPE_MIN_DISTANCE = 80
const EPUB_AUTO_SAVE_INTERVAL_MS = 8000
const EPUB_SAVE_COOLDOWN_MS = 2500
const isDev = import.meta.env.DEV
const debugLog = (...args) => {
  if (isDev) console.debug(...args)
}
const debugError = (...args) => {
  if (isDev) console.error(...args)
}

function parseReaderParams() {
  const hash = window.location.hash || ''
  const queryString = hash.includes('?') ? hash.split('?')[1] : ''
  const params = new URLSearchParams(queryString)
  return {
    bookId: params.get('bookId') || '',
    fileUrl: params.get('fileUrl') || params.get('pdf') || '',
    title: params.get('title') || 'Untitled Book',
    author: params.get('author') || 'Unknown Author',
    cover: params.get('cover') || '',
    cfi: params.get('cfi') || '',
  }
}

function toAbsoluteUrl(value) {
  const raw = (value || '').trim()
  if (!raw) return ''
  if (raw.startsWith('/uploads/')) return API ? `${API}${raw}` : raw
  if (raw.startsWith('uploads/')) return API ? `${API}/${raw}` : `/${raw}`
  return raw
}

function getLocationsKey(bookId, fileUrl) {
  const urlHash = (fileUrl || '')
    .split('')
    .reduce((hash, char) => (((hash << 5) - hash) + char.charCodeAt(0)) | 0, 0)
    .toString(36)
  return `epub-locations-${bookId || 'unknown'}-${urlHash}`
}

function getActiveHref(locationHref = '') {
  return locationHref.split('#')[0].split('/').pop() || ''
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
    'p:first-of-type::first-letter': {
      float: 'left',
      'font-size': '3.4em',
      'line-height': '0.9',
      'padding-right': '0.12em',
      'font-weight': '600',
      'font-family': 'Iowan Old Style, Palatino, Georgia, Charter, serif',
    },
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

  const [currentCfi, setCurrentCfi] = useState('')
  const [currentSpineIndex, setCurrentSpineIndex] = useState(0)
  const [showChrome, setShowChrome] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMatches, setSearchMatches] = useState(0)

  const viewerRef = useRef(null)
  const frameRef = useRef(null)
  const searchInputRef = useRef(null)
  const bookRef = useRef(null)
  const renditionRef = useRef(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const locationTimerRef = useRef(null)
  const spineItemsRef = useRef([])
  const spineIndexRef = useRef(0)
  const progressMetaRef = useRef({ percentage: 0, currentPage: 1, totalPages: 1, chapterTitle: '', chapterIndex: 0 })
  const lastScrollYRef = useRef(0)
  const currentCfiRef = useRef('')
  const currentChapterRef = useRef('')
  const bookIdRef = useRef('')
  const locationsReadyRef = useRef(false)

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
  const locationsKey = useMemo(() => getLocationsKey(bookId, fileUrl), [bookId, fileUrl])

  const authUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('authUser')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [])
  const userId = authUser?._id || ''

  const {
    currentPage,
    totalPages,
    progressPercentage: progressPercent,
    locationCfi: savedLocationCfi,
    loading: progressLoading,
    updateProgress,
    triggerSave,
  } = useReadingProgress(bookId, userId, 'epub')

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
      debugError('Next chapter error:', e)
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
      debugError('Prev chapter error:', e)
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
    currentChapterRef.current = currentChapterLabel
  }, [currentChapterLabel])

  useEffect(() => {
    bookIdRef.current = bookId
  }, [bookId])

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

  const initialProgressLoadedRef = useRef(false)
  const initialCfiRef = useRef('')

  useEffect(() => {
    initialProgressLoadedRef.current = false
    locationsReadyRef.current = false
    initialCfiRef.current = ''
  }, [bookId])

  useEffect(() => {
    if (!progressLoading && savedLocationCfi && !initialCfiRef.current) {
      initialCfiRef.current = savedLocationCfi
    }
  }, [progressLoading, savedLocationCfi])

  useEffect(() => {
    if (progressLoading) return undefined
    if (initialProgressLoadedRef.current) return undefined
    if (!viewerRef.current || !fileUrl || !bookId) return undefined

    initialProgressLoadedRef.current = true
    let isDestroyed = false

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
          allowScriptedContent: true,
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

        await book.ready

        const onLocationChanged = (loc) => {
          if (!locationsReadyRef.current) {
            debugLog('[Progress] Skipping locationChanged: locations are not ready')
            return
          }
          if (locationTimerRef.current) window.clearTimeout(locationTimerRef.current)
          locationTimerRef.current = window.setTimeout(() => {
            const currentLocationObj = rendition.currentLocation()
            const currentCfiVal = currentLocationObj?.start?.cfi || loc?.start?.cfi || ''
            if (!currentCfiVal) return

            const totalLocs = book.locations.total || 0
            if (totalLocs <= 1) {
              debugLog('[Progress] Skipping: totalLocations is too small:', totalLocs)
              return
            }

            const locationHref = loc?.start?.href || ''
            const activeFile = getActiveHref(locationHref)
            setActiveFilename(activeFile)
            const match = toc.find((item) => getActiveHref(item?.href || '') === activeFile)
            if (match) {
              setCurrentChapterLabel(match.label || '')
              currentChapterRef.current = match.label || ''
            }

            const idx = spineItemsRef.current.findIndex((item) => (
              locationHref.includes(item?.href || '') || (item?.href || '').includes(locationHref)
            ))
            if (idx >= 0) updateSpineIndex(idx)

            setCurrentCfi(currentCfiVal)
            currentCfiRef.current = currentCfiVal
            setEpubSavedCfi({ bookId, fileUrl, cfi: currentCfiVal })

            let currentLocation = book.locations.locationFromCfi(currentCfiVal)
            if (currentLocation === undefined || currentLocation === -1) {
              const rawPercent = Number(book.locations.percentageFromCfi(currentCfiVal))
              const percent = Number.isFinite(rawPercent) ? rawPercent : 0
              currentLocation = Math.round(percent * totalLocs)
            }
            if (currentLocation === undefined || currentLocation === -1) {
              currentLocation = 0
            }

            const pageNumber = Math.max(1, Math.min(totalLocs, currentLocation + 1))
            
            console.log('[Progress] EPUB Location updated:', {
              pageNumber,
              totalLocs,
              cfi: currentCfiVal,
            })

            // Sync with progress hook
            updateProgress({
              currentPage: pageNumber,
              totalPages: totalLocs,
              locationCfi: currentCfiVal,
            })
          }, 300)
        }

        rendition.on('locationChanged', onLocationChanged)

        const savedCfi = initialCfiRef.current || params.cfi || getEpubSavedCfi({ bookId, fileUrl }) || ''

        if (savedCfi) {
          debugLog('[Progress] Displaying CFI:', savedCfi)
          setEpubSavedCfi({ bookId, fileUrl, cfi: savedCfi })
          await rendition.display(savedCfi)
        } else {
          debugLog('[Progress] Displaying CFI: beginning')
          await rendition.display()
        }

        if (!isDestroyed) {
          setLoadingState('ready')
        }

        // Generate locations asynchronously in the background so it is completely non-blocking
        (async () => {
          try {
            debugLog('[Locations] Generating locations in background...')
            await book.locations.generate(1024)
            if (!isDestroyed) {
              locationsReadyRef.current = true
              debugLog('[Locations] Background generation complete. Total:', book.locations.total)
              
              // Trigger a manual page calculation now that locations are ready
              const currentLocObj = rendition.currentLocation()
              if (currentLocObj) {
                onLocationChanged(currentLocObj)
              }
            }
          } catch (e) {
            debugLog('[Locations] Background generation error:', e)
          }
        })()
      } catch {
        if (!isDestroyed) {
          setLoadingState('error')
          setErrorMessage('Failed to load book. Please try again.')
        }
      }
    }

    initReader()

    return () => {
      isDestroyed = true
      if (locationTimerRef.current) window.clearTimeout(locationTimerRef.current)
      if (renditionRef.current?.destroy) renditionRef.current.destroy()
      if (bookRef.current) {
        bookRef.current.destroy()
        bookRef.current = null
        renditionRef.current = null
      }
    }
  }, [bookId, fileUrl, progressLoading, updateProgress])


  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false)
        setSearchQuery('')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [searchOpen])

  useEffect(() => {
    if (!searchOpen || !searchInputRef.current) return
    searchInputRef.current.focus()
  }, [searchOpen])

  useEffect(() => {
    const node = viewerRef.current
    if (!node) return undefined

    let touchY = 0
    const onWheel = (e) => {
      if (e.deltaY > 2) setShowChrome(false)
      if (e.deltaY < -2) setShowChrome(true)
    }
    const onTouchStartLocal = (e) => {
      touchY = e.touches[0].clientY
    }
    const onTouchMove = (e) => {
      const currentY = e.touches[0].clientY
      const delta = touchY - currentY
      if (delta > 8) setShowChrome(false)
      if (delta < -8) setShowChrome(true)
      touchY = currentY
    }
    const onWindowScroll = () => {
      const y = window.scrollY
      if (y > lastScrollYRef.current + 5) setShowChrome(false)
      if (y < lastScrollYRef.current - 5) setShowChrome(true)
      lastScrollYRef.current = y
    }

    node.addEventListener('wheel', onWheel, { passive: true })
    node.addEventListener('touchstart', onTouchStartLocal, { passive: true })
    node.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('scroll', onWindowScroll, { passive: true })
    return () => {
      node.removeEventListener('wheel', onWheel)
      node.removeEventListener('touchstart', onTouchStartLocal)
      node.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('scroll', onWindowScroll)
    }
  }, [])

  const clearSearchHighlights = () => {
    const contents = renditionRef.current?.getContents?.() || []
    contents.forEach((content) => {
      const doc = content?.document
      if (!doc) return
      const marks = doc.querySelectorAll('mark[data-reader-highlight="1"]')
      marks.forEach((mark) => {
        const text = doc.createTextNode(mark.textContent || '')
        mark.replaceWith(text)
      })
      doc.body?.normalize?.()
    })
    setSearchMatches(0)
  }

  const applySearchHighlights = (query) => {
    if (!query.trim()) {
      clearSearchHighlights()
      return
    }
    clearSearchHighlights()
    const q = query.toLowerCase()
    let count = 0
    const contents = renditionRef.current?.getContents?.() || []
    contents.forEach((content) => {
      const doc = content?.document
      if (!doc?.body) return
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
      const toReplace = []
      let textNode = walker.nextNode()
      while (textNode) {
        const text = textNode.nodeValue || ''
        if (text.trim() && text.toLowerCase().includes(q) && textNode.parentElement?.tagName !== 'MARK') {
          toReplace.push(textNode)
        }
        textNode = walker.nextNode()
      }
      toReplace.forEach((node) => {
        const text = node.nodeValue || ''
        const lower = text.toLowerCase()
        let from = 0
        let idx = lower.indexOf(q, from)
        if (idx < 0) return
        const frag = doc.createDocumentFragment()
        while (idx >= 0) {
          if (idx > from) frag.appendChild(doc.createTextNode(text.slice(from, idx)))
          const mark = doc.createElement('mark')
          mark.setAttribute('data-reader-highlight', '1')
          mark.style.background = '#fde047'
          mark.style.color = '#111827'
          mark.textContent = text.slice(idx, idx + q.length)
          frag.appendChild(mark)
          count += 1
          from = idx + q.length
          idx = lower.indexOf(q, from)
        }
        if (from < text.length) frag.appendChild(doc.createTextNode(text.slice(from)))
        node.parentNode?.replaceChild(frag, node)
      })
    })
    setSearchMatches(count)
  }

  useEffect(() => {
    applySearchHighlights(searchQuery)
  }, [searchQuery, currentCfi])

  const handleChapterClick = async (item, index) => {
    const rendition = renditionRef.current
    if (!rendition || !item?.href) return

    try {
      await rendition.display(item.href)
      if (typeof index === 'number') {
        updateSpineIndex(index)
      }
    } catch (e) {
      debugError('Chapter navigation failed:', item.href, e)
    }
    setActiveFilename(getActiveHref(item.href || ''))
    setCurrentChapterLabel(item.label || '')
    setSidebarOpen(false)
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

  const chapterEstimatePages = Math.max(1, Math.round(totalPages / Math.max(1, tocItems.length)))
  const activeChapterNumber = Math.max(1, currentSpineIndex + 1)
  const coverUrl = toAbsoluteUrl(params.cover)

  const bookmarkCurrentLocation = async () => {
    if (!currentCfi) return
    const authUser = getAuthUser()
    if (!authUser?._id || !bookId) return
    try {
      await triggerSave(true)
    } catch (err) {
      debugError('Bookmark save failed:', err)
    }
  }

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow
    const prevHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevBodyOverflow
      document.documentElement.style.overflow = prevHtmlOverflow
    }
  }, [])

  return (
    <section
      className={`reader-prose fixed inset-0 h-screen w-screen transition-colors duration-300
        ${isDarkMode
          ? 'dark bg-[#030712] text-slate-100'
          : 'bg-[#f8f6f1] text-slate-900'
        }`}
    >
      <div ref={frameRef} className={`relative h-screen w-screen overflow-hidden ${isFullscreen ? 'fullscreen' : ''}`}>
        {/* Top Reading Progress Bar */}
        <div className="fixed left-0 right-0 top-0 z-50 h-1.5 w-full bg-slate-800/20">
          <div
            className="h-full bg-gradient-to-r from-blue-400 via-indigo-500 to-violet-600 transition-all duration-300 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <header
          className={`glass-strong fixed inset-x-0 top-0 z-40 h-14 transition-transform duration-300
            ${showChrome ? 'translate-y-0' : '-translate-y-full'}
            ${isDarkMode ? 'border-white/10' : 'border-black/[8%]'}`}
        >
          <div className="flex h-full w-full items-center gap-3 px-6">
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10 transition"
              aria-label="Toggle table of contents"
            >
              <MdMenu className="text-xl" />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-[13px] font-semibold uppercase tracking-[0.14em] opacity-90">
                {params.title}
                <span className="ml-2 inline-flex items-center rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                  {progressPercent}% complete
                </span>
              </p>
              <p className="truncate text-[11px] opacity-60">
                {currentChapterLabel || 'Reading View'}
              </p>
            </div>
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={() => setSearchOpen((v) => !v)}
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10 transition"
                aria-label="Search">
                <MdSearch className="text-lg" />
              </button>
              <button type="button" onClick={bookmarkCurrentLocation}
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10 transition"
                aria-label="Bookmark">
                <MdBookmarkBorder className="text-lg" />
              </button>
              <button type="button" onClick={() => setIsDarkMode((v) => !v)}
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10 transition"
                aria-label="Toggle theme">
                {isDarkMode ? <MdLightMode className="text-lg" /> : <MdDarkMode className="text-lg" />}
              </button>
              <button type="button" onClick={toggleFullscreen}
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10 transition"
                aria-label="Fullscreen">
                {isFullscreen ? <MdFullscreenExit className="text-lg" /> : <MdFullscreen className="text-lg" />}
              </button>
            </div>
          </div>
          <div className={`h-px w-full ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`}>
            <div
              className="h-px bg-gradient-to-r from-primary via-primary/80 to-primary/40 transition-[width] duration-150"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </header>

        {searchOpen && (
          <div className="fixed inset-x-0 top-14 z-40 animate-reader-fade-up px-4 sm:px-5">
            <div className={`glass-strong mx-auto flex max-w-[720px] items-center gap-2 rounded-2xl p-2
              ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              <MdSearch className="shrink-0 text-lg opacity-60" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in this chapter…"
                className="h-10 w-full bg-transparent text-sm outline-none placeholder:opacity-40"
              />
              {searchMatches > 0 && (
                <span className="shrink-0 rounded-full bg-yellow-400/20 px-2 py-0.5 text-xs text-yellow-500">
                  {searchMatches} found
                </span>
              )}
              <button type="button"
                onClick={() => { setSearchOpen(false); setSearchQuery('') }}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-white/10"
                aria-label="Close search">
                <MdClose />
              </button>
            </div>
          </div>
        )}

        <div className="relative flex h-screen w-full">
          <div
            className={`fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity md:hidden
              ${sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            onClick={() => setSidebarOpen(false)}
          />

          <aside
            className={`glass fixed left-5 top-[68px] z-30 hidden h-[calc(100vh-84px)] w-[360px]
              overflow-hidden rounded-2xl transition-all duration-300 md:flex md:flex-col shadow-2xl
              ${sidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-[120%] opacity-0 pointer-events-none'}`}
          >
            <div className={`border-b p-5 ${isDarkMode ? 'border-white/10' : 'border-black/[8%]'}`}>
              <div className="mb-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-slate-200 hover:bg-white/20"
                  aria-label="Close table of contents"
                >
                  <MdClose />
                </button>
              </div>
              <div className="flex items-center gap-3">
                {coverUrl ? (
                  <img src={coverUrl} alt={params.title} className="h-14 w-12 rounded-xl object-cover shadow-md" />
                ) : (
                  <div className="grid h-14 w-12 place-items-center rounded-xl bg-primary/20 text-base font-bold shadow-md">
                    {(params.title || 'B').slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-[36px] font-semibold leading-tight">{params.title}</p>
                  <p className="mt-0.5 truncate text-[27px] opacity-55">{params.author}</p>
                </div>
              </div>
            </div>

            <p className={`px-4 pt-3 pb-1 text-[11px] font-semibold tracking-[0.18em] uppercase opacity-45
              ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Contents
            </p>

            <div className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
              {tocItems.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleChapterClick(item, index)}
                  className={`toc-item ${isTocItemActive(item) ? 'active' : ''} w-full rounded-2xl px-4 py-3 text-left transition-all
                    ${isTocItemActive(item)
                      ? isDarkMode
                        ? 'bg-primary/10 text-slate-100'
                        : 'bg-primary/10 text-slate-900'
                      : `${isDarkMode ? 'text-slate-400 hover:bg-white/5 hover:text-slate-100' : 'text-slate-600 hover:bg-black/[4%] hover:text-slate-900'}`
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`grid h-7 min-w-[1.75rem] place-items-center rounded-xl px-1 text-[12px]
                      ${isTocItemActive(item)
                        ? 'bg-primary/30 text-primary'
                        : isDarkMode ? 'bg-white/10' : 'bg-black/10'
                      }`}>
                      {index + 1}
                    </span>
                    <span className="truncate text-[16px] leading-snug">{item.label}</span>
                    {isTocItemActive(item) && (
                      <MdBookmarkBorder className="ml-auto shrink-0 text-xs text-primary" />
                    )}
                  </div>
                  <p className="mt-0.5 pl-[1.875rem] text-[13px] opacity-45">{chapterEstimatePages} pages</p>
                </button>
              ))}
            </div>
          </aside>

          <aside
            className={`glass fixed inset-x-0 bottom-0 z-40 max-h-[75vh] rounded-t-3xl px-4 pt-4 pb-8
              transition-transform duration-300 md:hidden
              ${sidebarOpen ? 'translate-y-0' : 'translate-y-full'}`}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-current opacity-20" />
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Contents</p>
              <button type="button" onClick={() => setSidebarOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10">
                <MdClose />
              </button>
            </div>

            <div className="mb-3 flex items-center gap-3">
              {coverUrl ? (
                <img src={coverUrl} alt={params.title} className="h-12 w-9 rounded-lg object-cover shadow" />
              ) : (
                <div className="grid h-12 w-9 place-items-center rounded-lg bg-primary/20 text-xs font-bold">
                  {(params.title || 'B').slice(0, 1)}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{params.title}</p>
                <p className="truncate text-xs opacity-50">{params.author}</p>
              </div>
            </div>

            <div className="scrollbar-thin max-h-[50vh] overflow-y-auto">
              {tocItems.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleChapterClick(item, index)}
                  className={`toc-item ${isTocItemActive(item) ? 'active' : ''} mb-1 w-full rounded-xl px-3 py-2.5 text-left transition-all
                    ${isTocItemActive(item)
                      ? isDarkMode ? 'bg-white/10 font-semibold' : 'bg-black/[8%] font-semibold'
                      : 'hover:bg-white/5'
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`grid h-5 min-w-[1.25rem] place-items-center rounded-full px-1 text-[10px]
                      ${isTocItemActive(item) ? 'bg-primary/30 text-primary' : isDarkMode ? 'bg-white/10' : 'bg-black/10'}`}>
                      {index + 1}
                    </span>
                    <span className="truncate text-[13px]">{item.label}</span>
                    {isTocItemActive(item) && (
                      <MdBookmarkBorder className="ml-auto shrink-0 text-xs text-primary" />
                    )}
                  </div>
                  <p className="mt-0.5 pl-[1.875rem] text-[11px] opacity-40">{chapterEstimatePages} pages</p>
                </button>
              ))}
            </div>
          </aside>

          <main className="h-full w-full overflow-hidden">
            <div className="flex h-full w-full flex-col pt-14">

              {loadingState === 'loading' && (
                <div className="grid h-44 place-items-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-50" />
                    <p className="text-sm opacity-60">Loading book...</p>
                  </div>
                </div>
              )}

              {loadingState === 'error' && (
                <div className="p-8 text-center">
                  <p className="mb-4 opacity-80">{errorMessage}</p>
                  <button
                    type="button"
                    className="rounded-full bg-primary/20 px-5 py-2 text-sm font-medium hover:bg-primary/30 transition"
                    onClick={() => window.location.reload()}
                  >
                    Try Again
                  </button>
                </div>
              )}

              <div
                id="viewer"
                ref={viewerRef}
                className="h-full w-full flex-1 overflow-hidden leading-relaxed"
                style={{ visibility: loadingState === 'ready' ? 'visible' : 'hidden' }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              />

              <div className={`h-1 overflow-hidden ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`}>
                <div
                  className="h-full rounded-full bg-primary/70 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className={`mt-1 text-center text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Page {currentPage} of {totalPages} · {progressPercent}% complete
              </p>
            </div>
          </main>
        </div>

        <div
          className={`fixed inset-x-0 bottom-6 z-40 flex flex-col items-center gap-2 px-3
            transition-transform duration-300 ${showChrome ? 'translate-y-0' : 'translate-y-28'}`}
        >
          <div className={`glass-strong flex items-center gap-1 rounded-full p-1.5 shadow-2xl
            ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            <button type="button" onClick={goPrevChapter}
              className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 transition"
              aria-label="Previous chapter">
              <MdChevronLeft className="text-xl" />
            </button>
            <button type="button" onClick={decreaseFontSize}
              className="h-10 rounded-full px-3.5 text-sm font-medium hover:bg-white/10 transition">
              A-
            </button>
            <button type="button" onClick={increaseFontSize}
              className="h-10 rounded-full px-3.5 text-sm font-semibold hover:bg-white/10 transition">
              A+
            </button>
            <button type="button" onClick={bookmarkCurrentLocation}
              className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 transition"
              aria-label="Bookmark">
              <MdBookmarkBorder className="text-lg" />
            </button>
            <button type="button" onClick={() => setIsDarkMode((v) => !v)}
              className="hidden h-10 items-center gap-1.5 rounded-full px-3.5 text-sm hover:bg-white/10 transition md:inline-flex">
              {isDarkMode ? <MdLightMode className="text-base" /> : <MdDarkMode className="text-base" />}
              {isDarkMode ? 'Light' : 'Dark'}
            </button>
            <button type="button" onClick={toggleFullscreen}
              className="hidden h-10 items-center gap-1.5 rounded-full px-3.5 text-sm hover:bg-white/10 transition md:inline-flex">
              {isFullscreen ? <MdFullscreenExit className="text-base" /> : <MdFullscreen className="text-base" />}
              {isFullscreen ? 'Exit' : 'Full'}
            </button>
            <button type="button" onClick={goNextChapter}
              className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 transition"
              aria-label="Next chapter">
              <MdChevronRight className="text-xl" />
            </button>
          </div>
          <div className={`text-center text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} hidden md:block`}>
            {Math.round(progressPercent)}% · Chapter {activeChapterNumber}
          </div>

          <div className="flex gap-2 md:hidden">
            <button type="button" onClick={() => setIsDarkMode((v) => !v)}
              className="glass-strong h-8 rounded-full px-4 text-xs font-medium transition hover:bg-white/10">
              {isDarkMode ? 'Light' : 'Dark'}
            </button>
            <button type="button" onClick={() => { window.location.hash = '' }}
              className="glass-strong h-8 rounded-full px-4 text-xs font-medium transition hover:bg-white/10">
              Exit
            </button>
          </div>
        </div>

      </div>
    </section>
  )
}
