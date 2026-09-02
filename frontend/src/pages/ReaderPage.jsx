import React, { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import apiClient from '../lib/apiClient'
import safeStorage from '../lib/safeStorage'
import useSavedBooks from '../hooks/useSavedBooks'
import ReaderTopBar from '../components/reader/ReaderTopBar'
import ReaderSidebar from '../components/reader/ReaderSidebar'
import ReaderContent from '../components/reader/ReaderContent'
import ReaderBottomBar from '../components/reader/ReaderBottomBar'
import './readerTheme.css'

const THEME_STORAGE_KEY = 'lumina_reader_theme'
const FONT_SIZE_STORAGE_KEY = 'lumina_reader_font_size'

export default function ReaderPage({ book: initialBook = null }) {
  const { bookSlug, id } = useParams()
  const navigate = useNavigate()
  const authUser = useMemo(() => {
    try {
      const raw = safeStorage.getItem('authUser')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [])
  const { isBookSaved, toggleSavedBook } = useSavedBooks(initialBook?._id || '')

  const identifier = useMemo(() => {
    return (
      initialBook?.slug ||
      initialBook?._id ||
      bookSlug ||
      id ||
      ''
    )
  }, [initialBook, bookSlug, id])

  // Theme & Font Size State
  const [theme, setTheme] = useState(() => {
    return safeStorage.getItem(THEME_STORAGE_KEY) || 'dark'
  })
  const [fontSize, setFontSize] = useState(() => {
    const saved = Number(safeStorage.getItem(FONT_SIZE_STORAGE_KEY))
    return saved >= 14 && saved <= 28 ? saved : 18
  })

  // Parse & Loading State
  const [parseStatus, setParseStatus] = useState('pending')
  const [parseError, setParseError] = useState(null)
  const [isReparsing, setIsReparsing] = useState(false)

  // Chapter & Content State
  const [bookDetails, setBookDetails] = useState(initialBook || null)
  const [chapters, setChapters] = useState([])
  const [currentChapterNumber, setCurrentChapterNumber] = useState(1)
  const [currentChapter, setCurrentChapter] = useState(null)
  const [chapterLoading, setChapterLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Sync Theme to HTML data attribute
  useEffect(() => {
    safeStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  // Sync Font Size to localStorage
  useEffect(() => {
    safeStorage.setItem(FONT_SIZE_STORAGE_KEY, String(fontSize))
  }, [fontSize])

  const showToast = (msg) => {
    setToastMessage(msg)
    window.setTimeout(() => setToastMessage(''), 2500)
  }

  // 1. Initial Parse Status Check & Polling
  useEffect(() => {
    if (!identifier) return

    let isMounted = true
    let pollTimer = null

    const checkStatus = async () => {
      try {
        const response = await apiClient.get(`/api/books/slug/${encodeURIComponent(identifier)}/parse-status`)
        if (!isMounted) return

        const status = response.data?.parseStatus || 'pending'
        const error = response.data?.parseError || null

        setParseStatus(status)
        setParseError(error)

        if (status === 'completed') {
          // Fetch chapters list
          fetchChaptersList()
        } else if (status === 'pending' || status === 'processing') {
          // Poll again in 2.5s
          pollTimer = setTimeout(checkStatus, 2500)
        }
      } catch (err) {
        if (!isMounted) return
        // Try ID-based fallback if slug 404s
        try {
          const fallbackRes = await apiClient.get(`/api/books/${encodeURIComponent(identifier)}/parse-status`)
          const status = fallbackRes.data?.parseStatus || 'pending'
          setParseStatus(status)
          setParseError(fallbackRes.data?.parseError || null)
          if (status === 'completed') {
            fetchChaptersList()
          } else if (status === 'pending' || status === 'processing') {
            pollTimer = setTimeout(checkStatus, 2500)
          }
        } catch (fallbackErr) {
          setParseStatus('failed')
          setParseError(fallbackErr.response?.data?.message || 'Failed to check book status')
        }
      }
    }

    checkStatus()

    return () => {
      isMounted = false
      if (pollTimer) clearTimeout(pollTimer)
    }
  }, [identifier])

  // 2. Fetch Chapters List
  const fetchChaptersList = async () => {
    try {
      const response = await apiClient.get(`/api/books/slug/${encodeURIComponent(identifier)}/chapters`)
      const fetchedChapters = response.data?.chapters || []
      setChapters(fetchedChapters)
      if (response.data?.title) {
        setBookDetails((prev) => ({
          ...prev,
          title: response.data.title,
          author: response.data.author,
          totalChapters: response.data.totalChapters,
        }))
      }

      // Load first chapter
      if (fetchedChapters.length > 0) {
        loadChapter(1)
      }
    } catch (err) {
      try {
        const fallbackRes = await apiClient.get(`/api/books/${encodeURIComponent(identifier)}/chapters`)
        const fetchedChapters = fallbackRes.data?.chapters || []
        setChapters(fetchedChapters)
        if (fetchedChapters.length > 0) {
          loadChapter(1)
        }
      } catch (e) {
        console.error('Failed to load chapters list:', e)
      }
    }
  }

  // 3. Load Chapter Content
  const loadChapter = async (chapNum) => {
    setChapterLoading(true)
    try {
      let response
      try {
        response = await apiClient.get(
          `/api/books/slug/${encodeURIComponent(identifier)}/chapters/${chapNum}`
        )
      } catch {
        response = await apiClient.get(
          `/api/books/${encodeURIComponent(identifier)}/chapters/${chapNum}`
        )
      }

      if (response.data?.chapter) {
        setCurrentChapter(response.data.chapter)
        setCurrentChapterNumber(chapNum)
        window.scrollTo({ top: 0, behavior: 'smooth' })

        // Save progress to backend if authenticated
        if (authUser && (bookDetails?._id || response.data.bookId)) {
          const bookId = bookDetails?._id || response.data.bookId
          const totalChaps = response.data.totalChapters || chapters.length || 1
          const pct = Math.round((chapNum / totalChaps) * 100)
          apiClient.post('/api/progress', {
            bookId,
            currentPage: chapNum,
            totalPages: totalChaps,
            progressPercentage: pct,
            chapterTitle: response.data.chapter.chapterTitle,
            chapterIndex: chapNum - 1,
          }).catch(() => {})
        }
      }
    } catch (err) {
      console.error(`Failed to load chapter ${chapNum}:`, err)
      showToast('Could not load chapter content')
    } finally {
      setChapterLoading(false)
    }
  }

  // 4. Manual Retry Reparse
  const handleRetryParse = async () => {
    setIsReparsing(true)
    try {
      await apiClient.post(`/api/books/slug/${encodeURIComponent(identifier)}/reparse`)
      setParseStatus('pending')
      setParseError(null)
      showToast('Re-parsing scheduled...')
    } catch {
      try {
        await apiClient.post(`/api/books/${encodeURIComponent(identifier)}/reparse`)
        setParseStatus('pending')
        setParseError(null)
      } catch (err) {
        showToast('Failed to trigger re-parse')
      }
    } finally {
      setIsReparsing(false)
    }
  }

  // Navigation handlers
  const totalChapters = bookDetails?.totalChapters || chapters.length || 1
  const hasPrev = currentChapterNumber > 1
  const hasNext = currentChapterNumber < totalChapters

  const handlePrevChapter = () => {
    if (hasPrev) {
      loadChapter(currentChapterNumber - 1)
      showToast(`Chapter ${currentChapterNumber - 1}`)
    }
  }

  const handleNextChapter = () => {
    if (hasNext) {
      loadChapter(currentChapterNumber + 1)
      showToast(`Chapter ${currentChapterNumber + 1}`)
    }
  }

  const handleFontSizeChange = (delta) => {
    setFontSize((prev) => Math.min(28, Math.max(14, prev + delta * 2)))
  }

  const progressPercent = Math.round((currentChapterNumber / Math.max(1, totalChapters)) * 100)

  // ----------------------------------------------------
  // Render: Preparing / Parsing State
  // ----------------------------------------------------
  if (parseStatus === 'pending' || parseStatus === 'processing') {
    return (
      <div
        data-reader-theme={theme}
        className="reader-canvas-container grid min-h-screen place-items-center px-4"
      >
        <div className="reader-floating-pill mx-auto max-w-md w-full rounded-3xl p-8 text-center space-y-5 animate-reader-fade-up">
          <div className="relative mx-auto grid h-16 w-16 place-items-center">
            <div className="absolute inset-0 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin" />
            <span className="text-2xl animate-pulse">📖</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold" style={{ color: 'var(--reader-heading)' }}>
              Preparing your book...
            </h2>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--reader-subtext)' }}>
              We are parsing and formatting chapters for a distraction-free, elegant reading experience.
            </p>
          </div>

          <div className="mx-auto h-1.5 w-48 rounded-full bg-black/20 dark:bg-white/10 overflow-hidden">
            <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 animate-pulse" />
          </div>

          <p className="text-[11px] font-mono text-purple-400 opacity-80">
            {parseStatus === 'processing' ? 'Formatting typography & quotes...' : 'Queued in background...'}
          </p>
        </div>
      </div>
    )
  }

  // ----------------------------------------------------
  // Render: Parse Failed State
  // ----------------------------------------------------
  if (parseStatus === 'failed') {
    return (
      <div
        data-reader-theme={theme}
        className="reader-canvas-container grid min-h-screen place-items-center px-4"
      >
        <div className="reader-floating-pill mx-auto max-w-md w-full rounded-3xl p-8 text-center space-y-5 animate-reader-fade-up">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-rose-500/10 text-2xl text-rose-400">
            ⚠️
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-rose-400">
              Could not prepare book
            </h2>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--reader-subtext)' }}>
              {parseError || 'An error occurred while parsing the EPUB file.'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/books')}
              className="rounded-full px-5 py-2 text-xs font-semibold text-slate-400 hover:bg-white/5 transition"
            >
              Back to Catalog
            </button>
            <button
              type="button"
              onClick={handleRetryParse}
              disabled={isReparsing}
              className="rounded-full bg-gradient-to-r from-violet-600 to-pink-600 px-6 py-2 text-xs font-bold text-white shadow-lg shadow-purple-500/20 hover:opacity-90 transition disabled:opacity-50"
            >
              {isReparsing ? 'Retrying...' : 'Retry Parsing'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ----------------------------------------------------
  // Render: Native Reader
  // ----------------------------------------------------
  return (
    <div data-reader-theme={theme} className="reader-canvas-container min-h-screen relative">
      {/* Top Floating Pill Toolbar */}
      <ReaderTopBar
        bookTitle={bookDetails?.title || 'Book-Verse Reader'}
        chapterTitle={currentChapter?.chapterTitle}
        chapterNumber={currentChapterNumber}
        progressPercent={progressPercent}
        theme={theme}
        onThemeChange={setTheme}
        fontSize={fontSize}
        onFontSizeChange={handleFontSizeChange}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        isBookmarked={Boolean(isBookSaved)}
        onToggleBookmark={() => {
          toggleSavedBook()
          showToast(isBookSaved ? 'Removed bookmark' : 'Bookmarked chapter ❤️')
        }}
      />

      {/* Left Sliding Table of Contents Drawer */}
      <ReaderSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        bookTitle={bookDetails?.title || 'Book-Verse'}
        currentChapterTitle={currentChapter?.chapterTitle}
        currentChapterNumber={currentChapterNumber}
        chapters={chapters}
        onSelectChapter={loadChapter}
      />

      {/* Main Reading Canvas */}
      <main className="w-full">
        {chapterLoading ? (
          <div className="grid min-h-[70vh] place-items-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500/30 border-t-purple-500" />
              <p className="text-xs opacity-60" style={{ color: 'var(--reader-subtext)' }}>
                Loading chapter...
              </p>
            </div>
          </div>
        ) : (
          <ReaderContent
            chapterNumber={currentChapterNumber}
            chapterTitle={currentChapter?.chapterTitle}
            paragraphs={currentChapter?.paragraphs || []}
            pullQuote={currentChapter?.pullQuote}
            fontSize={fontSize}
          />
        )}
      </main>

      {/* Bottom Floating Navigation Pill Bar */}
      <ReaderBottomBar
        currentChapterNumber={currentChapterNumber}
        totalChapters={totalChapters}
        progressPercent={progressPercent}
        onPrevChapter={handlePrevChapter}
        onNextChapter={handleNextChapter}
        hasPrev={hasPrev}
        hasNext={hasNext}
      />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-full bg-slate-950/90 border border-white/10 px-5 py-2 text-xs font-semibold text-white shadow-2xl backdrop-blur-xl animate-reader-fade-up">
          {toastMessage}
        </div>
      )}
    </div>
  )
}
