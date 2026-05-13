import { useEffect, useMemo, useState } from 'react'
import apiClient from '../lib/apiClient'
import { getProgressBookId, normalizeProgressItem } from '../lib/readingProgress'
import { getBookThumbnailUrl, normalizeMediaUrl } from '../lib/mediaUrls'
const normalizeProgressBook = (item) => {
  if (!item?.book) return item
  return {
    ...item,
    book: {
      ...item.book,
      thumbnail: getBookThumbnailUrl(item.book),
      fileUrl: normalizeMediaUrl(item.book.fileUrl || item.book.pdf || ''),
      pdf: normalizeMediaUrl(item.book.pdf || ''),
    },
  }
}

function normalizeItem(item) {
  return normalizeProgressItem(normalizeProgressBook(item))
}

export default function useProgress(userId) {
  const [progressItems, setProgressItems] = useState([])
  const [loading, setLoading] = useState(Boolean(userId))
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) {
      setProgressItems([])
      setLoading(false)
      return
    }

    const fetchProgress = async ({ silent = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true)
          setError('')
        }
        const response = await apiClient.get(`/api/progress?userId=${encodeURIComponent(userId)}`)
        const payload = response.data
        const items = (Array.isArray(payload) ? payload : []).map(normalizeItem)
        setProgressItems(items)
      } catch (fetchError) {
        if (!silent) {
          setError(fetchError?.response?.data?.message || fetchError.message || 'Unable to fetch reading progress.')
        }
      } finally {
        if (!silent) {
          setLoading(false)
        }
      }
    }

    fetchProgress()
    const onProgressUpdated = (event) => {
      const detail = event?.detail || {}
      const changedBookId = detail.bookId || detail.item?.bookId || detail.item?.book?._id
      const incoming = detail.item ? normalizeItem(detail.item) : null
      if (changedBookId || incoming) {
        setProgressItems((prev) => {
          const next = [...prev]
          const targetId = changedBookId || incoming?.bookId
          const index = next.findIndex((entry) => getProgressBookId(entry) === targetId)
          const mergedCandidate = normalizeItem({
            ...(index >= 0 ? next[index] : {}),
            ...detail,
            ...(incoming || {}),
            bookId: targetId,
            lastReadAt: detail.lastReadAt || incoming?.lastReadAt || new Date().toISOString(),
          })
          if (index >= 0) {
            next[index] = mergedCandidate
          } else if (incoming || targetId) {
            next.push(mergedCandidate)
          }
          return next
        })
      }
      // Skip immediate refetch when local payload is already provided.
      if (!incoming) {
        fetchProgress({ silent: true })
      }
    }
    const onFocus = () => {
      if (document.visibilityState === 'visible') fetchProgress({ silent: true })
    }
    window.addEventListener('progressUpdated', onProgressUpdated)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    const intervalId = window.setInterval(() => fetchProgress({ silent: true }), 60000)
    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('progressUpdated', onProgressUpdated)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [userId])

  const latestProgress = useMemo(() => {
    if (!progressItems.length) return null
    return [...progressItems].sort((a, b) => {
      const aTime = new Date(a.lastReadAt || 0).getTime()
      const bTime = new Date(b.lastReadAt || 0).getTime()
      return bTime - aTime
    })[0]
  }, [progressItems])

  return { progressItems, latestProgress, loading, error }
}
