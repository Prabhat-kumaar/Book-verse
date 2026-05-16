import axios from 'axios'
import { API_URL, buildApiUrl } from './apiConfig'

console.info('[apiClient] API URL:', API_URL)

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 0,
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
    console.info('[apiClient] Final request:', finalUrl)
    const token = localStorage.getItem('authToken')

    // Attach auth only when a token exists. Do not block public endpoints.
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    if (config.data instanceof FormData) {
      // Let the browser set multipart boundary automatically.
      delete config.headers['Content-Type']
    } else if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json'
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
    console.error('[apiClient] Request failed:', { status, message, url: error?.config?.url })
    return Promise.reject(error)
  },
)

export default apiClient
