import { useEffect, useMemo, useRef, useState } from 'react'
import ePub from 'epubjs'
import {
  MdBookmarkBorder,
  MdClose,
  MdDarkMode,
  MdFullscreen,
  MdFullscreenExit,
  MdFavorite,
  MdFavoriteBorder,
  MdLightMode,
  MdMenu,
  MdMoreVert,
  MdSearch,
} from 'react-icons/md'
import { API_ORIGIN } from '../lib/apiConfig'
import apiClient from '../lib/apiClient'
import { getEpubSavedCfi, setEpubSavedCfi } from '../lib/readingProgress'
import useReadingProgress from '../hooks/useReadingProgress'
import useSavedBooks from '../hooks/useSavedBooks'
import './epubReader.css'

const API = API_ORIGIN
const SWIPE_MIN_DISTANCE = 80

function forceScrollReset(rendition) {
  if (!rendition) return
  const container = rendition.manager?.container
  if (container) {
    container.scrollTop = 0
    container.scrollLeft = 0
  }
}
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



function normalizeId(value) {
  if (value == null) return ''
  if (typeof value === 'object') return String(value._id || value.id || value.toString() || '')
  return String(value)
}

function normalizeHref(value = '') {
  return decodeURIComponent(String(value).split('#')[0].split('?')[0].split('/').pop() || '')
}

function getActiveHref(locationHref = '') {
  return normalizeHref(locationHref)
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

function buildThemeStyles(theme, fontSize = 18, isDesktop = false) {
  let bgColor = '#faf8f4'
  let textColor = '#111827'
  
  if (theme === 'dark') {
    bgColor = '#0f0f0f'
    textColor = '#e8e8e8'
  } else if (theme === 'sepia') {
    bgColor = '#f4ecd8'
    textColor = '#5c4a1e'
  }

  return {
    body: {
      padding: `${isDesktop ? 48 : 24}px !important`,
      color: textColor,
      background: bgColor,
      'line-height': '1.8 !important',
      'font-size': `${fontSize}px !important`,
      '-webkit-font-smoothing': 'antialiased',
      'box-sizing': 'border-box',
      'max-width': '680px !important',
      width: '100% !important',
      margin: '0 auto !important',
    },
    html: {
      background: `${bgColor} !important`,
    },
    p: { 
      'margin-bottom': '1.5em',
      'line-height': '1.8',
    },
    ul: {
      'max-width': '600px',
      margin: '0 auto 1.5em auto',
      padding: '0 20px',
      'list-style-type': 'none',
    },
    ol: {
      'max-width': '600px',
      margin: '0 auto 1.5em auto',
      padding: '0 20px',
      'list-style-type': 'none',
    },
    li: {
      margin: '0.8em 0',
      padding: '0',
      'line-height': '1.8',
    },
    'p:first-of-type::first-letter': {
      float: 'left',
      'font-size': '3.4em',
      'line-height': '0.9',
      'padding-right': '0.12em',
      'font-weight': '600',
      'font-family': 'Iowan Old Style, Palatino, Georgia, Charter, serif',
    },
    img: { 'max-width': '100%', height: 'auto' },
    a: { 
      color: theme === 'dark' ? '#93c5fd' : '#1d4ed8',
      'text-decoration': 'none',
      transition: 'color 0.2s ease, opacity 0.2s ease',
      'font-weight': '500',
    },
    'a:hover': {
      color: theme === 'dark' ? '#c084fc' : '#6366f1',
      'text-decoration': 'underline',
      opacity: '0.95',
    },
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
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('epubTheme')
    if (saved === 'dark' || saved === 'light' || saved === 'sepia') return saved
    return 'light'
  })
  const isDarkMode = theme === 'dark'
  const setIsDarkMode = (val) => {
    const nextVal = typeof val === 'function' ? val(theme === 'dark') : val
    setTheme(nextVal ? 'dark' : 'light')
  }
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [fontSize, setFontSize] = useState(() => {
    const saved = parseInt(localStorage.getItem('reader-font-size') || '', 10)
    if (Number.isFinite(saved) && saved >= 12 && saved <= 28) return saved
    if (Number.isFinite(saved) && saved > 40) return Math.max(12, Math.min(28, Math.round((saved / 100) * 18)))
    return window.innerWidth >= 768 ? 16 : 18
  })
  const [tocItems, setTocItems] = useState([])
  const [activeFilename, setActiveFilename] = useState('')
  const [currentChapterLabel, setCurrentChapterLabel] = useState('')
  const [currentSpineIndex, setCurrentSpineIndex] = useState(0)
  const [spineCount, setSpineCount] = useState(0)

  const [currentCfi, setCurrentCfi] = useState('')
  const [showChrome, setShowChrome] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMatches, setSearchMatches] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const viewerRef = useRef(null)
  const frameRef = useRef(null)
  const toolbarMenuRef = useRef(null)
  const searchInputRef = useRef(null)
  const bookRef = useRef(null)
  const renditionRef = useRef(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const locationTimerRef = useRef(null)
  const spineItemsRef = useRef([])
  const spineIndexRef = useRef(0)
  const lastScrollYRef = useRef(0)
  const currentCfiRef = useRef('')
  const currentChapterRef = useRef('')
  const bookIdRef = useRef('')
  const locationsReadyRef = useRef(false)
  const isDesktopRef = useRef(window.innerWidth >= 768)

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
  const { savedStatus, refresh: refreshSavedBooks } = useSavedBooks()
  const savedEntry = useMemo(() => savedStatus.find((item) => normalizeId(item.book) === normalizeId(bookId)), [bookId, savedStatus])
  const isBookSaved = Boolean(savedEntry)
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
    if (!Number.isFinite(idx) || idx < 0) return
    spineIndexRef.current = idx
    setCurrentSpineIndex(idx)
  }

  const findSpineIndexForHref = (href = '') => {
    const active = normalizeHref(href)
    if (!active) return -1
    return spineItemsRef.current.findIndex((item) => {
      const itemHref = normalizeHref(item?.href || item?.url || '')
      return itemHref === active
    })
  }

  const increaseFontSize = () => {
    const newSize = Math.min(fontSize + 2, 28)
    setFontSize(newSize)
    renditionRef.current?.themes.fontSize(`${newSize}px`)
    localStorage.setItem('reader-font-size', String(newSize))
  }

  const decreaseFontSize = () => {
    const newSize = Math.max(fontSize - 2, 12)
    setFontSize(newSize)
    renditionRef.current?.themes.fontSize(`${newSize}px`)
    localStorage.setItem('reader-font-size', String(newSize))
  }

  async function goNextChapter() {
    const items = spineItemsRef.current
    const nextIdx = spineIndexRef.current + 1
    if (!items || nextIdx >= items.length || !renditionRef.current) return
    try {
      await renditionRef.current.display(items[nextIdx].href)
      updateSpineIndex(nextIdx)
      forceScrollReset(renditionRef.current)
      setMenuOpen(false)
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
      forceScrollReset(renditionRef.current)
      setMenuOpen(false)
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
    localStorage.setItem('epubTheme', theme)
    if (!renditionRef.current) return
    
    let bgColor = '#faf8f4'
    let textColor = '#111827'
    if (theme === 'dark') {
      bgColor = '#0f0f0f'
      textColor = '#e8e8e8'
    } else if (theme === 'sepia') {
      bgColor = '#f4ecd8'
      textColor = '#5c4a1e'
    }

    renditionRef.current.themes.default({
      html: {
        background: `${bgColor} !important`,
      },
      body: {
        background: `${bgColor} !important`,
        color: `${textColor} !important`,
      },
    })
    renditionRef.current.themes.register('app-theme', buildThemeStyles(theme, fontSize, isDesktopRef.current))
    renditionRef.current.themes.select('app-theme')
  }, [theme, fontSize])

  useEffect(() => {
    if (!renditionRef.current) return
    renditionRef.current.themes.fontSize(`${fontSize}px`)
    localStorage.setItem('reader-font-size', String(fontSize))
  }, [fontSize])

  useEffect(() => {
    const onResize = () => {
      const nextIsDesktop = window.innerWidth >= 768
      if (nextIsDesktop === isDesktopRef.current) return
      isDesktopRef.current = nextIsDesktop
      if (!renditionRef.current) return
      renditionRef.current.themes.register('app-theme', buildThemeStyles(theme, fontSize, nextIsDesktop))
      renditionRef.current.themes.select('app-theme')
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [fontSize, theme])

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

        rendition.themes.register('app-theme', buildThemeStyles(theme, fontSize, isDesktopRef.current))
        rendition.themes.select('app-theme')
        rendition.themes.override('*', {
          'max-width': '100% !important',
          'overflow-x': 'hidden !important',
          'overflow-anchor': 'none !important',
        })
        rendition.themes.override('body', {
          margin: '0 !important',
          padding: `${isDesktopRef.current ? 48 : 24}px !important`,
          'max-width': '680px !important',
          width: '100% !important',
          'font-size': `${fontSize}px !important`,
          'line-height': '1.8 !important',
          'box-sizing': 'border-box !important',
          'overflow-anchor': 'none !important',
        })
        rendition.themes.override('div', {
          'max-width': '100% !important',
          width: '100% !important',
        })

        const rawSavedFontSize = parseInt(localStorage.getItem('reader-font-size') || '', 10)
        const savedFontSize = Number.isFinite(rawSavedFontSize) && rawSavedFontSize >= 12 && rawSavedFontSize <= 28
          ? rawSavedFontSize
          : fontSize
        rendition.themes.fontSize(`${savedFontSize}px`)
        setFontSize(savedFontSize)

        let initialBg = '#faf8f4'
        let initialText = '#111827'
        if (theme === 'dark') {
          initialBg = '#0f0f0f'
          initialText = '#e8e8e8'
        } else if (theme === 'sepia') {
          initialBg = '#f4ecd8'
          initialText = '#5c4a1e'
        }

        rendition.themes.default({
          html: {
            background: `${initialBg} !important`,
          },
          body: {
            background: `${initialBg} !important`,
            color: `${initialText} !important`,
          },
        })

        await book.loaded.navigation
        if (isDestroyed) return
        const nav = await book.loaded.navigation
        const toc = flattenToc(nav.toc || [])
        setTocItems(toc)

        await book.spine.ready
        if (isDestroyed) return
        spineItemsRef.current = book.spine?.spineItems || []
        setSpineCount(spineItemsRef.current.length)

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
            } else {
              const spineLabel = spineItemsRef.current[spineIndexRef.current]?.idref || params.title
              setCurrentChapterLabel(spineLabel)
              currentChapterRef.current = spineLabel
            }

            const idx = Number.isFinite(loc?.start?.index) ? loc.start.index : findSpineIndexForHref(locationHref)
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

  const handleChapterClick = async (item) => {
    const rendition = renditionRef.current
    if (!rendition || !item?.href) return

    try {
      await rendition.display(item.href)
      const spineIndex = findSpineIndexForHref(item.href)
      if (spineIndex >= 0) updateSpineIndex(spineIndex)
      
      // If navigating to a section without a specific hash anchor, force container scroll to 0 to prevent dynamic loading jumps
      if (!item.href.includes('#')) {
        forceScrollReset(rendition)
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

  const showToast = (message) => {
    setToastMessage(message)
    window.setTimeout(() => setToastMessage(''), 2200)
  }

  const toggleSaveToLibrary = async () => {
    if (!bookId) return
    try {
      if (isBookSaved) {
        await apiClient.delete(`/api/saved-books/${encodeURIComponent(bookId)}`)
        showToast('Removed from Library')
      } else {
        await apiClient.post(`/api/saved-books/${encodeURIComponent(bookId)}`)
        showToast('Saved to Library ❤️')
      }
      await refreshSavedBooks()
    } catch (err) {
      debugError('Save to library failed:', err)
      showToast('Could not update Library')
    }
  }

  const chapterEstimatePages = Math.max(1, Math.round(totalPages / Math.max(1, tocItems.length)))
  const coverUrl = toAbsoluteUrl(params.cover)
  const isFirstChapter = currentSpineIndex <= 0
  const isLastChapter = spineCount > 0 && currentSpineIndex >= spineCount - 1

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

  useEffect(() => {
    if (!menuOpen) return undefined
    const onPointerDown = (event) => {
      if (toolbarMenuRef.current?.contains(event.target)) return
      setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [menuOpen])

  return (
    <section
      className={`reader-prose fixed inset-0 h-screen w-screen transition-colors duration-300
        ${theme === 'dark'
          ? 'dark bg-[#0f0f0f] text-[#e8e8e8]'
          : theme === 'sepia'
            ? 'bg-[#f4ecd8] text-[#5c4a1e]'
            : 'bg-[#faf8f4] text-slate-900'
        }`}
    >
      <div ref={frameRef} className={`relative h-screen w-screen overflow-hidden ${isFullscreen ? 'fullscreen' : ''}`}>
        {/* Top Reading Progress Bar (Medium/Substack style) */}
        <div className="fixed left-0 right-0 top-0 z-[60] h-[3px] w-full">
          <div
            className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <header
          className={`glass-strong fixed inset-x-0 top-0 z-40 h-14 transition-transform duration-300
            ${showChrome ? 'translate-y-0' : '-translate-y-full'}
            ${theme === 'dark' ? 'border-white/10' : theme === 'sepia' ? 'border-[#5c4a1e]/15' : 'border-black/[8%]'}`}
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
              <h1 className="truncate text-sm md:text-base font-extrabold uppercase tracking-[0.06em] opacity-95">
                {currentChapterLabel || params.title}
                <span className="ml-2 inline-flex items-center rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-400">
                  {progressPercent}% complete
                </span>
              </h1>
              <p className="truncate text-[11px] md:text-xs font-semibold tracking-wider opacity-50">
                {params.title}
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
                  <img loading="lazy" src={coverUrl} alt={params.title} className="h-14 w-12 rounded-xl object-cover shadow-md" />
                ) : (
                  <div className="grid h-14 w-12 place-items-center rounded-xl bg-primary/20 text-base font-bold shadow-md">
                    {(params.title || 'B').slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold leading-tight">{params.title}</p>
                  <p className="mt-0.5 truncate text-xs opacity-55">{params.author}</p>
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
                <img loading="lazy" src={coverUrl} alt={params.title} className="h-12 w-9 rounded-lg object-cover shadow" />
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
          </aside>          <main className="h-full w-full overflow-hidden">
            <div className="flex h-full w-full flex-col pt-14 pb-24 md:pb-28">

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

              <div className="flex-1 h-full w-full overflow-hidden px-6 md:px-12">
                <div
                  id="viewer"
                  ref={viewerRef}
                  className="mx-auto h-full w-full max-w-[680px] flex-1 text-[18px] leading-[1.8] md:text-[16px]"
                  style={{ visibility: loadingState === 'ready' ? 'visible' : 'hidden' }}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                />
              </div>

              {loadingState === 'ready' && (
                <div className="flex flex-col items-center justify-center py-4 px-6 mt-2">
                  <p className={`text-center text-[11px] tracking-widest uppercase font-semibold opacity-60
                    ${theme === 'dark' ? 'text-slate-500' : theme === 'sepia' ? 'text-[#5c4a1e]/70' : 'text-slate-500'}`}>
                    Page {currentPage} of {totalPages} <span className="mx-2">•</span> {Math.round(progressPercent)}% complete
                  </p>
                </div>
              )}
            </div>
          </main>
        </div>

        {toastMessage && (
          <div className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-xl">
            {toastMessage}
          </div>
        )}

        <div
          ref={toolbarMenuRef}
          className={`fixed inset-x-0 bottom-5 z-50 flex flex-col items-center px-4 transition-transform duration-300
            ${showChrome ? 'translate-y-0' : 'translate-y-28 md:translate-y-32'}`}
        >
          {menuOpen && (
            <div
              className={`mb-3 w-full max-w-[340px] animate-reader-fade-in rounded-lg border p-3 shadow-2xl backdrop-blur-xl
                ${theme === 'dark'
                  ? 'border-white/10 bg-[#171717]/95 text-slate-100'
                  : theme === 'sepia'
                    ? 'border-[#5c4a1e]/15 bg-[#f1e3c2]/95 text-[#5c4a1e]'
                    : 'border-black/10 bg-white/95 text-slate-900'
                }`}
            >
              <div className="flex items-center justify-between gap-2 border-b border-current/10 pb-3">
                <span className="text-xs font-bold uppercase opacity-55">Font size</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={decreaseFontSize} className="h-9 rounded-md px-4 text-sm font-bold hover:bg-current/10" aria-label="Decrease font size">
                    A-
                  </button>
                  <button type="button" onClick={increaseFontSize} className="h-9 rounded-md px-4 text-base font-bold hover:bg-current/10" aria-label="Increase font size">
                    A+
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-b border-current/10 py-3">
                <span className="text-xs font-bold uppercase opacity-55">Theme</span>
                <div className="grid grid-cols-3 gap-1 rounded-md bg-current/5 p-1">
                  {['dark', 'light', 'sepia'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setTheme(option)}
                      className={`h-9 rounded px-3 text-xs font-bold capitalize transition ${theme === option ? 'bg-primary text-white shadow' : 'hover:bg-current/10'}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <button type="button" onClick={toggleFullscreen} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-md text-sm font-bold hover:bg-current/10">
                {isFullscreen ? <MdFullscreenExit className="text-lg" /> : <MdFullscreen className="text-lg" />}
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </button>

              <button type="button" onClick={toggleSaveToLibrary} className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-md text-sm font-bold hover:bg-current/10">
                {isBookSaved ? <MdFavorite className="text-lg text-rose-500" /> : <MdFavoriteBorder className="text-lg" />}
                {isBookSaved ? 'Saved to Library' : 'Save to Library'}
              </button>
            </div>
          )}

          <div
            className={`grid h-14 w-full max-w-[680px] grid-cols-[1fr_56px_1fr] items-center gap-2 rounded-lg border p-1.5 shadow-2xl backdrop-blur-xl
              ${theme === 'dark'
                ? 'border-white/10 bg-[#171717]/95 text-slate-100'
                : theme === 'sepia'
                  ? 'border-[#5c4a1e]/15 bg-[#f1e3c2]/95 text-[#5c4a1e]'
                  : 'border-black/10 bg-white/95 text-slate-900'
              }`}
          >
            <button
              type="button"
              onClick={goPrevChapter}
              disabled={isFirstChapter}
              className="h-full rounded-md px-3 text-xs font-extrabold uppercase transition hover:bg-current/10 disabled:cursor-not-allowed disabled:opacity-35 md:text-sm"
            >
              ← Prev Chapter
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="grid h-full place-items-center rounded-md text-2xl transition hover:bg-current/10"
              aria-label="Open reader menu"
              aria-expanded={menuOpen}
            >
              <MdMoreVert />
            </button>
            <button
              type="button"
              onClick={goNextChapter}
              disabled={isLastChapter}
              className="h-full rounded-md px-3 text-xs font-extrabold uppercase transition hover:bg-current/10 disabled:cursor-not-allowed disabled:opacity-35 md:text-sm"
            >
              Next Chapter →
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
