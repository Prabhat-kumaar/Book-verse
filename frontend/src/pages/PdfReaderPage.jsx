import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { MdFullscreen } from 'react-icons/md'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

const API_BASE_URL = 'http://127.0.0.1:5000'
const DEFAULT_USER_ID = 'demo-user-1'
const DEFAULT_TOTAL_PAGES = 200
const AUTO_SAVE_INTERVAL_MS = 8000
const PAGE_OVERSCAN = 2
const PAGE_VERTICAL_GAP = 24
const DEFAULT_PAGE_HEIGHT = 1100
const ZOOM_MIN = 1
const ZOOM_MAX = 2.5
const WHEEL_ZOOM_FACTOR = 0.0012
const PINCH_DAMPING = 0.25
const FULLSCREEN_DEFAULT_ZOOM = 1.2

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

function parseReaderParams() {
  const hash = window.location.hash || ''
  const queryString = hash.includes('?') ? hash.split('?')[1] : ''
  const params = new URLSearchParams(queryString)

  return {
    bookId: params.get('bookId') || '',
    pdf: params.get('pdf') || '',
    title: params.get('title') || 'Untitled Book',
    author: params.get('author') || 'Unknown Author',
  }
}

export default function PdfReaderPage() {
  const [params, setParams] = useState(parseReaderParams)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(DEFAULT_TOTAL_PAGES)
  const [loadingProgress, setLoadingProgress] = useState(true)
  const [pdfLoading, setPdfLoading] = useState(true)
  const [readerWidth, setReaderWidth] = useState(900)
  const [zoomScale, setZoomScale] = useState(1)
  const [headerHidden, setHeaderHidden] = useState(false)
  const [continueFromPage, setContinueFromPage] = useState(null)
  const [windowRange, setWindowRange] = useState({ start: 1, end: 6 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [error, setError] = useState('')
  const lastSavedSnapshotRef = useRef('')
  const scrollContainerRef = useRef(null)
  const readerFrameRef = useRef(null)
  const pagesRef = useRef([])
  const pageShellRefs = useRef([])
  const pageHeightsRef = useRef([])
  const restorePageRef = useRef(1)
  const lastScrollTopRef = useRef(0)
  const scrollRafRef = useRef(null)
  const pinchDistanceRef = useRef(0)
  const pinchStartScaleRef = useRef(1)
  const zoomAnchorRef = useRef(null)
  const isZoomingRef = useRef(false)
  const zoomEndTimerRef = useRef(null)
  const zoomRafRef = useRef(null)
  const pendingZoomRef = useRef(1)

  const clampZoom = useCallback((scale) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale)), [])

  const applyZoom = useCallback(
    (rawNextScale) => {
      const container = scrollContainerRef.current
      if (!container) return

      const nextScale = clampZoom(rawNextScale)
      if (Math.abs(nextScale - zoomScale) < 0.001) return

      zoomAnchorRef.current = {
        y: (container.scrollTop + container.clientHeight / 2) / Math.max(1, container.scrollHeight),
        x: (container.scrollLeft + container.clientWidth / 2) / Math.max(1, container.scrollWidth),
      }
      isZoomingRef.current = true
      if (zoomEndTimerRef.current) {
        window.clearTimeout(zoomEndTimerRef.current)
      }
      zoomEndTimerRef.current = window.setTimeout(() => {
        isZoomingRef.current = false
      }, 140)

      pendingZoomRef.current = nextScale
      if (zoomRafRef.current) return
      zoomRafRef.current = window.requestAnimationFrame(() => {
        zoomRafRef.current = null
        setZoomScale(pendingZoomRef.current)
      })
    },
    [clampZoom, zoomScale],
  )

  const resolvedPdfUrl = useMemo(() => {
    const raw = (params.pdf || '').trim()
    if (!raw) return ''
    if (/^(https?:\/\/|blob:|data:)/i.test(raw)) return raw
    if (raw.startsWith('/uploads/')) return `${API_BASE_URL}${raw}`
    if (raw.startsWith('uploads/')) return `${API_BASE_URL}/${raw}`
    return raw
  }, [params.pdf])

  useEffect(() => {
    const onHashChange = () => setParams(parseReaderParams())
    window.addEventListener('hashchange', onHashChange)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
      if (zoomEndTimerRef.current) {
        window.clearTimeout(zoomEndTimerRef.current)
      }
      if (zoomRafRef.current) {
        window.cancelAnimationFrame(zoomRafRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const loadProgress = async () => {
      if (!params.bookId) {
        setLoadingProgress(false)
        return
      }

      try {
        setLoadingProgress(true)
        setError('')
        const response = await fetch(`${API_BASE_URL}/api/progress?userId=${DEFAULT_USER_ID}`)
        if (!response.ok) {
          throw new Error('Unable to load reading progress.')
        }

        const progressList = await response.json()
        const match = Array.isArray(progressList)
          ? progressList.find((item) => item.book?._id === params.bookId || item.book === params.bookId)
          : null

        if (match && Number.isInteger(match.currentPage || match.page)) {
          const restoredPage = Math.max(1, match.currentPage || match.page)
          setPage(restoredPage)
          setTotalPages(Math.max(1, match.totalPages || DEFAULT_TOTAL_PAGES))
          restorePageRef.current = restoredPage
          setContinueFromPage(restoredPage)
        } else {
          setPage(1)
          setTotalPages(DEFAULT_TOTAL_PAGES)
          restorePageRef.current = 1
          setContinueFromPage(null)
        }
      } catch (loadError) {
        setError(loadError.message || 'Unable to load reading progress.')
      } finally {
        setLoadingProgress(false)
      }
    }

    loadProgress()
  }, [params.bookId])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return undefined

    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect?.width || 900
      const gutter = isFullscreen ? (nextWidth < 640 ? 10 : 20) : nextWidth < 640 ? 24 : 72
      setReaderWidth(Math.max(220, Math.floor(nextWidth - gutter)))
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [isFullscreen])

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === readerFrameRef.current)
    }

    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    if (!isFullscreen) return
    if (zoomScale >= FULLSCREEN_DEFAULT_ZOOM) return
    applyZoom(FULLSCREEN_DEFAULT_ZOOM)
  }, [applyZoom, isFullscreen, zoomScale])

  const progressPercentage = useMemo(() => {
    const safeTotal = Math.max(1, totalPages)
    return Math.max(0, Math.min(100, Math.round((page / safeTotal) * 100)))
  }, [page, totalPages])

  const saveProgress = useCallback(async () => {
    if (!params.bookId || !resolvedPdfUrl) return

    const snapshot = `${params.bookId}:${page}:${totalPages}`
    if (snapshot === lastSavedSnapshotRef.current) return

    try {
      setError('')
      const response = await fetch(`${API_BASE_URL}/api/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: DEFAULT_USER_ID,
          bookId: params.bookId,
          currentPage: page,
          totalPages,
          progressPercentage,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.message || 'Failed to save progress.')
      }

      lastSavedSnapshotRef.current = snapshot
    } catch (saveError) {
      setError(saveError.message || 'Failed to save progress.')
    }
  }, [page, params.bookId, progressPercentage, resolvedPdfUrl, totalPages])

  const onDocumentLoadSuccess = useCallback(({ numPages }) => {
    const safeTotal = Math.max(1, numPages || 1)
    setTotalPages(safeTotal)
    setPdfLoading(false)
    pageHeightsRef.current = Array.from({ length: safeTotal }, () => DEFAULT_PAGE_HEIGHT)

    const restorePage = Math.min(Math.max(1, restorePageRef.current || 1), safeTotal)
    const initialStart = Math.max(1, restorePage - PAGE_OVERSCAN)
    const initialEnd = Math.min(safeTotal, restorePage + PAGE_OVERSCAN + 2)
    setWindowRange({ start: initialStart, end: initialEnd })

    window.requestAnimationFrame(() => {
      pagesRef.current[restorePage - 1]?.scrollIntoView({ behavior: 'auto', block: 'start' })
      setPage(restorePage)
    })
  }, [])

  const onDocumentLoadError = useCallback((loadError) => {
    setPdfLoading(false)
    setError(loadError?.message || 'Unable to load this PDF.')
  }, [])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || !resolvedPdfUrl || totalPages < 1) return undefined

    const detectCurrentPage = () => {
      if (isZoomingRef.current) return
      let bestPage = 1
      let smallestDistance = Number.POSITIVE_INFINITY

      for (let index = 0; index < totalPages; index += 1) {
        const pageNode = pagesRef.current[index]
        if (!pageNode) continue
        const distance = Math.abs(pageNode.offsetTop - container.scrollTop - 24)
        if (distance < smallestDistance) {
          smallestDistance = distance
          bestPage = index + 1
        }
      }

      setPage((prev) => (prev === bestPage ? prev : bestPage))
      setWindowRange((prev) => {
        const nextStart = Math.max(1, bestPage - PAGE_OVERSCAN)
        const nextEnd = Math.min(totalPages, bestPage + PAGE_OVERSCAN + 2)
        if (prev.start === nextStart && prev.end === nextEnd) return prev
        return { start: nextStart, end: nextEnd }
      })

      const currentTop = container.scrollTop
      const delta = currentTop - lastScrollTopRef.current
      if (Math.abs(delta) > 12) {
        setHeaderHidden(delta > 0 && currentTop > 64)
        lastScrollTopRef.current = currentTop
      }
    }

    const onScroll = () => {
      if (scrollRafRef.current) return
      scrollRafRef.current = window.requestAnimationFrame(() => {
        scrollRafRef.current = null
        detectCurrentPage()
      })
    }

    detectCurrentPage()
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', onScroll)
      if (scrollRafRef.current) {
        window.cancelAnimationFrame(scrollRafRef.current)
        scrollRafRef.current = null
      }
    }
  }, [resolvedPdfUrl, totalPages])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return undefined

    const getTouchDistance = (touches) => {
      const [first, second] = touches
      const dx = first.clientX - second.clientX
      const dy = first.clientY - second.clientY
      return Math.hypot(dx, dy)
    }

    const onWheel = (event) => {
      if (!event.ctrlKey) return
      event.preventDefault()
      const next = zoomScale * Math.exp(-event.deltaY * WHEEL_ZOOM_FACTOR)
      applyZoom(next)
    }

    const onTouchStart = (event) => {
      if (event.touches.length !== 2) return
      pinchDistanceRef.current = getTouchDistance(event.touches)
      pinchStartScaleRef.current = zoomScale
    }

    const onTouchMove = (event) => {
      if (event.touches.length !== 2 || pinchDistanceRef.current <= 0) return
      event.preventDefault()
      const nextDistance = getTouchDistance(event.touches)
      const delta = (nextDistance - pinchDistanceRef.current) / pinchDistanceRef.current
      const nextScale = pinchStartScaleRef.current * (1 + delta * PINCH_DAMPING)
      applyZoom(nextScale)
    }

    const stopPinch = () => {
      pinchDistanceRef.current = 0
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    container.addEventListener('touchstart', onTouchStart, { passive: true })
    container.addEventListener('touchmove', onTouchMove, { passive: false })
    container.addEventListener('touchend', stopPinch, { passive: true })
    container.addEventListener('touchcancel', stopPinch, { passive: true })

    return () => {
      container.removeEventListener('wheel', onWheel)
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchmove', onTouchMove)
      container.removeEventListener('touchend', stopPinch)
      container.removeEventListener('touchcancel', stopPinch)
    }
  }, [applyZoom, zoomScale])

  useEffect(() => {
    const container = scrollContainerRef.current
    const anchor = zoomAnchorRef.current
    if (!container || !anchor) return

    window.requestAnimationFrame(() => {
      container.scrollTop = Math.max(0, anchor.y * container.scrollHeight - container.clientHeight / 2)
      container.scrollLeft = Math.max(0, anchor.x * container.scrollWidth - container.clientWidth / 2)
      zoomAnchorRef.current = null
    })
  }, [zoomScale])

  useEffect(() => {
    saveProgress()
  }, [page, saveProgress])

  useEffect(() => {
    if (!params.bookId || !resolvedPdfUrl) return undefined
    const intervalId = window.setInterval(() => {
      saveProgress()
    }, AUTO_SAVE_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [params.bookId, resolvedPdfUrl, saveProgress])

  const toggleFullscreen = async () => {
    try {
      const frame = readerFrameRef.current
      if (!frame) return

      if (document.fullscreenElement === frame) {
        await document.exitFullscreen()
        return
      }

      await frame.requestFullscreen()
    } catch (fullscreenError) {
      setError(fullscreenError?.message || 'Unable to toggle fullscreen mode.')
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_10%_0%,rgba(56,189,248,0.1),transparent_35%),radial-gradient(circle_at_90%_0%,rgba(168,85,247,0.1),transparent_35%),#020617] text-slate-100">
      <div
        className={`pointer-events-none fixed left-1/2 top-2 z-30 w-[min(720px,94vw)] -translate-x-1/2 transition-all duration-300 sm:top-3 ${
          isFullscreen ? 'translate-y-[-18px] opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="overflow-hidden rounded-full border border-white/15 bg-slate-900/75 backdrop-blur-xl">
          <div
            className="h-1.5 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="mt-1 text-center text-xs font-medium text-slate-300">
          {progressPercentage}% • Page {page} of {Math.max(1, totalPages)}
        </p>
      </div>

      <header
        className={`fixed left-0 right-0 top-0 z-20 border-b border-white/10 bg-slate-950/75 px-3 py-2.5 backdrop-blur-xl transition-transform duration-300 sm:px-6 sm:py-3 ${
          headerHidden || isFullscreen ? '-translate-y-full' : 'translate-y-0'
        }`}
      >
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white sm:text-sm">{params.title}</p>
              <p className="truncate text-[11px] text-slate-300 sm:text-xs">{params.author}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-200 sm:px-3 sm:text-xs">
                Page {page} of {Math.max(1, totalPages)}
              </span>
              <button
                type="button"
                onClick={() => (window.location.hash = '')}
                className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition hover:bg-white/10 sm:px-3 sm:text-xs"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      </header>

      {error ? <p className="px-3 pb-2 pt-14 text-xs text-rose-300 sm:px-6 sm:pt-16">{error}</p> : null}
      {!error && continueFromPage && continueFromPage > 1 ? (
        <p className="px-3 pb-2 pt-14 text-xs text-emerald-300 sm:px-6 sm:pt-16">Continue from page {continueFromPage}</p>
      ) : null}

      <main className={`min-h-0 flex-1 px-2 pb-2 pt-10 transition-all duration-500 sm:px-4 sm:pb-4 sm:pt-14 ${isFullscreen ? 'pt-2 sm:pt-3' : ''}`}>
        {loadingProgress ? (
          <div className="h-full w-full animate-pulse rounded-2xl border border-white/10 bg-white/5" />
        ) : resolvedPdfUrl ? (
          <div
            ref={readerFrameRef}
            className={`group relative mx-auto min-h-0 w-full transition-all duration-500 ease-in-out ${isFullscreen ? 'h-screen max-w-none rounded-none bg-slate-950' : 'h-full max-w-4xl rounded-3xl'}`}
          >
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              className="absolute right-3 top-3 z-20 rounded-full border border-white/20 bg-slate-900/85 p-1.5 text-slate-100 shadow-lg backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:right-4 sm:top-4 sm:p-2"
            >
              <MdFullscreen className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <div
              ref={scrollContainerRef}
              className={`h-full w-full overflow-x-auto overflow-y-auto scroll-smooth border border-white/10 bg-slate-950/65 px-2 py-4 shadow-[0_30px_90px_rgba(2,6,23,0.72)] transition-all duration-500 ease-in-out touch-pan-y sm:px-8 sm:py-10 ${isFullscreen ? 'rounded-none border-x-0 border-b-0 pt-12 sm:pt-16 shadow-none' : 'rounded-3xl'}`}
              style={{ touchAction: 'pan-y pinch-zoom' }}
            >
              {pdfLoading ? <div className="mb-4 h-3 w-40 animate-pulse rounded bg-white/10" /> : null}
              <Document file={resolvedPdfUrl} onLoadSuccess={onDocumentLoadSuccess} onLoadError={onDocumentLoadError} loading="">
                    <div
                      aria-hidden="true"
                      style={{
                        height: Array.from({ length: Math.max(0, windowRange.start - 1) }, (_, i) => pageHeightsRef.current[i] || DEFAULT_PAGE_HEIGHT).reduce(
                          (sum, h) => sum + h + PAGE_VERTICAL_GAP,
                          0,
                        ),
                      }}
                    />

                    {Array.from({ length: Math.max(0, windowRange.end - windowRange.start + 1) }, (_, offset) => {
                      const pageNumber = windowRange.start + offset
                      const index = pageNumber - 1
                      return (
                        <section
                          key={`page-${pageNumber}`}
                          ref={(node) => {
                            pagesRef.current[index] = node
                          }}
                          className="mx-auto mb-6 w-fit max-w-full rounded-2xl border border-white/10 bg-slate-900/80 p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.45)] transition-transform duration-300 sm:p-4"
                          style={{ minHeight: pageHeightsRef.current[index] || DEFAULT_PAGE_HEIGHT }}
                        >
                          <div
                            ref={(node) => {
                              pageShellRefs.current[index] = node
                            }}
                          >
                            <Page
                              pageNumber={pageNumber}
                              width={Math.floor(readerWidth * zoomScale)}
                              renderAnnotationLayer={false}
                              renderTextLayer={false}
                              className="overflow-hidden rounded-lg"
                              onRenderSuccess={() => {
                                const shell = pageShellRefs.current[index]
                                if (!shell) return
                                const measuredHeight = Math.ceil(shell.getBoundingClientRect().height)
                                if (!Number.isFinite(measuredHeight) || measuredHeight <= 0) return
                                if (pageHeightsRef.current[index] !== measuredHeight) {
                                  pageHeightsRef.current[index] = measuredHeight
                                }
                              }}
                              loading={<div className="h-[420px] w-[300px] animate-pulse rounded-lg bg-white/10" />}
                            />
                          </div>
                        </section>
                      )
                    })}

                    <div
                      aria-hidden="true"
                      style={{
                        height: Array.from({ length: Math.max(0, totalPages - windowRange.end) }, (_, i) => {
                          const absoluteIndex = windowRange.end + i
                          return pageHeightsRef.current[absoluteIndex] || DEFAULT_PAGE_HEIGHT
                        }).reduce((sum, h) => sum + h + PAGE_VERTICAL_GAP, 0),
                      }}
                    />
              </Document>
            </div>
          </div>
        ) : (
          <div className="grid h-full min-h-[78vh] place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-center">
            <div>
              <p className="text-lg font-semibold text-white">No PDF selected</p>
              <p className="mt-2 text-sm text-slate-300">Open a book from the listing section to start reading.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

