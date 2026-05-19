import axios from 'axios'
import { API_URL, buildApiUrl } from './apiConfig'

const isDev = import.meta.env.DEV
isDev && console.log('[apiClient] API URL:', API_URL)

const REQUEST_TIMEOUT_MS = 20000

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
    const token = localStorage.getItem('authToken')
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
    return Promise.reject(error)
  },
)

export default apiClient
