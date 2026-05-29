import apiClient from './apiClient'
import { normalizeProgressItem } from './readingProgress'

function extractApiData(payload) {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === 'object' && 'data' in payload) return payload.data
  return payload
}

function normalizeList(payload) {
  const data = extractApiData(payload)
  if (!Array.isArray(data)) return []
  return data.map((item) => normalizeProgressItem(item))
}

function normalizeSingle(payload) {
  const data = extractApiData(payload)
  if (!data || typeof data !== 'object') return null
  return normalizeProgressItem(data)
}

export async function fetchContinueReading() {
  const response = await apiClient.get('/api/progress/user/continue-reading')
  return normalizeList(response?.data)
}

export async function fetchAllProgress() {
  const response = await apiClient.get('/api/progress')
  return normalizeList(response?.data)
}

export async function fetchProgressByBook(bookId) {
  if (!bookId) return null
  const response = await apiClient.get(`/api/progress/${encodeURIComponent(bookId)}`)
  return normalizeSingle(response?.data)
}

export async function saveProgress(payload) {
  try {
    const response = await apiClient.post('/api/progress/save', payload)
    return normalizeSingle(response?.data)
  } catch (error) {
    if (error?.response?.status !== 404) throw error
    const fallback = await apiClient.post('/api/progress', payload)
    return normalizeSingle(fallback?.data)
  }
}

export function emitProgressUpdated(item) {
  const normalized = item ? normalizeProgressItem(item) : null
  window.dispatchEvent(new CustomEvent('progressUpdated', {
    detail: {
      bookId: normalized?.bookId || normalized?.book?._id || '',
      item: normalized,
      lastReadAt: normalized?.lastReadAt || new Date().toISOString(),
    },
  }))
}
