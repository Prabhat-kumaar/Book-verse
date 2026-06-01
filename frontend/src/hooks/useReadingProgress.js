import { useState, useEffect, useRef, useCallback } from 'react'
import apiClient from '../lib/apiClient'

const SAVE_DEBOUNCE_DELAY_MS = 30000;
const MIN_SAVE_INTERVAL_MS = 30000;

export default function useReadingProgress(bookId, userId, fileType = 'pdf') {
  const [progress, setProgress] = useState({
    currentPage: 1,
    totalPages: 1,
    progressPercentage: 0,
    locationCfi: '',
    completed: false,
    loading: true,
    error: null,
  })

  // Keep latest progress values in ref to avoid stale closure issues during debounced save / unmount / tab close
  const latestProgressRef = useRef({
    currentPage: 1,
    totalPages: 1,
    progressPercentage: 0,
    locationCfi: '',
    completed: false,
    bookId,
    userId,
    fileType,
  })

  const saveTimerRef = useRef(null)
  const isSavingRef = useRef(false)
  const readingStartRef = useRef(Date.now())
  const fetchedProgressKeyRef = useRef('')
  
  // Refs to prevent duplicate saves and throttle API spam
  const lastSavedPageRef = useRef(null)
  const lastSavedCfiRef = useRef(null)
  const lastSaveCallTimestampRef = useRef(0)
  const activeAbortControllerRef = useRef(null)

  // Update latestProgressRef whenever the hook inputs change
  useEffect(() => {
    latestProgressRef.current.bookId = bookId
    latestProgressRef.current.userId = userId
    latestProgressRef.current.fileType = fileType
  }, [bookId, userId, fileType])

  // Fetch progress once per mounted reader/book.
  const loadProgress = useCallback(async () => {
    if (!bookId || !userId) {
      setProgress((prev) => ({ ...prev, loading: false }))
      return
    }

    try {
      setProgress((prev) => ({ ...prev, loading: true, error: null }))
      const response = await apiClient.get(`/api/progress/book/${encodeURIComponent(bookId)}`)
      const data = response?.data?.data

      if (data) {
        const initialVal = {
          currentPage: data.currentPage || 1,
          totalPages: data.totalPages || 1,
          progressPercentage: data.progressPercentage || 0,
          locationCfi: data.locationCfi || '',
          completed: Boolean(data.completed),
          loading: false,
          error: null,
        }
        setProgress(initialVal)
        latestProgressRef.current = {
          ...latestProgressRef.current,
          ...initialVal,
        }
        // Initialize our lastSaved refs to avoid duplicate requests right after load
        lastSavedPageRef.current = initialVal.currentPage
        lastSavedCfiRef.current = initialVal.locationCfi
      } else {
        // Fallback to local storage if available
        const storageKey = `progress:${userId}:${bookId}`
        const localDataRaw = localStorage.getItem(storageKey)
        if (localDataRaw) {
          try {
            const localData = JSON.parse(localDataRaw)
            const initialVal = {
              currentPage: localData.currentPage || 1,
              totalPages: localData.totalPages || 1,
              progressPercentage: localData.progressPercentage || 0,
              locationCfi: localData.locationCfi || '',
              completed: Boolean(localData.completed),
              loading: false,
              error: null,
            }
            setProgress(initialVal)
            latestProgressRef.current = {
              ...latestProgressRef.current,
              ...initialVal,
            }
            lastSavedPageRef.current = initialVal.currentPage
            lastSavedCfiRef.current = initialVal.locationCfi
          } catch {
            setProgress((prev) => ({ ...prev, loading: false }))
          }
        } else {
          setProgress((prev) => ({ ...prev, loading: false }))
        }
      }
      readingStartRef.current = Date.now()
    } catch (err) {
      console.error('[useReadingProgress] Failed to load progress:', err)
      setProgress((prev) => ({
        ...prev,
        loading: false,
        error: err.response?.data?.message || err.message || 'Failed to load progress',
      }))
    }
  }, [bookId, userId])

  useEffect(() => {
    const fetchKey = bookId && userId ? `${userId}:${bookId}` : ''
    if (!fetchKey) {
      loadProgress()
      return
    }
    if (fetchedProgressKeyRef.current === fetchKey) return
    fetchedProgressKeyRef.current = fetchKey
    loadProgress()
  }, [bookId, loadProgress, userId])

  // Explicit, direct save function
  const triggerSave = useCallback(async (isFinal = false) => {
    const current = latestProgressRef.current
    if (!current.bookId || !current.userId) return

    // 1. Prevent saving if the page and CFI haven't changed since last save
    if (!isFinal && 
        lastSavedPageRef.current === current.currentPage && 
        lastSavedCfiRef.current === current.locationCfi) {
      console.log('[useReadingProgress] Skip saving: page and CFI unchanged')
      return
    }

    // 2. Throttling Protection: Enforce minimum delay between saves
    const now = Date.now()
    if (lastSaveCallTimestampRef.current && now - lastSaveCallTimestampRef.current < MIN_SAVE_INTERVAL_MS) {
      console.log('[useReadingProgress] Save throttled')
      return
    }
    lastSaveCallTimestampRef.current = now

    // 3. Cancel any previous pending / in-flight save request
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort()
      activeAbortControllerRef.current = null
    }

    const abortController = new AbortController()
    activeAbortControllerRef.current = abortController

    const elapsedSeconds = Math.max(0, Math.floor((now - readingStartRef.current) / 1000))
    
    // Update local cache state before making network call
    lastSavedPageRef.current = current.currentPage
    lastSavedCfiRef.current = current.locationCfi

    try {
      isSavingRef.current = true
      
      const payload = {
        userId: current.userId,
        bookId: current.bookId,
        currentPage: current.currentPage,
        totalPages: current.totalPages,
        progressPercentage: current.progressPercentage,
        locationCfi: current.locationCfi,
        completed: current.completed,
        readingTime: elapsedSeconds,
        fileType: current.fileType,
      }

      // Save locally to cache immediately
      const storageKey = `progress:${current.userId}:${current.bookId}`
      localStorage.setItem(storageKey, JSON.stringify({
        currentPage: current.currentPage,
        totalPages: current.totalPages,
        progressPercentage: current.progressPercentage,
        locationCfi: current.locationCfi,
        completed: current.completed,
        updatedAt: new Date().toISOString(),
      }))

      console.log(`[useReadingProgress] Dispatching saveProgress API request:`, {
        currentPage: current.currentPage,
        locationCfi: current.locationCfi,
        readingTime: elapsedSeconds,
      })

      // Send to backend with cancellation signal
      await apiClient.post('/api/progress/save', payload, { signal: abortController.signal })
      
      readingStartRef.current = Date.now()
    } catch (err) {
      if (err.name === 'CanceledError' || err.message === 'canceled' || err.code === 'ERR_CANCELED') {
        console.log('[useReadingProgress] Save request cancelled cleanly')
      } else {
        console.error('[useReadingProgress] Save progress failed:', err)
      }
    } finally {
      isSavingRef.current = false
      if (activeAbortControllerRef.current === abortController) {
        activeAbortControllerRef.current = null
      }
    }
  }, [])

  // Update progress state locally and schedule debounced save
  const updateProgress = useCallback((newValues = {}) => {
    setProgress((prev) => {
      const currentPage = newValues.currentPage ?? prev.currentPage
      const totalPages = newValues.totalPages ?? prev.totalPages
      const locationCfi = newValues.locationCfi ?? prev.locationCfi
      const rawPercentage = totalPages > 0 ? (currentPage / totalPages) * 100 : 0
      const progressPercentage = Math.round(rawPercentage)
      const completed = currentPage >= totalPages || progressPercentage >= 98 || Boolean(newValues.completed || prev.completed)

      const nextState = {
        ...prev,
        currentPage,
        totalPages,
        progressPercentage,
        locationCfi,
        completed,
      }

      latestProgressRef.current = {
        ...latestProgressRef.current,
        ...nextState,
      }

      // Save locally to cache immediately
      const current = latestProgressRef.current
      if (current.userId && current.bookId) {
        const storageKey = `progress:${current.userId}:${current.bookId}`
        localStorage.setItem(storageKey, JSON.stringify({
          currentPage,
          totalPages,
          progressPercentage,
          locationCfi,
          completed,
          updatedAt: new Date().toISOString(),
        }))
      }

      // Debounce backend saves so frequent page/CFI changes do not spam the API.
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }

      saveTimerRef.current = setTimeout(() => {
        triggerSave()
      }, SAVE_DEBOUNCE_DELAY_MS)

      return nextState
    })
  }, [triggerSave])

  // Explicit mark completed API
  const markCompleted = useCallback(async () => {
    const current = latestProgressRef.current
    if (!current.bookId || !current.userId) return

    try {
      setProgress((prev) => {
        const nextState = {
          ...prev,
          currentPage: prev.totalPages,
          progressPercentage: 100,
          completed: true,
        }
        latestProgressRef.current = {
          ...latestProgressRef.current,
          ...nextState,
        }
        return nextState
      })

      const storageKey = `progress:${current.userId}:${current.bookId}`
      localStorage.setItem(storageKey, JSON.stringify({
        currentPage: current.totalPages,
        totalPages: current.totalPages,
        progressPercentage: 100,
        completed: true,
        updatedAt: new Date().toISOString(),
      }))

      console.log('[useReadingProgress] Marking book completed')
      await apiClient.post('/api/progress/complete', { bookId: current.bookId })
    } catch (err) {
      console.error('[useReadingProgress] Failed to mark completed:', err)
    }
  }, [])

  // Auto-save on page exit / refresh / tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      const current = latestProgressRef.current
      if (!current.bookId || !current.userId) return

      // Synchronous local storage update for maximum resiliency
      const storageKey = `progress:${current.userId}:${current.bookId}`
      localStorage.setItem(storageKey, JSON.stringify({
        currentPage: current.currentPage,
        totalPages: current.totalPages,
        progressPercentage: current.progressPercentage,
        locationCfi: current.locationCfi,
        completed: current.completed,
        updatedAt: new Date().toISOString(),
      }))

      // Avoid redundant beacon save if it matches what was already successfully synced to MongoDB
      if (lastSavedPageRef.current === current.currentPage && 
          lastSavedCfiRef.current === current.locationCfi) {
        return
      }

      const now = Date.now()
      if (lastSaveCallTimestampRef.current && now - lastSaveCallTimestampRef.current < MIN_SAVE_INTERVAL_MS) {
        return
      }

      const elapsedSeconds = Math.max(0, Math.floor((now - readingStartRef.current) / 1000))
      
      const payload = {
        userId: current.userId,
        bookId: current.bookId,
        currentPage: current.currentPage,
        totalPages: current.totalPages,
        progressPercentage: current.progressPercentage,
        locationCfi: current.locationCfi,
        completed: current.completed,
        readingTime: elapsedSeconds,
        fileType: current.fileType,
      }

      const headers = { 'Content-Type': 'application/json' }
      const token = localStorage.getItem('authToken')
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
      
      const baseUrl = apiClient.defaults.baseURL || '/api'
      const url = `${baseUrl}/progress/save`.replace(/\/\/+/g, '/')
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
      
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(url, blob)
        }
      } catch (e) {
        console.warn('[useReadingProgress] sendBeacon failed', e)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort()
      }
      triggerSave(true)
    }
  }, [triggerSave])

  return {
    ...progress,
    updateProgress,
    markCompleted,
    triggerSave,
  }
}
