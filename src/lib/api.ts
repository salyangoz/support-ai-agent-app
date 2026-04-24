import axios from 'axios'
import type { AuthTokens } from '@/types/api'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const tokens = localStorage.getItem('tokens')
  if (tokens) {
    const { access_token } = JSON.parse(tokens) as AuthTokens
    config.headers.Authorization = `Bearer ${access_token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const requestUrl: string = originalRequest?.url || ''
    const isAuthEndpoint = requestUrl.includes('/auth/login')
      || requestUrl.includes('/auth/register')
      || requestUrl.includes('/auth/refresh')
    // Let auth screens handle their own 401 errors without hard redirects.
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true
      try {
        const tokens = localStorage.getItem('tokens')
        if (!tokens) throw new Error('No tokens')
        const { refresh_token } = JSON.parse(tokens) as AuthTokens
        const { data } = await axios.post<AuthTokens>(`${import.meta.env.VITE_API_URL || '/api'}/auth/refresh`, { refresh_token })
        localStorage.setItem('tokens', JSON.stringify(data))
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`
        return api(originalRequest)
      } catch {
        localStorage.removeItem('tokens')
        localStorage.removeItem('user')
        return Promise.reject(error)
      }
    }
    return Promise.reject(error)
  },
)

export default api
