import { useEffect, useState } from 'react'
import apiClient from '../lib/apiClient'

export default function useStreak(userId) {
  const [streak, setStreak] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) {
      setStreak(null)
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchStreak = async () => {
      try {
        if (!cancelled) {
          setLoading(true)
          setError('')
        }
        const res = await apiClient.get(`/api/streak?userId=${encodeURIComponent(userId)}`)
        if (!cancelled) setStreak(res.data || null)
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.message || err?.message || 'Failed to load streak')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchStreak()
    const intervalId = window.setInterval(fetchStreak, 15000)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [userId])

  return { streak, loading, error }
}
