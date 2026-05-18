import { useCallback, useEffect, useRef, useState } from 'react'
import apiClient from '../lib/apiClient'

export default function useReadingAnalytics(userId) {
  const [daily, setDaily] = useState(null)
  const [weekly, setWeekly] = useState(null)
  const [overall, setOverall] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const intervalRef = useRef(null)
  const abortRef = useRef(null)

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
  }, [])

  const fetchAnalytics = useCallback(async () => {
    if (!userId) return

    if (abortRef.current) {
      abortRef.current.abort()
    }
    const controller = new AbortController()
    abortRef.current = controller

    try {
      setLoading(true)
      setError('')
      const [dailyRes, weeklyRes, overallRes] = await Promise.all([
        apiClient.get(`/api/analytics/daily?userId=${encodeURIComponent(userId)}`, { signal: controller.signal }),
        apiClient.get(`/api/analytics/weekly?userId=${encodeURIComponent(userId)}`, { signal: controller.signal }),
        apiClient.get(`/api/analytics/overall?userId=${encodeURIComponent(userId)}`, { signal: controller.signal }),
      ])

      if (controller.signal.aborted) return
      setDaily(dailyRes.data || null)
      setWeekly(weeklyRes.data || null)
      setOverall(overallRes.data || null)
    } catch (err) {
      if (controller.signal.aborted || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return
      setError(err?.response?.data?.message || err?.message || 'Failed to load analytics')
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [userId])

  const startPolling = useCallback(() => {
    stopPolling()
    fetchAnalytics()
    intervalRef.current = window.setInterval(fetchAnalytics, 5 * 60 * 1000)
  }, [fetchAnalytics, stopPolling])

  useEffect(() => {
    if (!userId) {
      stopPolling()
      setDaily(null)
      setWeekly(null)
      setOverall(null)
      setError('')
      setLoading(false)
      return
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling()
      } else {
        startPolling()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    if (!document.hidden) startPolling()

    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [userId, startPolling, stopPolling])

  return { daily, weekly, overall, loading, error, refetch: fetchAnalytics }
}
