import axios from 'axios'

const resolveApiBaseUrl = () => {
  // In local dev, use Vite proxy to avoid host/IP mismatch network errors.
  if (import.meta.env.DEV) return '/'
  return import.meta.env.VITE_API_URL || '/'
}

const API_BASE_URL = resolveApiBaseUrl()

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 0,
})

apiClient.interceptors.request.use(
  (config) => {
    const url = config.url || ''
    const isPublicAuthEndpoint =
      url.startsWith('/api/auth/login') ||
      url.startsWith('/api/auth/register')
    const needsAuth = url.startsWith('/api/') && !isPublicAuthEndpoint
    const token = localStorage.getItem('authToken')

    if (needsAuth) {
      if (!token) {
        return Promise.reject(new Error('Please login first'))
      }
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

export default apiClient
