import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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
  MdBook,
  MdVolumeUp,
  MdTranslate,
} from 'react-icons/md'
import { API_ORIGIN } from '../lib/apiConfig'
import apiClient from '../lib/apiClient'
import { getEpubSavedCfi, setEpubSavedCfi } from '../lib/readingProgress'
import useReadingProgress from '../hooks/useReadingProgress'
import useSavedBooks from '../hooks/useSavedBooks'
import './epubReader.css'

const SUPPORTED_LANGUAGES = [
  { code: 'hi', label: 'Hindi' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'zh-CN', label: 'Chinese' },
]

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

const HIGHLIGHT_COLOR_MAP = {
  purple: '#a855f7',
  yellow: '#eab308',
  green: '#22c55e',
  pink: '#ec4899',
}

function parseReaderParams(book = null) {
  if (book) {
    return {
      bookId: book._id || book.id || '',
      fileUrl: book.fileUrl || book.pdf || '',
      title: book.title || 'Untitled Book',
      author: book.author || 'Unknown Author',
      cover: book.coverImage || book.thumbnail || '',
      cfi: '',
    }
  }

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

function getReaderPadding(isDesktop = false) {
  return isDesktop ? 80 : 8
}

function calculatePopupPosition(geometry, popupHeight, popupWidth = 300) {
  if (!geometry) return { top: 100, left: 100 }

  const topBoundary = 65
  let top = geometry.top - 12

  if (top - popupHeight < topBoundary) {
    // Flip below the selection if there is not enough space above
    top = geometry.bottom + 12 + popupHeight
  }

  // Prevent going off the bottom of the viewport
  if (top > window.innerHeight - 20) {
    top = window.innerHeight - 20
  }

  // Ensure it never goes above the top boundary even after clamping
  if (top - popupHeight < topBoundary) {
    top = topBoundary + popupHeight
  }

  const halfWidth = popupWidth / 2
  const selectionCenterX = geometry.left + geometry.width / 2
  const left = Math.max(halfWidth + 10, Math.min(window.innerWidth - (halfWidth + 10), selectionCenterX))

  return { top, left }
}

function applyTooltipsToAnnotations(rendition) {
  if (!rendition || !rendition.manager || !rendition.manager.views) return

  rendition.manager.views.forEach((view) => {
    const doc = view.document
    if (!doc) return

    const annotations = doc.querySelectorAll('.epubjs-annotation')
    annotations.forEach((annot) => {
      let hasNote = false
      annot.classList.forEach((cls) => {
        if (cls.endsWith('-has-note')) {
          hasNote = true
        }
      })

      const tooltipText = hasNote ? 'Has a note — click to view' : 'Click to view options'

      let titleEl = annot.querySelector('title')
      if (!titleEl) {
        titleEl = doc.createElementNS('http://www.w3.org/2000/svg', 'title')
        annot.appendChild(titleEl)
      }
      titleEl.textContent = tooltipText
    })
  })
}

function truncateMobileTitle(value = '') {
  const title = value || 'Untitled Book'
  return title.length > 20 ? `${title.slice(0, 20)}...` : title
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
  let textColor = '#1e293b'

  if (theme === 'dark') {
    bgColor = '#090c15'
    textColor = '#cbd5e1'
  } else if (theme === 'sepia') {
    bgColor = '#f4ecd8'
    textColor = '#3d2b1f'
  }

  return {
    body: {
      margin: '0 auto !important',
      padding: `${getReaderPadding(isDesktop)}px !important`,
      color: textColor,
      background: bgColor,
      'line-height': '1.85 !important',
      'font-size': `${fontSize}px !important`,
      'font-family': 'Charter, Merriweather, Georgia, Palatino, serif !important',
      '-webkit-font-smoothing': 'antialiased',
      'box-sizing': 'border-box',
      'max-width': '780px !important',
      width: '100% !important',
    },
    html: {
      background: `${bgColor} !important`,
    },
    p: {
      'margin-bottom': '1.6em',
      'line-height': '1.85',
      'letter-spacing': '0.01em',
    },
    h1: {
      'font-family': 'Charter, Merriweather, Georgia, serif',
      'font-weight': '800',
      'text-align': 'center',
      'margin-top': '2em',
      'margin-bottom': '0.5em',
      color: theme === 'dark' ? '#ffffff' : '#0f172a',
    },
    h2: {
      'font-family': 'Charter, Merriweather, Georgia, serif',
      'font-weight': '700',
      'text-align': 'center',
      'margin-top': '1.8em',
      'margin-bottom': '0.5em',
      color: theme === 'dark' ? '#f8fafc' : '#1e293b',
    },
    blockquote: {
      'border-left': '2px solid #ec4899',
      'padding-left': '24px',
      'margin': '28px 0',
      'font-style': 'italic',
      'background': 'rgba(236, 72, 153, 0.03)',
      'border-radius': '0 12px 12px 0',
      color: theme === 'dark' ? '#f1f5f9' : '#334155',
    },
    ul: {
      'max-width': 'none',
      margin: '0 0 1.5em 0',
      padding: '0 20px',
      'list-style-type': 'none',
    },
    ol: {
      'max-width': 'none',
      margin: '0 0 1.5em 0',
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
      'font-size': '3.2em',
      'line-height': '0.85',
      'padding-right': '0.15em',
      'padding-top': '0.05em',
      'font-weight': '800',
      color: theme === 'dark' ? '#f472b6' : '#ec4899',
      'font-family': 'Charter, Georgia, Palatino, serif',
    },
    img: { 'max-width': '100%', height: 'auto', 'border-radius': '12px' },
    a: {
      color: theme === 'dark' ? '#c084fc' : '#8b5cf6',
      'text-decoration': 'none',
      transition: 'color 0.2s ease, opacity 0.2s ease',
      'font-weight': '500',
    },
    'a:hover': {
      color: theme === 'dark' ? '#e879f9' : '#7c3aed',
      'text-decoration': 'underline',
      opacity: '0.95',
    },
    '::selection': {
      background: 'rgba(139, 92, 246, 0.35) !important',
    },
    '.hl-purple': {
      'background-color': 'rgba(168, 85, 247, 0.35) !important',
      'fill': '#a855f7 !important',
      'fill-opacity': '0.35 !important',
      'mix-blend-mode': 'multiply !important',
      'color': 'inherit !important',
    },
    '.hl-yellow': {
      'background-color': 'rgba(234, 179, 8, 0.35) !important',
      'fill': '#eab308 !important',
      'fill-opacity': '0.35 !important',
      'mix-blend-mode': 'multiply !important',
      'color': 'inherit !important',
    },
    '.hl-green': {
      'background-color': 'rgba(34, 197, 94, 0.35) !important',
      'fill': '#22c55e !important',
      'fill-opacity': '0.35 !important',
      'mix-blend-mode': 'multiply !important',
      'color': 'inherit !important',
    },
    '.hl-pink': {
      'background-color': 'rgba(236, 72, 153, 0.35) !important',
      'fill': '#ec4899 !important',
      'fill-opacity': '0.35 !important',
      'mix-blend-mode': 'multiply !important',
      'color': 'inherit !important',
    },
  }
}

function applyReaderStyles(rendition, theme, fontSize, isDesktop) {
  if (!rendition) return
  rendition.themes.register('app-theme', buildThemeStyles(theme, fontSize, isDesktop))
  rendition.themes.select('app-theme')
  rendition.themes.fontSize(`${fontSize}px`)
  rendition.themes.override('*', {
    'max-width': '100% !important',
    'overflow-x': 'hidden !important',
    'overflow-anchor': 'none !important',
  })
  rendition.themes.override('html', {
    background: 'transparent !important',
    'scroll-behavior': 'smooth !important',
    '-webkit-overflow-scrolling': 'touch !important',
  })
  rendition.themes.override('body', {
    margin: '0 auto !important',
    padding: `${getReaderPadding(isDesktop)}px !important`,
    'max-width': '780px !important',
    width: '100% !important',
    'font-size': `${fontSize}px !important`,
    'font-family': 'Charter, Merriweather, Georgia, serif !important',
    'line-height': '1.85 !important',
    'box-sizing': 'border-box !important',
    'overflow-anchor': 'none !important',
    'scroll-behavior': 'smooth !important',
    '-webkit-overflow-scrolling': 'touch !important',
  })

  if (!isDesktop) {
    rendition.themes.override('p', {
      'margin-left': '0 !important',
      'margin-right': '0 !important',
      'padding-left': '0 !important',
      'padding-right': '0 !important',
      'max-width': '100% !important',
    })
    rendition.themes.override('div', {
      'margin-left': '0 !important',
      'margin-right': '0 !important',
      'padding-left': '0 !important',
      'padding-right': '0 !important',
      'max-width': '100% !important',
      'width': '100% !important',
    })
    rendition.themes.override('blockquote', {
      'margin-left': '8px !important',
      'margin-right': '8px !important',
      'padding-left': '0 !important',
      'padding-right': '0 !important',
    })
    rendition.themes.override('h1', { 'margin-left': '0 !important', 'margin-right': '0 !important' })
    rendition.themes.override('h2', { 'margin-left': '0 !important', 'margin-right': '0 !important' })
    rendition.themes.override('h3', { 'margin-left': '0 !important', 'margin-right': '0 !important' })
    rendition.themes.override('h4', { 'margin-left': '0 !important', 'margin-right': '0 !important' })
    rendition.themes.override('h5', { 'margin-left': '0 !important', 'margin-right': '0 !important' })
    rendition.themes.override('h6', { 'margin-left': '0 !important', 'margin-right': '0 !important' })
  } else {
    rendition.themes.override('p', {
      'margin-left': '',
      'margin-right': '',
      'padding-left': '',
      'padding-right': '',
      'max-width': '',
    })
    rendition.themes.override('div', {
      'margin-left': '',
      'margin-right': '',
      'padding-left': '',
      'padding-right': '',
      'max-width': '',
      'width': '',
    })
    rendition.themes.override('blockquote', {
      'margin-left': '',
      'margin-right': '',
      'padding-left': '',
      'padding-right': '',
    })
    rendition.themes.override('h1', { 'margin-left': '', 'margin-right': '' })
    rendition.themes.override('h2', { 'margin-left': '', 'margin-right': '' })
    rendition.themes.override('h3', { 'margin-left': '', 'margin-right': '' })
    rendition.themes.override('h4', { 'margin-left': '', 'margin-right': '' })
    rendition.themes.override('h5', { 'margin-left': '', 'margin-right': '' })
    rendition.themes.override('h6', { 'margin-left': '', 'margin-right': '' })
  }
}

async function loadEpubBook(fileUrl) {
  try {
    const epubModule = await import('epubjs')
    const epub = epubModule.default || epubModule
    return epub(fileUrl)
  } catch {
    const response = await fetch(fileUrl)
    if (!response.ok) throw new Error(`Unable to fetch EPUB (${response.status})`)
    const buffer = await response.arrayBuffer()
    const epubModule = await import('epubjs')
    const epub = epubModule.default || epubModule
    return epub(buffer)
  }
}

export default function EpubReaderPage({ book = null }) {
  const [params, setParams] = useState(() => parseReaderParams(book))
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

  const [currentCfi, setCurrentCfi] = useState('')
  const [spineIndex, setSpineIndex] = useState(0)
  const [showChrome, setShowChrome] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMatches, setSearchMatches] = useState(0)
  const [searchResults, setSearchResults] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [selectedText, setSelectedText] = useState('')
  const [selectedCfiRange, setSelectedCfiRange] = useState('')
  const [toolbarPosition, setToolbarPosition] = useState(null)
  const [selectionContents, setSelectionContents] = useState(null)
  const [savingHighlight, setSavingHighlight] = useState(false)
  const [meaningPopup, setMeaningPopup] = useState(null)
  const meaningPopupRef = useRef(null)
  const meaningPopupRefState = useRef(null)
  const handleClosePopupRef = useRef(null)
  const [selectedLang, setSelectedLang] = useState('hi')
  const [translationState, setTranslationState] = useState({
    loading: false,
    text: '',
    error: '',
  })
  const [translatePopup, setTranslatePopup] = useState(null)
  const translatePopupRef = useRef(null)
  const translatePopupRefState = useRef(null)
  const [standaloneTranslation, setStandaloneTranslation] = useState({
    loading: false,
    text: '',
    error: '',
  })
  const selectionGeometryRef = useRef(null)
  const [highlights, setHighlights] = useState([])
  const highlightsRef = useRef([])
  useEffect(() => {
    highlightsRef.current = highlights
  }, [highlights])
  const [notePopup, setNotePopup] = useState(null)
  const notePopupRef = useRef(null)
  const notePopupRefState = useRef(null)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [saveNoteFeedback, setSaveNoteFeedback] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const handleHighlightClickRef = useRef(null)

  const viewerRef = useRef(null)
  const frameRef = useRef(null)
  const toolbarMenuRef = useRef(null)
  const searchInputRef = useRef(null)
  const bookRef = useRef(null)
  const renditionRef = useRef(null)
  const savingRef = useRef(false)
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
    setSpineIndex(idx)
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

  const handleHighlightClick = (cfiRange, highlightId) => {
    const hl = highlightsRef.current?.find(h => h._id === highlightId) || highlights.find(h => h._id === highlightId)
    const noteTextVal = hl ? hl.note : ''
    const textVal = hl ? hl.text : ''
    setNoteText(noteTextVal)

    let pos = { top: 150, left: 150 }
    if (renditionRef.current) {
      try {
        const range = renditionRef.current.getRange(cfiRange)
        const rect = range.getBoundingClientRect()
        const iframe = viewerRef.current.querySelector('iframe')
        if (iframe) {
          const iframeRect = iframe.getBoundingClientRect()
          const geometry = {
            top: iframeRect.top + rect.top,
            bottom: iframeRect.top + rect.bottom,
            left: iframeRect.left + rect.left,
            width: rect.width
          }
          pos = calculatePopupPosition(geometry, 280, 320)
        }
      } catch (err) {
        console.error('Failed to get highlight rect:', err)
        pos = { top: 150, left: 150 }
      }
    }

    setNotePopup({
      highlightId,
      cfiRange,
      text: textVal,
      note: noteTextVal,
      position: pos
    })

    setToolbarPosition(null)
    setMeaningPopup(null)
    setTranslatePopup(null)
    setShowDeleteConfirm(false)
    setSaveNoteFeedback('')
  }

  const handleColorClick = async (color) => {
    console.log(`[handleColorClick START] color=${color} cfiRange=${selectedCfiRange}`)
    
    if (!selectedCfiRange || !selectedText || savingRef.current) {
      console.log(`[handleColorClick BLOCKED] savingRef=${savingRef.current}`)
      return
    }

    try {
      savingRef.current = true
      setSavingHighlight(true)
      
      console.log(`[handleColorClick API CALL] Sending POST for color=${color}`)
      const response = await apiClient.post('/api/highlights', {
        book: bookId,
        cfiRange: selectedCfiRange,
        text: selectedText,
        color,
      })

      const nextHighlight = response.data?.data || response.data
      const highlightId = nextHighlight?._id
      setHighlights(prev => [...prev, nextHighlight])

      // Wrap the highlighted text visually in the book
      if (renditionRef.current && highlightId) {
        console.log(`[handleColorClick APPLY HIGHLIGHT] Adding annotation class=hl-${color} highlightId=${highlightId}`)
        renditionRef.current.annotations.add(
          'highlight',
          selectedCfiRange,
          { highlightId },
          () => {
            handleHighlightClickRef.current?.(selectedCfiRange, highlightId)
          },
          `hl-${color}`,
          {
            fill: HIGHLIGHT_COLOR_MAP[color] || '#a855f7',
            'fill-opacity': '0.35',
            'mix-blend-mode': 'multiply'
          }
        )
        setTimeout(() => {
          applyTooltipsToAnnotations(renditionRef.current)
        }, 50)
      }

      // Clear selection inside the iframe contents
      if (selectionContents) {
        try {
          const selection = selectionContents.window.getSelection()
          selection.removeAllRanges()
        } catch (err) {
          debugError('Failed to clear selection:', err)
        }
      }

      setToastMessage('Highlight saved successfully')
      setTimeout(() => setToastMessage(''), 2000)
      
      setSelectedText('')
      setSelectedCfiRange('')
      setToolbarPosition(null)
      setSelectionContents(null)
    } catch (err) {
      console.error('[Highlight Save Error]', err)
      setToastMessage('Failed to save highlight')
      setTimeout(() => setToastMessage(''), 2500)
    } finally {
      savingRef.current = false
      setSavingHighlight(false)
    }
  }

  const handleClosePopup = () => {
    setSelectedText('')
    setSelectedCfiRange('')
    setToolbarPosition(null)
    setSelectionContents(null)
    setMeaningPopup(null)
    setTranslatePopup(null)
    setNotePopup(null)
    setNoteText('')
    setShowDeleteConfirm(false)
    setSaveNoteFeedback('')
    setTranslationState({
      loading: false,
      text: '',
      error: '',
    })
    setStandaloneTranslation({
      loading: false,
      text: '',
      error: '',
    })
    if (selectionContents) {
      try {
        const selection = selectionContents.window.getSelection()
        selection.removeAllRanges()
      } catch (err) {
        debugError('Failed to clear selection:', err)
      }
    }
  }

  const handleTranslateStandalone = async (langCode = selectedLang, textToTranslate = selectedText) => {
    const cleanedText = textToTranslate.trim()
    if (!cleanedText) return

    setStandaloneTranslation({
      loading: true,
      text: '',
      error: ''
    })

    try {
      const response = await apiClient.get('/api/dictionary/translate', {
        params: {
          text: cleanedText,
          target: langCode,
        },
      })
      setStandaloneTranslation({
        loading: false,
        text: response.data?.data?.translatedText || response.data?.translatedText || '',
        error: '',
      })
    } catch (err) {
      console.error('[Standalone Translation Error]', err)
      setStandaloneTranslation({
        loading: false,
        text: '',
        error: 'Translation unavailable',
      })
    }
  }

  const handleTranslateClick = () => {
    const cleanedText = selectedText.trim()
    if (!cleanedText) return

    const pos = calculatePopupPosition(selectionGeometryRef.current, 300, 350)
    setTranslatePopup({
      text: cleanedText,
      position: pos
    })
    setMeaningPopup(null)
    setToolbarPosition(null)

    handleTranslateStandalone(selectedLang, cleanedText)
  }

  const handlePlayAudio = (url) => {
    if (!url) return
    try {
      new Audio(url).play().catch(err => {
        console.error('Audio playback failed:', err)
      })
    } catch (err) {
      console.error('Failed to play audio:', err)
    }
  }

  const handleMeaningClick = async () => {
    const cleanedText = selectedText.trim()
    if (!cleanedText) return

    const pos = calculatePopupPosition(selectionGeometryRef.current, 300, 300)
    setMeaningPopup({
      word: cleanedText,
      loading: true,
      data: null,
      error: null,
      position: pos
    })
    setTranslationState({
      loading: false,
      text: '',
      error: '',
    })
    setToolbarPosition(null)

    try {
      const response = await apiClient.get(`/api/dictionary/meaning/${encodeURIComponent(cleanedText)}`)
      setMeaningPopup(prev => {
        if (!prev || prev.word !== cleanedText) return prev
        return {
          ...prev,
          loading: false,
          data: response.data?.data || response.data
        }
      })
    } catch (err) {
      console.error('[Meaning Lookup Error]', err)
      const errMsg = err.response?.data?.message || 'No definition found'
      setMeaningPopup(prev => {
        if (!prev || prev.word !== cleanedText) return prev
        return {
          ...prev,
          loading: false,
          error: errMsg
        }
      })
    }
  }

  const handleTranslate = async () => {
    if (!meaningPopup?.word) return

    setTranslationState({
      loading: true,
      text: '',
      error: ''
    })

    try {
      const response = await apiClient.get('/api/dictionary/translate', {
        params: {
          text: meaningPopup.word,
          target: selectedLang,
        },
      })
      setTranslationState({
        loading: false,
        text: response.data?.data?.translatedText || response.data?.translatedText || '',
        error: '',
      })
    } catch (err) {
      console.error('[Translation Error]', err)
      setTranslationState({
        loading: false,
        text: '',
        error: 'Translation unavailable',
      })
    }
  }

  meaningPopupRefState.current = meaningPopup
  translatePopupRefState.current = translatePopup
  notePopupRefState.current = notePopup
  handleClosePopupRef.current = handleClosePopup
  handleHighlightClickRef.current = handleHighlightClick

  const handleSaveNote = async (highlightId, noteTextVal) => {
    try {
      setSavingNote(true)
      setSaveNoteFeedback('')

      const response = await apiClient.patch(`/api/highlights/${highlightId}`, {
        note: noteTextVal
      })

      const updatedHl = response.data?.data || response.data
      setHighlights(prev => prev.map(h => h._id === highlightId ? updatedHl : h))
      setNotePopup(prev => prev ? { ...prev, note: updatedHl.note } : null)

      // Dynamically update the visual indicator of the annotation in the book
      if (renditionRef.current && updatedHl.cfiRange) {
        renditionRef.current.annotations.remove(updatedHl.cfiRange, 'highlight')

        const hasNote = Boolean(updatedHl.note && updatedHl.note.trim())
        const className = hasNote ? `hl-${updatedHl.color}-has-note` : `hl-${updatedHl.color}`

        renditionRef.current.annotations.add(
          'highlight',
          updatedHl.cfiRange,
          { highlightId: updatedHl._id },
          () => {
            handleHighlightClickRef.current?.(updatedHl.cfiRange, updatedHl._id)
          },
          className,
          {
            fill: HIGHLIGHT_COLOR_MAP[updatedHl.color] || '#a855f7',
            'fill-opacity': '0.35',
            'mix-blend-mode': 'multiply'
          }
        )
        setTimeout(() => {
          applyTooltipsToAnnotations(renditionRef.current)
        }, 50)
      }

      setSaveNoteFeedback('Saved')
      setTimeout(() => setSaveNoteFeedback(''), 2000)
    } catch (err) {
      console.error('[Note Save Error]', err)
      setToastMessage('Failed to save note')
      setTimeout(() => setToastMessage(''), 2500)
    } finally {
      setSavingNote(false)
    }
  }

  const handleDeleteHighlight = async (cfiRange, highlightId) => {
    try {
      setToastMessage('Deleting highlight...')
      await apiClient.delete(`/api/highlights/${highlightId}`)

      if (renditionRef.current) {
        renditionRef.current.annotations.remove(cfiRange, 'highlight')
      }

      setHighlights(prev => prev.filter(h => h._id !== highlightId))

      setToastMessage('Highlight deleted')
      setTimeout(() => setToastMessage(''), 2000)

      handleClosePopup()
    } catch (err) {
      console.error('[Highlight Delete Error]', err)
      setToastMessage('Failed to delete highlight')
      setTimeout(() => setToastMessage(''), 2500)
    }
  }

  async function goNextChapter() {
    const items = spineItemsRef.current
    const nextIdx = spineIndexRef.current + 1
    if (!items || nextIdx >= items.length || !renditionRef.current) return
    try {
      const nextHref = items[nextIdx].href
      await renditionRef.current.display(nextHref)
      updateSpineIndex(nextIdx)
      const activeFile = getActiveHref(nextHref)
      setActiveFilename(activeFile)
      const match = toc.find((item) => getActiveHref(item?.href || '') === activeFile)
      const nextLabel = match?.label || toc[nextIdx]?.label || `Chapter ${nextIdx + 1}`
      setCurrentChapterLabel(nextLabel)
      currentChapterRef.current = nextLabel
      forceScrollReset(renditionRef.current)
      if (viewerRef.current) viewerRef.current.scrollTop = 0
      window.scrollTo({ top: 0, behavior: 'smooth' })
      showToast(`Jumped to ${nextLabel}`)
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
      const prevHref = items[prevIdx].href
      await renditionRef.current.display(prevHref)
      updateSpineIndex(prevIdx)
      const activeFile = getActiveHref(prevHref)
      setActiveFilename(activeFile)
      const match = toc.find((item) => getActiveHref(item?.href || '') === activeFile)
      const prevLabel = match?.label || toc[prevIdx]?.label || `Chapter ${prevIdx + 1}`
      setCurrentChapterLabel(prevLabel)
      currentChapterRef.current = prevLabel
      forceScrollReset(renditionRef.current)
      if (viewerRef.current) viewerRef.current.scrollTop = 0
      window.scrollTo({ top: 0, behavior: 'smooth' })
      showToast(`Jumped to ${prevLabel}`)
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
    if (book) {
      setParams(parseReaderParams(book))
      return undefined
    }

    const onHashChange = () => setParams(parseReaderParams())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [book])

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
    applyReaderStyles(renditionRef.current, theme, fontSize, isDesktopRef.current)
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
      applyReaderStyles(renditionRef.current, theme, fontSize, nextIsDesktop)
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

  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      const msg = event.reason?.message || ''
      if (
        msg.includes('message channel closed') ||
        msg.includes('A listener indicated') ||
        msg.includes('message port')
      ) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    const handleGlobalError = (event) => {
      const msg = event.message || ''
      if (
        msg.includes('message channel closed') ||
        msg.includes('A listener indicated') ||
        msg.includes('message port')
      ) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleGlobalError)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleGlobalError)
    }
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
    let activeBook = null
    let activeRendition = null

    const initReader = async () => {
      try {
        setLoadingState('loading')
        setErrorMessage('')

        if (locationTimerRef.current) window.clearTimeout(locationTimerRef.current)
        if (renditionRef.current?.destroy) {
          try { renditionRef.current.destroy() } catch { /* ignore */ }
        }
        if (bookRef.current) {
          try { bookRef.current.destroy() } catch { /* ignore */ }
          bookRef.current = null
          renditionRef.current = null
        }
        if (viewerRef.current) viewerRef.current.innerHTML = ''

        const book = await loadEpubBook(fileUrl)
        if (isDestroyed || !viewerRef.current) {
          try { book.destroy() } catch { /* ignore */ }
          return
        }
        bookRef.current = book
        activeBook = book

        const rendition = book.renderTo(viewerRef.current, {
          manager: 'continuous',
          flow: 'scrolled',
          width: '100%',
          height: '100%',
          allowScriptedContent: true,
          allowPopups: false,
          spread: 'none',
        })
        if (isDestroyed) {
          try { rendition.destroy() } catch { /* ignore */ }
          try { book.destroy() } catch { /* ignore */ }
          return
        }
        renditionRef.current = rendition
        activeRendition = rendition

        // Strip scripts to prevent sandbox blocked script execution warnings (runs after rendition's own hook to catch injected scripts too)
        book.spine.hooks.content.register((doc) => {
          if (!doc) return
          const scripts = doc.querySelectorAll('script')
          scripts.forEach((script) => script.remove())
        })

        rendition.on('selected', (cfiRange, contents) => {
          const selection = contents.window.getSelection()
          const selectedText = selection.toString().trim()
          if (!selectedText) {
            setSelectedText('')
            setSelectedCfiRange('')
            setToolbarPosition(null)
            setSelectionContents(null)
            return
          }

          if (selection.rangeCount === 0) return
          const range = selection.getRangeAt(0)
          const rects = range.getClientRects()
          const rect = rects.length > 0 ? rects[0] : range.getBoundingClientRect()
          const iframe = contents.window.frameElement
          if (!iframe) return

          const iframeRect = iframe.getBoundingClientRect()

          const geometry = {
            top: iframeRect.top + rect.top,
            bottom: iframeRect.top + rect.bottom,
            left: iframeRect.left + rect.left,
            width: rect.width
          }
          selectionGeometryRef.current = geometry

          const pos = calculatePopupPosition(geometry, 45, 200)

          setSelectedText(selectedText)
          setSelectedCfiRange(cfiRange)
          setSelectionContents(contents)
          setToolbarPosition(pos)
        })

        rendition.on('selectstart', () => {
          setToolbarPosition(null)
          setMeaningPopup(null)
          setTranslatePopup(null)
          setNotePopup(null)
          setShowDeleteConfirm(false)
          setSaveNoteFeedback('')
          setStandaloneTranslation({
            loading: false,
            text: '',
            error: '',
          })
        })

        book.spine.hooks.content.register((contents) => {
          if (!contents) return
          setTimeout(() => {
            applyTooltipsToAnnotations(renditionRef.current)
          }, 100)

          const doc = contents.document || contents
          if (doc && doc.addEventListener) {
            doc.addEventListener('click', () => {
              if ((meaningPopupRefState.current || translatePopupRefState.current || notePopupRefState.current) && handleClosePopupRef.current) {
                handleClosePopupRef.current()
                return
              }
              const win = contents.window || window
              const selection = win.getSelection ? win.getSelection() : null
              if (!selection || selection.toString().trim() === '') {
                setSelectedText('')
                setSelectedCfiRange('')
                setToolbarPosition(null)
                setSelectionContents(null)
              }
            })

            let spineTouchStartX = 0
            let spineTouchStartY = 0
            doc.addEventListener('touchstart', (e) => {
              spineTouchStartX = e.touches[0].clientX
              spineTouchStartY = e.touches[0].clientY
            }, { passive: true })
            doc.addEventListener('touchend', (e) => {
              const dx = spineTouchStartX - e.changedTouches[0].clientX
              const dy = Math.abs(spineTouchStartY - e.changedTouches[0].clientY)
              if (dy > 60) return
              if (dx > SWIPE_MIN_DISTANCE) {
                goNextChapter()
              } else if (dx < -SWIPE_MIN_DISTANCE) {
                goPrevChapter()
              }
            }, { passive: true })
          }
        })

        applyReaderStyles(rendition, theme, fontSize, isDesktopRef.current)

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

        rendition.on('rendered', () => {
          applyReaderStyles(rendition, theme, savedFontSize, isDesktopRef.current)
        })

        await book.loaded.navigation
        if (isDestroyed) {
          try { rendition.destroy() } catch { /* ignore */ }
          try { book.destroy() } catch { /* ignore */ }
          return
        }
        const nav = await book.loaded.navigation
        const toc = flattenToc(nav.toc || [])
        setTocItems(toc)

        await book.spine.ready
        if (isDestroyed) {
          try { rendition.destroy() } catch { /* ignore */ }
          try { book.destroy() } catch { /* ignore */ }
          return
        }
        spineItemsRef.current = book.spine?.spineItems || []

        await book.ready
        if (isDestroyed) {
          try { rendition.destroy() } catch { /* ignore */ }
          try { book.destroy() } catch { /* ignore */ }
          return
        }

        const onLocationChanged = (loc) => {
          setToolbarPosition(null)
          setMeaningPopup(null)
          setTranslatePopup(null)
          setNotePopup(null)
          setShowDeleteConfirm(false)
          setSaveNoteFeedback('')
          setStandaloneTranslation({
            loading: false,
            text: '',
            error: '',
          })
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
            const match = toc.find((item) => getActiveHref(item?.href || '') === activeFile)
            let resolvedLabel = match?.label
            if (!resolvedLabel && spineIndexRef.current >= 0 && toc[spineIndexRef.current]?.label) {
              resolvedLabel = toc[spineIndexRef.current].label
            }
            if (!resolvedLabel) {
              resolvedLabel = `Chapter ${spineIndexRef.current >= 0 ? spineIndexRef.current + 1 : 1}`
            }
            setCurrentChapterLabel(resolvedLabel)
            currentChapterRef.current = resolvedLabel

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

            if (import.meta.env.DEV) {
              console.log('[Progress] EPUB Location updated:', {
                pageNumber,
                totalLocs,
                cfi: currentCfiVal,
              })
            }

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

        try {
          const highlightsResponse = await apiClient.get(`/api/highlights/${bookId}`)
          const fetchedHighlights = highlightsResponse.data?.data || []
          setHighlights(fetchedHighlights)
          if (!isDestroyed) {
            fetchedHighlights.forEach((hl) => {
              if (hl.cfiRange) {
                const hasNote = Boolean(hl.note && hl.note.trim())
                const className = hasNote ? `hl-${hl.color}-has-note` : `hl-${hl.color}`
                rendition.annotations.add(
                  'highlight',
                  hl.cfiRange,
                  { highlightId: hl._id },
                  () => {
                    handleHighlightClickRef.current?.(hl.cfiRange, hl._id)
                  },
                  className,
                  {
                    fill: HIGHLIGHT_COLOR_MAP[hl.color] || '#a855f7',
                    'fill-opacity': '0.35',
                    'mix-blend-mode': 'multiply'
                  }
                )
              }
            })
            setTimeout(() => {
              applyTooltipsToAnnotations(rendition)
            }, 100)
          }
        } catch (err) {
          console.error('[Highlights Fetch Error]', err)
          if (!isDestroyed) {
            setToastMessage('Failed to load highlights')
            setTimeout(() => setToastMessage(''), 2500)
          }
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
      if (activeRendition?.destroy) {
        try { activeRendition.destroy() } catch { /* ignore */ }
      }
      if (activeBook?.destroy) {
        try { activeBook.destroy() } catch { /* ignore */ }
      }
      if (renditionRef.current?.destroy) {
        try { renditionRef.current.destroy() } catch { /* ignore */ }
      }
      if (bookRef.current) {
        try { bookRef.current.destroy() } catch { /* ignore */ }
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
        setSearchMatches(0)
        setSearchResults([])
        return
      }
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && window.innerWidth >= 768) {
        if (searchOpen && document.activeElement === searchInputRef.current) return
        if (e.key === 'ArrowLeft') goPrevChapter()
        if (e.key === 'ArrowRight') goNextChapter()
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

  const searchSpineFallback = async (query) => {
    const book = bookRef.current
    const items = spineItemsRef.current || []
    if (!book || !items.length) return []

    const resultGroups = await Promise.all(items.map(async (item) => {
      if (typeof item?.load !== 'function' || typeof item?.find !== 'function') return []
      try {
        await item.load(book.load.bind(book))
        return item.find(query) || []
      } catch (err) {
        debugError('EPUB search fallback failed:', err)
        return []
      } finally {
        item.unload?.()
      }
    }))
    return resultGroups.flat()
  }

  const runBookSearch = async (navigateToFirst = false) => {
    const query = searchQuery.trim()
    const rendition = renditionRef.current
    const book = rendition?.book || bookRef.current

    if (!query || !book) {
      setSearchResults([])
      setSearchMatches(0)
      return
    }

    try {
      const searcher = typeof rendition?.book?.search === 'function'
        ? rendition.book.search.bind(rendition.book)
        : typeof book.search === 'function'
          ? book.search.bind(book)
          : null
      const results = searcher ? await searcher(query) : await searchSpineFallback(query)
      const list = Array.isArray(results) ? results : []
      setSearchResults(list)
      setSearchMatches(list.length)
      if (navigateToFirst && list[0]?.cfi) {
        await rendition.display(list[0].cfi)
      }
    } catch (err) {
      debugError('EPUB search failed:', err)
      setSearchResults([])
      setSearchMatches(0)
    }
  }

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
    if (!authUser) {
      showToast('Login to continue')
      return
    }
    try {
      if (isBookSaved) {
        const response = await apiClient.delete(`/api/saved-books/${encodeURIComponent(savedEntry._id)}`)
        if (import.meta.env.DEV) console.log('[SavedBooks] Remove response:', response)
        showToast('Removed from Library')
      } else {
        const response = await apiClient.post('/api/saved-books', { bookId })
        if (import.meta.env.DEV) console.log('[SavedBooks] Save response:', response)
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
  const mobileHeaderTitle = truncateMobileTitle(params.title)

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

  useEffect(() => {
    if (!meaningPopup && !translatePopup && !notePopup) return undefined
    const onPointerDown = (event) => {
      if (meaningPopupRef.current?.contains(event.target)) return
      if (translatePopupRef.current?.contains(event.target)) return
      if (notePopupRef.current?.contains(event.target)) return
      handleClosePopup()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [meaningPopup, translatePopup, notePopup, selectionContents])

  return (
    <section
      className={`reader-prose fixed inset-0 h-screen w-screen transition-colors duration-300
        ${theme === 'dark'
          ? 'dark bg-[#090c15] text-[#cbd5e1]'
          : theme === 'sepia'
            ? 'bg-[#f4ecd8] text-[#3d2b1f]'
            : 'bg-[#faf8f4] text-slate-900'
        }`}
    >
      <div ref={frameRef} className={`relative h-screen w-screen overflow-hidden ${isFullscreen ? 'fullscreen' : ''}`}>
        {/* Top Floating Minimal Pill Toolbar */}
        <div className="fixed top-3 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
          <header
            className="pointer-events-auto flex items-center gap-3 sm:gap-5 rounded-full border border-white/10 bg-[#0e121e]/90 px-4 sm:px-6 py-2 shadow-2xl backdrop-blur-2xl text-xs font-semibold text-slate-200 transition duration-300"
          >
            {/* Table of Contents Toggle */}
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="text-slate-400 hover:text-white transition"
              title="Table of Contents"
            >
              <MdMenu className="h-4 w-4" />
            </button>

            {/* Theme Preset Badge */}
            <span className="hidden sm:inline font-bold text-white tracking-wide">
              {theme === 'dark' ? 'Lumina Noir' : theme === 'sepia' ? 'Lumina Sepia' : 'Lumina Pure'}
            </span>

            {/* Book Title & Chapter Label */}
            <span className="truncate max-w-[120px] sm:max-w-[200px] text-slate-300">
              {params.title} {currentChapterLabel ? `— ${currentChapterLabel}` : ''}
            </span>

            {/* Progress Badge */}
            <div className="rounded-full border border-purple-500/40 bg-purple-500/15 px-2.5 py-0.5 text-[10px] font-bold text-purple-300 shrink-0">
              {Math.round(progressPercent)}% Complete
            </div>

            <span className="hidden md:inline text-slate-600">|</span>

            {/* Font Size Adjuster Stepper: A- / A+ */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={decreaseFontSize}
                className="px-1.5 py-0.5 rounded hover:bg-white/10 text-slate-300 font-bold"
                title="Decrease Font Size"
              >
                A-
              </button>
              <button
                type="button"
                onClick={increaseFontSize}
                className="px-1.5 py-0.5 rounded hover:bg-white/10 text-slate-300 font-bold"
                title="Increase Font Size"
              >
                A+
              </button>
            </div>

            <span className="hidden md:inline text-slate-600">|</span>

            {/* Theme Switcher Pill (Light, Dark, Sepia) */}
            <div className="flex items-center gap-1 rounded-full bg-black/40 p-0.5 border border-white/5">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-1.5 rounded-full transition ${
                  theme === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Light Mode"
              >
                <MdLightMode className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-1.5 rounded-full transition ${
                  theme === 'dark' ? 'bg-[#1a2238] text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Lumina Noir Mode"
              >
                <MdDarkMode className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setTheme('sepia')}
                className={`p-1.5 rounded-full transition ${
                  theme === 'sepia' ? 'bg-[#c7b28b] text-[#2b1810] shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Sepia Mode"
              >
                <MdBook className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Search & Bookmark Actions */}
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              className="text-slate-400 hover:text-white transition"
              title="Search"
            >
              <MdSearch className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={bookmarkCurrentLocation}
              className={`transition ${isBookSaved ? 'text-pink-400' : 'text-slate-400 hover:text-white'}`}
              title="Bookmark Page"
            >
              <MdBookmarkBorder className="h-4 w-4" />
            </button>
          </header>
        </div>

        {searchOpen && (
          <div className="fixed inset-x-0 top-14 z-40 animate-reader-fade-up px-4 sm:px-5">
            <div className={`glass-strong mx-auto flex max-w-[720px] items-center gap-2 rounded-2xl p-2
              ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              <MdSearch className="shrink-0 text-lg opacity-60" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  if (!e.target.value.trim()) {
                    setSearchMatches(0)
                    setSearchResults([])
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') runBookSearch(true)
                }}
                placeholder="Search this book..."
                className="h-10 w-full bg-transparent text-sm outline-none placeholder:opacity-40"
              />
              {searchQuery.trim() && (
                <span className="shrink-0 rounded-full bg-yellow-400/20 px-2 py-0.5 text-xs text-yellow-500">
                  {searchResults.length || searchMatches} results found
                </span>
              )}
              <button type="button"
                onClick={() => runBookSearch(true)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-white/10"
                aria-label="Search book">
                <MdSearch />
              </button>
              <button type="button"
                onClick={() => { setSearchOpen(false); setSearchQuery(''); setSearchMatches(0); setSearchResults([]) }}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-white/10"
                aria-label="Close search">
                <MdClose />
              </button>
            </div>
          </div>
        )}

        <div className="relative flex h-screen w-full">
          <div
            className={`fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity
              ${sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            onClick={() => setSidebarOpen(false)}
          />

          <aside
            className={`fixed inset-y-0 left-0 z-50 flex h-full w-72 sm:w-80 flex-col justify-between border-r border-white/10 bg-[#0c101d] p-5 shadow-2xl backdrop-blur-2xl transition-transform duration-300 ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            {/* Drawer Header */}
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-tr from-violet-600 to-pink-500 text-xs font-black text-white shadow-md">
                    📑
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white leading-tight">Table of Contents</h2>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate max-w-[170px] mt-0.5">
                      {params.title} {currentChapterLabel ? `— ${currentChapterLabel}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
                  title="Close Drawer"
                >
                  <MdClose className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer Navigation Links */}
              <div className="space-y-1 pt-1 text-xs font-semibold">
                <Link
                  to="/saved-books"
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
                >
                  <MdBook className="h-4 w-4 text-slate-400" />
                  <span>Library</span>
                </Link>

                <div className="flex items-center gap-3 rounded-xl bg-violet-600/15 border border-violet-500/20 px-3 py-2 text-white font-bold">
                  <MdBookmarkBorder className="h-4 w-4 text-violet-400" />
                  <span>Table of Contents</span>
                </div>
              </div>

              {/* Chapter Items List */}
              <div className="max-h-[calc(100vh-280px)] overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                {tocItems.map((item, index) => {
                  const active = isTocItemActive(item)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleChapterClick(item, index)}
                      className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition ${
                        active
                          ? 'bg-violet-600/20 text-violet-300 font-bold border-l-2 border-violet-400'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-[11px] opacity-60 shrink-0">{index + 1}</span>
                        <span className="truncate">{item.label}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Bottom Drawer: Premium Reader Badge */}
            <div className="flex items-center gap-3 border-t border-white/[0.08] pt-4">
              <div className="grid h-8 w-8 place-items-center rounded-full border border-violet-400/30 bg-violet-500/10 text-xs text-violet-300">
                🛡️
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">Premium Reader</span>
                <span className="text-[10px] text-slate-400">All features unlocked</span>
              </div>
            </div>
          </aside>          <main className="h-full w-full overflow-hidden">
            <div className="flex h-full w-full flex-col pt-14 pb-6 md:pb-8">

              <div className="relative flex-1 w-full overflow-hidden px-0 sm:px-10 pt-4 pb-2">
                <div
                  id="viewer"
                  ref={viewerRef}
                  className="h-full w-full text-[18px] leading-[1.8] md:text-[16px]"
                  style={{ visibility: loadingState === 'ready' ? 'visible' : 'hidden' }}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                />

                {loadingState === 'loading' && (
                  <div className={`absolute inset-0 z-10 grid place-items-center
                    ${theme === 'dark' ? 'bg-[#0f0f0f] text-slate-400' : theme === 'sepia' ? 'bg-[#f4ecd8] text-[#5c4a1e]/80' : 'bg-[#faf8f4] text-slate-500'}`}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-50" />
                      <p className="text-sm opacity-60 font-semibold">Loading book...</p>
                    </div>
                  </div>
                )}

                {loadingState === 'error' && (
                  <div className={`absolute inset-0 z-10 grid place-items-center p-8 text-center
                    ${theme === 'dark' ? 'bg-[#0f0f0f] text-red-400' : theme === 'sepia' ? 'bg-[#f4ecd8] text-red-800' : 'bg-[#faf8f4] text-red-600'}`}
                  >
                    <div>
                      <p className="mb-4 opacity-80 font-semibold">{errorMessage}</p>
                      <button
                        type="button"
                        className="rounded-full bg-primary/20 px-5 py-2.5 text-sm font-bold hover:bg-primary/30 transition text-current"
                        onClick={() => window.location.reload()}
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {loadingState === 'ready' && (
                <div className="fixed bottom-4 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
                  <div className="pointer-events-auto flex items-center justify-between gap-4 sm:gap-6 rounded-full border border-white/10 bg-[#0e121e]/90 px-5 sm:px-6 py-2.5 shadow-2xl backdrop-blur-2xl text-xs font-semibold text-slate-200 max-w-xl w-full">
                    <button
                      type="button"
                      onClick={goPrevChapter}
                      disabled={spineIndex === 0}
                      className="flex items-center gap-1 text-slate-300 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <span>←</span>
                      <span className="hidden sm:inline">Previous Chapter</span>
                    </button>

                    <div className="flex flex-col items-center">
                      <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                        PAGE {currentPage} OF {totalPages} • {Math.round(progressPercent)}% COMPLETED
                      </span>
                      <div className="mt-1 h-1 w-28 sm:w-36 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500"
                          style={{ width: `${Math.max(5, progressPercent)}%` }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={goNextChapter}
                      disabled={spineIndex >= spineItemsRef.current.length - 1}
                      className="flex items-center gap-1 text-slate-300 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                    >
                      <span className="hidden sm:inline">Next Chapter</span>
                      <span>→</span>
                    </button>
                  </div>
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

        {toolbarPosition && !meaningPopup && !translatePopup && (
          <div
            className="highlight-toolbar animate-reader-fade-in"
            style={{
              top: `${toolbarPosition.top}px`,
              left: `${toolbarPosition.left}px`,
            }}
          >
            {['purple', 'yellow', 'green', 'pink'].map((color) => (
              <button
                key={color}
                type="button"
                className={`highlight-color-dot ${color} ${savingHighlight ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !savingHighlight && handleColorClick(color)}
                disabled={savingHighlight}
                title={`Highlight ${color}`}
              />
            ))}
            {(() => {
              const words = selectedText.trim().split(/\s+/).filter(Boolean)
              if (words.length > 0 && words.length <= 3) {
                return (
                  <>
                    <div className="toolbar-divider" />
                    <button
                      type="button"
                      className="toolbar-meaning-btn animate-reader-fade-in"
                      onClick={handleMeaningClick}
                      title="Look up meaning"
                    >
                      <MdBook className="w-4 h-4 mr-1 text-slate-300" />
                      <span className="text-xs font-medium text-slate-200">Meaning</span>
                    </button>
                  </>
                )
              }
              return null
            })()}
            <div className="toolbar-divider" />
            <button
              type="button"
              className="toolbar-meaning-btn animate-reader-fade-in"
              onClick={handleTranslateClick}
              title="Translate selection"
            >
              <MdTranslate className="w-4 h-4 mr-1 text-slate-300" />
              <span className="text-xs font-medium text-slate-200">Translate</span>
            </button>
          </div>
        )}

        {meaningPopup && (
          <div
            ref={meaningPopupRef}
            className="meaning-popup animate-reader-fade-in"
            style={{
              top: `${meaningPopup.position.top}px`,
              left: `${meaningPopup.position.left}px`,
            }}
          >
            <div className="meaning-popup-header">
              <span className="meaning-popup-title" title={meaningPopup.word}>
                {meaningPopup.word}
              </span>
              <button
                type="button"
                className="meaning-popup-close-btn"
                onClick={handleClosePopup}
                aria-label="Close meaning popup"
              >
                <MdClose className="w-4 h-4" />
              </button>
            </div>

            <div className="meaning-popup-body">
              {meaningPopup.loading ? (
                <div className="meaning-popup-loading">
                  <div className="meaning-popup-spinner" />
                  <span>Looking up...</span>
                </div>
              ) : (
                <>
                  {meaningPopup.error && (
                    <div className="meaning-popup-error">
                      {meaningPopup.error === 'No definition found'
                        ? 'No definition found for this word'
                        : meaningPopup.error}
                    </div>
                  )}

                  {meaningPopup.data && (
                    <>
                      <div className="meaning-popup-phonetic-row">
                        {meaningPopup.data.phonetic && (
                          <span className="meaning-popup-phonetic">{meaningPopup.data.phonetic}</span>
                        )}
                        {meaningPopup.data.audio && (
                          <button
                            type="button"
                            className="meaning-popup-audio-btn"
                            onClick={() => handlePlayAudio(meaningPopup.data.audio)}
                            title="Pronounce"
                          >
                            <MdVolumeUp className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="meaning-popup-definitions">
                        {meaningPopup.data.meanings &&
                          meaningPopup.data.meanings.slice(0, 2).map((m, idx) => (
                            <div key={idx} className="meaning-item">
                              <div className="meaning-item-header">
                                <span className="meaning-number-badge">{idx + 1}</span>
                                <span className="meaning-part-of-speech">{m.partOfSpeech}</span>
                              </div>
                              <p className="meaning-definition">{m.definition}</p>
                              {m.example && <p className="meaning-example">“{m.example}”</p>}
                            </div>
                          ))}
                        {(!meaningPopup.data.meanings || meaningPopup.data.meanings.length === 0) && (
                          <div className="meaning-popup-error">No definitions available.</div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Translation Section */}
                  <div className="meaning-popup-section-divider" />

                  <div className="translation-controls">
                    <select
                      value={selectedLang}
                      onChange={(e) => setSelectedLang(e.target.value)}
                      className="translation-lang-select"
                      aria-label="Select translation language"
                    >
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="translation-submit-btn"
                      onClick={handleTranslate}
                      disabled={translationState.loading}
                    >
                      {translationState.loading ? (
                        <div className="translation-spinner" />
                      ) : (
                        <>
                          <MdTranslate className="w-3.5 h-3.5 mr-1" />
                          <span>Translate</span>
                        </>
                      )}
                    </button>
                  </div>

                  {(translationState.loading || translationState.text || translationState.error) && (
                    <div className="translation-result-box animate-reader-fade-in">
                      {translationState.loading && (
                        <div className="translation-result-loading">Translating...</div>
                      )}
                      {translationState.error && (
                        <div className="translation-result-error">{translationState.error}</div>
                      )}
                      {translationState.text && (
                        <div className="translation-result-text">
                          <span className="translation-result-label">
                            {SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang)?.label || 'Translation'}:
                          </span>
                          <p className="translation-output">{translationState.text}</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {translatePopup && (
          <div
            ref={translatePopupRef}
            className="translate-popup animate-reader-fade-in"
            style={{
              top: `${translatePopup.position.top}px`,
              left: `${translatePopup.position.left}px`,
            }}
          >
            <div className="translate-popup-header">
              <span className="translate-popup-title">
                Translate
              </span>
              <button
                type="button"
                className="translate-popup-close-btn"
                onClick={handleClosePopup}
                aria-label="Close translate popup"
              >
                <MdClose className="w-4 h-4" />
              </button>
            </div>

            <div className="translate-popup-body">
              <div className="translate-popup-controls">
                <select
                  value={selectedLang}
                  onChange={(e) => {
                    const newLang = e.target.value
                    setSelectedLang(newLang)
                    handleTranslateStandalone(newLang, translatePopup.text)
                  }}
                  className="translation-lang-select"
                  aria-label="Select translation language"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="translate-popup-content">
                {standaloneTranslation.loading ? (
                  <div className="translate-popup-loading">
                    <div className="translate-popup-spinner" />
                    <span>Translating...</span>
                  </div>
                ) : standaloneTranslation.error ? (
                  <div className="translate-popup-error">
                    {standaloneTranslation.error}
                  </div>
                ) : standaloneTranslation.text ? (
                  <div className="translation-result-box" style={{ marginTop: 0 }}>
                    <div className="translation-result-text">
                      <span className="translation-result-label">
                        {SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang)?.label || 'Translation'}:
                      </span>
                      <p className="translation-output">{standaloneTranslation.text}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {notePopup && (
          <div
            ref={notePopupRef}
            className="note-popup animate-reader-fade-in"
            style={{
              top: `${notePopup.position.top}px`,
              left: `${notePopup.position.left}px`,
            }}
          >
            <div className="note-popup-header">
              <span className="note-popup-title">
                Highlight Options
              </span>
              <button
                type="button"
                className="note-popup-close-btn"
                onClick={handleClosePopup}
                aria-label="Close popup"
              >
                <MdClose className="w-4 h-4" />
              </button>
            </div>

            <div className="note-popup-body">
              <div className="note-popup-context">
                <p className="note-popup-text-quote">
                  “{notePopup.text.length > 150 ? `${notePopup.text.slice(0, 150)}...` : notePopup.text}”
                </p>
              </div>

              <div className="note-popup-textarea-container">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add a personal note to this highlight..."
                  className="note-popup-textarea"
                  maxLength={1000}
                />
              </div>

              <div className="note-popup-actions">
                {!showDeleteConfirm ? (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="note-save-btn"
                        onClick={() => handleSaveNote(notePopup.highlightId, noteText)}
                        disabled={savingNote}
                      >
                        {savingNote ? 'Saving...' : 'Save Note'}
                      </button>
                      {saveNoteFeedback && (
                        <span className="note-feedback-text animate-reader-fade-in">{saveNoteFeedback}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="note-delete-btn"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <div className="note-delete-confirm-box animate-reader-fade-in">
                    <span className="note-delete-confirm-label">Are you sure?</span>
                    <button
                      type="button"
                      className="note-confirm-delete-btn"
                      onClick={() => handleDeleteHighlight(notePopup.cfiRange, notePopup.highlightId)}
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      className="note-cancel-delete-btn"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}


      </div>
    </section>
  )
}
