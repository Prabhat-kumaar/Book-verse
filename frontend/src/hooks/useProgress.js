import { useEffect, useMemo, useState } from 'react'
import { fetchAllProgress } from '../lib/progressApi'
import { getProgressBookId, normalizeProgressItem } from '../lib/readingProgress'

const REFRESH_INTERVAL_MS = 60000
const REFRESH_TTL_MS = 15000

const sharedStore = {
  userId: '',
  items: [],
  loading: false,
  error: '',
  inFlight: null,
  lastFetchedAt: 0,
}

const listeners = new Set()
let intervalId = null
let listenersBound = false
let onProgressUpdatedHandler = null
let onVisibilityChangeHandler = null

function notify() {
  const snapshot = {
    userId: sharedStore.userId,
    items: sharedStore.items,
    loading: sharedStore.loading,
    error: sharedStore.error,
  }
  listeners.forEach((listener) => listener(snapshot))
}

function setSharedState(next) {
  Object.assign(sharedStore, next)
  notify()
}

function sortByLastRead(items = []) {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.lastReadAt || 0).getTime()
    const bTime = new Date(b.lastReadAt || 0).getTime()
    return bTime - aTime
  })
}

function mergeProgressItem(item) {
  if (!item) return
  const normalized = normalizeProgressItem(item)
  const targetBookId = getProgressBookId(normalized)
  if (!targetBookId) return

  const nextItems = [...sharedStore.items]
  const idx = nextItems.findIndex((entry) => getProgressBookId(entry) === targetBookId)
  if (idx >= 0) {
    nextItems[idx] = normalizeProgressItem({
      ...nextItems[idx],
      ...normalized,
      bookId: targetBookId,
      lastReadAt: normalized.lastReadAt || new Date().toISOString(),
    })
  } else {
    nextItems.push(normalized)
  }
  setSharedState({
    items: sortByLastRead(nextItems),
    error: '',
  })
}

async function refreshSharedProgress(userId, { silent = false, force = false } = {}) {
  if (!userId) {
    setSharedState({
      userId: '',
      items: [],
      loading: false,
      error: '',
      inFlight: null,
      lastFetchedAt: 0,
    })
    return []
  }

  if (sharedStore.userId && sharedStore.userId !== userId) {
    setSharedState({
      userId,
      items: [],
      loading: false,
      error: '',
      inFlight: null,
      lastFetchedAt: 0,
    })
  } else if (!sharedStore.userId) {
    sharedStore.userId = userId
  }

  if (!force && sharedStore.inFlight) return sharedStore.inFlight
  if (!force && sharedStore.lastFetchedAt && Date.now() - sharedStore.lastFetchedAt < REFRESH_TTL_MS) {
    return sharedStore.items
  }

  if (!silent) setSharedState({ loading: true, error: '' })

  const request = fetchAllProgress()
    .then((items) => {
      const sortedItems = sortByLastRead(items.map((item) => normalizeProgressItem(item)))
      setSharedState({
        userId,
        items: sortedItems,
        loading: false,
        error: '',
        inFlight: null,
        lastFetchedAt: Date.now(),
      })
      return sortedItems
    })
    .catch((error) => {
      setSharedState({
        loading: false,
        inFlight: null,
        error: error?.response?.data?.message || error?.message || 'Unable to fetch reading progress.',
      })
      throw error
    })

  sharedStore.inFlight = request
  return request
}

function startGlobalListeners() {
  if (listenersBound) return
  listenersBound = true

  onProgressUpdatedHandler = (event) => {
    const incoming = event?.detail?.item ? normalizeProgressItem(event.detail.item) : null
    if (incoming) {
      mergeProgressItem(incoming)
      return
    }
    if (!sharedStore.userId) return
    refreshSharedProgress(sharedStore.userId, { silent: true, force: true }).catch(() => {})
  }

  onVisibilityChangeHandler = () => {
    if (document.visibilityState !== 'visible') return
    if (!sharedStore.userId) return
    refreshSharedProgress(sharedStore.userId, { silent: true, force: true }).catch(() => {})
  }

  window.addEventListener('progressUpdated', onProgressUpdatedHandler)
  window.addEventListener('focus', onVisibilityChangeHandler)
  document.addEventListener('visibilitychange', onVisibilityChangeHandler)

  intervalId = window.setInterval(() => {
    if (!sharedStore.userId) return
    refreshSharedProgress(sharedStore.userId, { silent: true, force: true }).catch(() => {})
  }, REFRESH_INTERVAL_MS)
}

function stopGlobalListeners() {
  if (!listenersBound) return
  listenersBound = false
  if (intervalId) {
    window.clearInterval(intervalId)
    intervalId = null
  }
  if (onProgressUpdatedHandler) {
    window.removeEventListener('progressUpdated', onProgressUpdatedHandler)
    onProgressUpdatedHandler = null
  }
  if (onVisibilityChangeHandler) {
    window.removeEventListener('focus', onVisibilityChangeHandler)
    document.removeEventListener('visibilitychange', onVisibilityChangeHandler)
    onVisibilityChangeHandler = null
  }
}

function subscribe(listener) {
  listeners.add(listener)
  startGlobalListeners()
  listener({
    userId: sharedStore.userId,
    items: sharedStore.items,
    loading: sharedStore.loading,
    error: sharedStore.error,
  })
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) stopGlobalListeners()
  }
}

export default function useProgress(userId) {
  const [state, setState] = useState(() => ({
    progressItems: sharedStore.userId === userId ? sharedStore.items : [],
    loading: Boolean(userId && (!sharedStore.lastFetchedAt || sharedStore.userId !== userId)),
    error: sharedStore.error,
  }))

  useEffect(() => subscribe((snapshot) => {
    setState({
      progressItems: snapshot.items,
      loading: snapshot.loading,
      error: snapshot.error,
    })
  }), [])

  useEffect(() => {
    if (!userId) {
      setState({ progressItems: [], loading: false, error: '' })
      refreshSharedProgress('', { force: true }).catch(() => {})
      return
    }
    refreshSharedProgress(userId, { force: false }).catch(() => {})
  }, [userId])

  const latestProgress = useMemo(() => {
    if (!state.progressItems.length) return null
    return state.progressItems[0]
  }, [state.progressItems])

  return {
    progressItems: state.progressItems,
    latestProgress,
    loading: state.loading,
    error: state.error,
    refresh: () => refreshSharedProgress(userId, { force: true }),
  }
}
