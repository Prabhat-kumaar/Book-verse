import axios from 'axios'

const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:5000',
  timeout: 0,
})

apiClient.interceptors.request.use(
  (config) => {
    const method = (config.method || 'get').toLowerCase()
    const isProtectedMethod = ['post', 'put', 'patch', 'delete'].includes(method)
    const url = config.url || ''
    const isPublicAuthEndpoint =
      url.startsWith('/api/auth/login') ||
      url.startsWith('/api/auth/register')
    const token = localStorage.getItem('authToken')

    if (isProtectedMethod && !isPublicAuthEndpoint) {
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
