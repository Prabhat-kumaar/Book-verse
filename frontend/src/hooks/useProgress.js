import { useEffect, useMemo, useState } from 'react'

const API_BASE_URL = 'http://127.0.0.1:5000'

export default function useProgress(userId) {
  const [progressItems, setProgressItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) {
      setProgressItems([])
      setLoading(false)
      return
    }

    const controller = new AbortController()

    const fetchProgress = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(`${API_BASE_URL}/api/progress?userId=${encodeURIComponent(userId)}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch progress (${response.status})`)
        }

        const payload = await response.json()
        setProgressItems(Array.isArray(payload) ? payload : [])
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError') {
          setError(fetchError.message || 'Unable to fetch reading progress.')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchProgress()
    return () => controller.abort()
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
