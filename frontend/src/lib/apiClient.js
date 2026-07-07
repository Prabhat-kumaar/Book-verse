import axios from 'axios'
import { API_URL, buildApiUrl } from './apiConfig'
import safeStorage from './safeStorage'

const isDev = import.meta.env.DEV
isDev && console.log('[apiClient] API URL:', API_URL)

const REQUEST_TIMEOUT_MS = 20000
const inFlightGetRequests = new Map()

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT_MS,
  withCredentials: import.meta.env.VITE_API_WITH_CREDENTIALS === 'true',
})

apiClient.interceptors.request.use(
  (config) => {
    const url = config.url || ''
    const isAbsolute = /^https?:\/\//i.test(url)
    const normalizedRelativeUrl = isAbsolute
      ? url
      : `/${(url.startsWith('/') ? url.slice(1) : url).replace(/^api\/?/i, '')}`
    if (!isAbsolute) {
      config.url = normalizedRelativeUrl
    }
    const finalUrl = isAbsolute ? url : buildApiUrl(normalizedRelativeUrl)
    isDev && console.log('[apiClient] Final request:', finalUrl)
    const token = safeStorage.getItem('authToken')
    const headers = config.headers || {}
    config.headers = headers

    // Attach auth only when a token exists. Do not block public endpoints.
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    if (config.data instanceof FormData) {
      // Let the browser set multipart boundary automatically.
      delete headers['Content-Type']
    } else if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }

    return config
  },
  (error) => Promise.reject(error),
)

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const message = error?.response?.data?.message || error?.message || 'Request failed'
    isDev && console.error('[apiClient] Request failed:', { status, message, url: error?.config?.url })
    
    // Auto logout if token is expired/failed (401)
    if (status === 401) {
      safeStorage.removeItem('authToken')
      safeStorage.removeItem('authUser')
      window.dispatchEvent(new Event('authChanged'))
      
      const currentPath = window.location.pathname
      if (currentPath !== '/login' && currentPath !== '/signup') {
        window.location.href = '/login'
      }
    }
    
    return Promise.reject(error)
  },
)

const rawGet = apiClient.get.bind(apiClient)

apiClient.get = (url, config = {}) => {
  if (config?.dedupe === false || config?.signal) {
    return rawGet(url, config)
  }

  const key = JSON.stringify({
    url,
    params: config.params || null,
  })
  const inFlight = inFlightGetRequests.get(key)
  if (inFlight) return inFlight

  const request = rawGet(url, config).finally(() => {
    inFlightGetRequests.delete(key)
  })
  inFlightGetRequests.set(key, request)
  return request
}

export default apiClient
