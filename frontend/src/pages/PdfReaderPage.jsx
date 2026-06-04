import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { MdFullscreen } from 'react-icons/md'
import { ReaderSkeleton } from '../components/Skeletons'
import { API_ORIGIN } from '../lib/apiConfig'
import useReadingProgress from '../hooks/useReadingProgress'

const API = API_ORIGIN
const PAGE_OVERSCAN = 2
const PAGE_VERTICAL_GAP = 24
const DEFAULT_PAGE_HEIGHT = 1100
const ZOOM_MIN = 0.5
const ZOOM_MAX = 3
const ZOOM_STEP = 0.1
const ZOOM_DEBOUNCE_MS = 150
const WHEEL_ZOOM_FACTOR = 0.0012
const PINCH_DAMPING = 0.25
const FULLSCREEN_DEFAULT_ZOOM = 1.1
const CONTROLS_HIDE_DELAY_MS = 2500

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

function parseReaderParams(book = null) {
  if (book) {
    return {
      bookId: book._id || book.id || '',
      pdf: book.fileUrl || book.pdf || '',
      title: book.title || 'Untitled Book',
      author: book.author || 'Unknown Author',
      page: 1,
    }
  }

  const hash = window.location.hash || ''
  const queryString = hash.includes('?') ? hash.split('?')[1] : ''
  const params = new URLSearchParams(queryString)

  return {
    bookId: params.get('bookId') || '',
    pdf: params.get('fileUrl') || params.get('pdf') || '',
    title: params.get('title') || 'Untitled Book',
    author: params.get('author') || 'Unknown Author',
    page: Number.parseInt(params.get('page') || '1', 10),
  }
}

function getZoomStorageKey(bookId) {
  return `readerZoom:${bookId || 'default'}`
}

export default function PdfReaderPage({ book = null }) {
  const [params, setParams] = useState(() => parseReaderParams(book))
  const [pdfLoading, setPdfLoading] = useState(true)
  const [readerWidth, setReaderWidth] = useState(900)
  const [zoomScale, setZoomScale] = useState(1)
  const [renderScale, setRenderScale] = useState(1)
  const [headerHidden, setHeaderHidden] = useState(false)
  const [continueFromPage, setContinueFromPage] = useState(null)
  const [windowRange, setWindowRange] = useState({ start: 1, end: 6 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [error, setError] = useState('')
  const [controlsVisible, setControlsVisible] = useState(false)
  
  const authUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('authUser')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [])
  const resolvedUserId = authUser?._id || ''

  const {
    currentPage: page,
    totalPages,
    progressPercentage,
    loading: progressLoading,
    updateProgress,
  } = useReadingProgress(params.bookId, resolvedUserId, 'pdf')

  const scrollContainerRef = useRef(null)
  const readerFrameRef = useRef(null)
  const pagesRef = useRef([])
  const pageHeightsRef = useRef([])
  const pageRenderTasksRef = useRef({})
  const pageCanvasesRef = useRef({})
  const restorePageRef = useRef(1)
  const lastScrollTopRef = useRef(0)
  const scrollRafRef = useRef(null)
  const pinchDistanceRef = useRef(0)
  const pinchStartScaleRef = useRef(1)
  const zoomAnchorRef = useRef(null)
  const zoomDebounceTimerRef = useRef(null)
  const pdfDocumentRef = useRef(null)
  const controlsHideTimerRef = useRef(null)

  const resolvedPdfUrl = useMemo(() => {
    const raw = (params.pdf || '').trim()
    if (!raw) return ''
    if (/^(blob:|data:)/i.test(raw)) return raw
    if (raw.startsWith('/uploads/')) return API ? `${API}${raw}` : raw
    if (raw.startsWith('uploads/')) return API ? `${API}/${raw}` : `/${raw}`
    if (/^https?:\/\//i.test(raw)) {
      try {
        const parsed = new URL(raw)
        if (parsed.pathname.startsWith('/uploads/')) {
          return API ? `${API}${parsed.pathname}${parsed.search || ''}` : `${parsed.pathname}${parsed.search || ''}`
        }
      } catch {
        // no-op
      }
      return raw
    }
    return raw
  }, [params.pdf])

  const clampZoom = useCallback((scale) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale)), [])

  const queueScaleRerender = useCallback((nextScale) => {
    if (zoomDebounceTimerRef.current) {
      window.clearTimeout(zoomDebounceTimerRef.current)
    }
    zoomDebounceTimerRef.current = window.setTimeout(() => {
      setRenderScale(nextScale)
    }, ZOOM_DEBOUNCE_MS)
  }, [])

  const applyZoom = useCallback((rawNextScale) => {
    const container = scrollContainerRef.current
    if (!container) return

    const nextScale = clampZoom(rawNextScale)
    setZoomScale((prev) => {
      if (Math.abs(prev - nextScale) < 0.001) return prev
      zoomAnchorRef.current = {
        y: (container.scrollTop + container.clientHeight / 2) / Math.max(1, container.scrollHeight),
        x: (container.scrollLeft + container.clientWidth / 2) / Math.max(1, container.scrollWidth),
      }
      queueScaleRerender(nextScale)
      return nextScale
    })
  }, [clampZoom, queueScaleRerender])

  useEffect(() => {
    const key = getZoomStorageKey(params.bookId)
    const stored = Number.parseFloat(localStorage.getItem(key) || '')
    const safe = Number.isFinite(stored) ? clampZoom(stored) : 1
    setZoomScale(safe)
    setRenderScale(safe)
  }, [clampZoom, params.bookId])

  useEffect(() => {
    localStorage.setItem(getZoomStorageKey(params.bookId), String(zoomScale))
  }, [params.bookId, zoomScale])

  useEffect(() => {
    if (book) {
      setParams(parseReaderParams(book))
      return undefined
    }

    const onHashChange = () => setParams(parseReaderParams())
    window.addEventListener('hashchange', onHashChange)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
      if (zoomDebounceTimerRef.current) window.clearTimeout(zoomDebounceTimerRef.current)
      if (controlsHideTimerRef.current) window.clearTimeout(controlsHideTimerRef.current)
    }
  }, [book])

  const revealControls = useCallback(() => {
    setControlsVisible(true)
    if (controlsHideTimerRef.current) {
      window.clearTimeout(controlsHideTimerRef.current)
    }
    controlsHideTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false)
    }, CONTROLS_HIDE_DELAY_MS)
  }, [])

  const initialProgressLoadedRef = useRef(false)

  useEffect(() => {
    initialProgressLoadedRef.current = false
  }, [params.bookId])

  useEffect(() => {
    if (progressLoading) return
    if (initialProgressLoadedRef.current) return
    initialProgressLoadedRef.current = true

    if (page > 1) {
      setContinueFromPage(page)
    }
    restorePageRef.current = page
  }, [progressLoading, page, params.bookId])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return undefined
    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect?.width || 900
      const gutter = isFullscreen ? (nextWidth < 640 ? 16 : 30) : nextWidth < 640 ? 24 : 72
      setReaderWidth(Math.max(220, Math.floor(nextWidth - gutter)))
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [isFullscreen])

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement === readerFrameRef.current)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    if (isFullscreen && zoomScale < FULLSCREEN_DEFAULT_ZOOM) {
      applyZoom(FULLSCREEN_DEFAULT_ZOOM)
    }
  }, [applyZoom, isFullscreen, zoomScale])

  const cancelAllPageTasks = useCallback(() => {
    Object.values(pageRenderTasksRef.current).forEach((task) => {
      try {
        task?.cancel?.()
      } catch {
        // no-op
      }
    })
    pageRenderTasksRef.current = {}
  }, [])

  useEffect(() => {
    if (progressLoading) return undefined
    let cancelled = false
    const loadPdf = async () => {
      if (!resolvedPdfUrl) {
        setPdfLoading(false)
        return
      }

      try {
        setPdfLoading(true)
        setError('')
        cancelAllPageTasks()
        if (pdfDocumentRef.current) {
          await pdfDocumentRef.current.destroy()
          pdfDocumentRef.current = null
        }

        const task = pdfjsLib.getDocument({ url: resolvedPdfUrl, cMapPacked: true })
        const doc = await task.promise
        if (cancelled) {
          await doc.destroy()
          return
        }
        pdfDocumentRef.current = doc
        
        const numPages = Math.max(1, doc.numPages || 1)
        pageHeightsRef.current = Array.from({ length: numPages }, () => DEFAULT_PAGE_HEIGHT)

        const restorePage = Math.min(Math.max(1, restorePageRef.current || 1), numPages)
        const initialStart = Math.max(1, restorePage - PAGE_OVERSCAN)
        const initialEnd = Math.min(numPages, restorePage + PAGE_OVERSCAN + 2)
        setWindowRange((prev) => (prev.start === initialStart && prev.end === initialEnd ? prev : { start: initialStart, end: initialEnd }))

        window.requestAnimationFrame(() => {
          pagesRef.current[restorePage - 1]?.scrollIntoView({ behavior: 'auto', block: 'start' })
          updateProgress({ currentPage: restorePage, totalPages: numPages })
        })
      } catch (loadError) {
        if (!cancelled) setError(loadError?.message || 'Unable to load this PDF.')
      } finally {
        if (!cancelled) setPdfLoading(false)
      }
    }

    loadPdf()
    return () => {
      cancelled = true
      cancelAllPageTasks()
    }
  }, [cancelAllPageTasks, resolvedPdfUrl, progressLoading, updateProgress])

  const renderPage = useCallback(async (pageNumber, canvas, targetScale) => {
    const doc = pdfDocumentRef.current
    if (!doc || !canvas) return

    const activeTask = pageRenderTasksRef.current[pageNumber]
    if (activeTask) {
      try {
        activeTask.cancel()
      } catch {
        // no-op
      }
    }

    const pdfPage = await doc.getPage(pageNumber)
    const baseViewport = pdfPage.getViewport({ scale: 1 })
    const desiredWidth = Math.floor(readerWidth * targetScale)
    const pageScale = desiredWidth / Math.max(1, baseViewport.width)
    const viewport = pdfPage.getViewport({ scale: pageScale })

    const ratio = window.devicePixelRatio || 1
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    canvas.style.width = `${Math.floor(viewport.width)}px`
    canvas.style.height = `${Math.floor(viewport.height)}px`
    canvas.width = Math.floor(viewport.width * ratio)
    canvas.height = Math.floor(viewport.height * ratio)
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)

    const renderTask = pdfPage.render({ canvasContext: ctx, viewport })
    pageRenderTasksRef.current[pageNumber] = renderTask
    await renderTask.promise
    if (pageRenderTasksRef.current[pageNumber] === renderTask) {
      delete pageRenderTasksRef.current[pageNumber]
    }

    pageHeightsRef.current[pageNumber - 1] = Math.ceil(viewport.height)
  }, [readerWidth])

  useEffect(() => {
    if (!pdfDocumentRef.current || pdfLoading) return

    const pagesToRender = []
    for (let p = windowRange.start; p <= windowRange.end; p += 1) pagesToRender.push(p)

    let isCancelled = false
    ;(async () => {
      for (const pageNumber of pagesToRender) {
        if (isCancelled) return
        const canvas = pageCanvasesRef.current[pageNumber]
        if (!canvas) continue
        await renderPage(pageNumber, canvas, renderScale)
      }
    })()

    return () => {
      isCancelled = true
    }
  }, [pdfLoading, renderPage, renderScale, windowRange.end, windowRange.start])

  useEffect(() => {
    const container = scrollContainerRef.current
    const anchor = zoomAnchorRef.current
    if (!container || !anchor) return

    window.requestAnimationFrame(() => {
      container.scrollTop = Math.max(0, anchor.y * container.scrollHeight - container.clientHeight / 2)
      container.scrollLeft = Math.max(0, anchor.x * container.scrollWidth - container.clientWidth / 2)
      zoomAnchorRef.current = null
    })
  }, [zoomScale, renderScale])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || totalPages < 1) return undefined

    const detectCurrentPage = () => {
      let bestPage = 1
      let smallestDistance = Number.POSITIVE_INFINITY

      for (let index = 0; index < totalPages; index += 1) {
        const node = pagesRef.current[index]
        if (!node) continue
        const distance = Math.abs(node.offsetTop - container.scrollTop - 24)
        if (distance < smallestDistance) {
          smallestDistance = distance
          bestPage = index + 1
        }
      }

      updateProgress({ currentPage: bestPage, totalPages })
      setWindowRange((prev) => {
        const start = Math.max(1, bestPage - PAGE_OVERSCAN)
        const end = Math.min(totalPages, bestPage + PAGE_OVERSCAN + 2)
        if (prev.start === start && prev.end === end) return prev
        return { start, end }
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
      if (scrollRafRef.current) window.cancelAnimationFrame(scrollRafRef.current)
    }
  }, [totalPages, updateProgress])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return undefined

    const getTouchDistance = (touches) => {
      const [a, b] = touches
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
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
      applyZoom(pinchStartScaleRef.current * (1 + delta * PINCH_DAMPING))
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

  const zoomRatio = zoomScale / Math.max(0.001, renderScale)

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
    <div className="fixed inset-0 flex h-screen w-screen flex-col overflow-hidden bg-[#030712] text-slate-100">
      {/* Top Reading Progress Bar (Medium/Substack style) */}
      <div className="fixed left-0 right-0 top-0 z-[60] h-[3px] w-full">
        <div
          className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Sleek bottom center page indicator */}
      <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 pointer-events-none">
        <div className="rounded-full border border-white/15 bg-slate-950/85 px-4 py-2 shadow-2xl backdrop-blur-xl">
          <p className="text-[11px] tracking-widest uppercase font-bold text-slate-300">
            Page {page} of {Math.max(1, totalPages)} <span className="mx-2 text-indigo-400">•</span> {Math.round(progressPercentage)}% complete
          </p>
        </div>
      </div>

      <header className={`fixed left-0 right-0 top-0 z-20 border-b border-white/10 bg-slate-950/75 px-3 py-2.5 backdrop-blur-xl transition-transform duration-300 sm:px-6 sm:py-3 ${headerHidden || isFullscreen ? '-translate-y-full' : 'translate-y-0'}`}>
        <div className="min-w-0 w-full">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-sm md:text-base font-extrabold uppercase tracking-[0.06em] text-white">
                {params.title}
                <span className="ml-2 inline-flex items-center rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-400">
                  {progressPercentage}% complete
                </span>
              </h1>
              <p className="truncate text-[11px] text-slate-400 font-medium">{params.author}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => (window.location.hash = '')}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      </header>

      {error ? <p className="px-3 pb-1 pt-8 text-xs text-rose-300 sm:px-6 sm:pt-10">{error}</p> : null}
      {!error && continueFromPage && continueFromPage > 1 ? <p className="px-3 pb-1 pt-8 text-xs text-emerald-300 sm:px-6 sm:pt-10">Continue from page {continueFromPage}</p> : null}

      <main className={`min-h-0 flex-1 pt-0 transition-all duration-500 ${isFullscreen ? 'pt-0' : ''}`}>
        {progressLoading ? (
          <div className="animate-[fadeIn_220ms_ease-out]">
            <ReaderSkeleton />
          </div>
        ) : resolvedPdfUrl ? (
          <div
            ref={readerFrameRef}
            className="group relative min-h-0 h-full w-full transition-all duration-500 ease-in-out bg-slate-950"
            onMouseMove={revealControls}
          >
            <button type="button" onClick={toggleFullscreen} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} className={`absolute right-3 top-3 z-20 rounded-full border border-white/20 bg-slate-900/60 p-1.5 text-slate-100 shadow-lg backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:bg-slate-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:right-4 sm:top-4 sm:p-2 ${controlsVisible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0 pointer-events-none'}`}>
              <MdFullscreen className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>

            <div className={`absolute right-3 top-10 z-30 w-[min(92vw,240px)] rounded-xl border border-white/15 bg-slate-900/60 p-2.5 shadow-xl backdrop-blur-xl transition-all duration-300 sm:right-4 sm:top-10 ${controlsVisible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0 pointer-events-none'}`}>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => applyZoom(zoomScale - ZOOM_STEP)} className="h-8 w-8 rounded-md border border-white/20 bg-white/10 text-sm font-semibold text-white hover:bg-white/15">-</button>
                <button type="button" onClick={() => applyZoom(zoomScale + ZOOM_STEP)} className="h-8 w-8 rounded-md border border-white/20 bg-white/10 text-sm font-semibold text-white hover:bg-white/15">+</button>
                <span className="min-w-14 text-center text-xs font-semibold text-slate-200">{Math.round(zoomScale * 100)}%</span>
                <button type="button" onClick={() => applyZoom(1)} className="rounded-md border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-semibold text-slate-100 hover:bg-white/15">Reset</button>
              </div>
              <input type="range" min={ZOOM_MIN} max={ZOOM_MAX} step="0.01" value={zoomScale} onChange={(e) => applyZoom(Number(e.target.value))} className="mt-2 h-1.5 w-full cursor-pointer accent-cyan-400" />
            </div>

            <div
              ref={scrollContainerRef}
              onClick={revealControls}
              onTouchStart={revealControls}
              className="h-full w-full overflow-x-auto overflow-y-auto bg-slate-950 transition-all duration-500 ease-in-out pt-0"
              style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
            >
              {pdfLoading ? <div className="mb-4 h-3 w-40 animate-pulse rounded bg-white/10" /> : null}

              <div aria-hidden="true" style={{ height: Array.from({ length: Math.max(0, windowRange.start - 1) }, (_, i) => pageHeightsRef.current[i] || DEFAULT_PAGE_HEIGHT).reduce((sum, h) => sum + h + PAGE_VERTICAL_GAP, 0) }} />

              {Array.from({ length: Math.max(0, windowRange.end - windowRange.start + 1) }, (_, offset) => {
                const pageNumber = windowRange.start + offset
                const index = pageNumber - 1
                return (
                  <section key={`page-${pageNumber}`} ref={(node) => { pagesRef.current[index] = node }} className="mb-6 w-fit max-w-none" style={{ minHeight: pageHeightsRef.current[index] || DEFAULT_PAGE_HEIGHT }}>
                    <div style={{ transform: `scale(${zoomRatio})`, transformOrigin: 'center top' }}>
                      <canvas ref={(node) => { pageCanvasesRef.current[pageNumber] = node }} className="block bg-white" />
                    </div>
                  </section>
                )
              })}

              <div aria-hidden="true" style={{ height: Array.from({ length: Math.max(0, totalPages - windowRange.end) }, (_, i) => pageHeightsRef.current[windowRange.end + i] || DEFAULT_PAGE_HEIGHT).reduce((sum, h) => sum + h + PAGE_VERTICAL_GAP, 0) }} />
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
