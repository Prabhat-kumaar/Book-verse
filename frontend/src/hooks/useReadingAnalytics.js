import { useEffect, useState } from 'react'
import apiClient from '../lib/apiClient'

export default function useReadingAnalytics(userId) {
  const [daily, setDaily] = useState(null)
  const [weekly, setWeekly] = useState(null)
  const [overall, setOverall] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) {
      setDaily(null)
      setWeekly(null)
      setOverall(null)
      setLoading(false)
      return
    }

    let cancelled = false
    const fetchAnalytics = async () => {
      try {
        if (!cancelled) {
          setLoading(true)
          setError('')
        }
        const [dailyRes, weeklyRes, overallRes] = await Promise.all([
          apiClient.get(`/api/analytics/daily?userId=${encodeURIComponent(userId)}`),
          apiClient.get(`/api/analytics/weekly?userId=${encodeURIComponent(userId)}`),
          apiClient.get(`/api/analytics/overall?userId=${encodeURIComponent(userId)}`),
        ])
        if (!cancelled) {
          setDaily(dailyRes.data || null)
          setWeekly(weeklyRes.data || null)
          setOverall(overallRes.data || null)
        }
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.message || err?.message || 'Failed to load analytics')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAnalytics()
    const intervalId = window.setInterval(fetchAnalytics, 15000)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [userId])

  return { daily, weekly, overall, loading, error }
}
