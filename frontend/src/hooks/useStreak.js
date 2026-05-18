import { useCallback, useEffect, useRef, useState } from 'react'
import apiClient from '../lib/apiClient'

export default function useStreak(userId) {
  const [streak, setStreak] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const intervalRef = useRef(null)
  const abortRef = useRef(null)

  const fetchStreak = useCallback(async () => {
    if (!userId) return

    if (abortRef.current) {
      abortRef.current.abort()
    }
    const controller = new AbortController()
    abortRef.current = controller

    try {
      setLoading(true)
      setError('')
      const res = await apiClient.get(`/api/streak?userId=${encodeURIComponent(userId)}`, { signal: controller.signal })
      if (controller.signal.aborted) return
      setStreak(res.data || null)
    } catch (err) {
      if (controller.signal.aborted || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return
      setError(err?.response?.data?.message || err?.message || 'Failed to load streak')
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [userId])

  useEffect(() => {
    if (!userId) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (abortRef.current) {
        abortRef.current.abort()
        abortRef.current = null
      }
      setStreak(null)
      setError('')
      setLoading(false)
      return
    }

    fetchStreak()
    intervalRef.current = window.setInterval(fetchStreak, 60 * 60 * 1000)

    const handleVisibility = () => {
      if (!document.hidden) fetchStreak()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (abortRef.current) {
        abortRef.current.abort()
        abortRef.current = null
      }
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [userId, fetchStreak])

  return { streak, loading, error, refetch: fetchStreak }
}
