import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { SavedBooksProvider } from './context/SavedBooksContext'
import './index.css'
import App from './App.jsx'

if (typeof window !== 'undefined') {
  // Global safety fallback for localStorage in sandboxed or WebView environments
  try {
    const testKey = '__storage_test__'
    window.localStorage.setItem(testKey, testKey)
    window.localStorage.removeItem(testKey)
  } catch (storageError) {
    const mockStorage = {
      _data: {},
      setItem(id, val) { this._data[id] = String(val) },
      getItem(id) { return this._data.hasOwnProperty(id) ? this._data[id] : null },
      removeItem(id) { delete this._data[id] },
      clear() { this._data = {} }
    }
    try {
      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        writable: true,
        configurable: true
      })
    } catch {
      window.localStorage = mockStorage
    }
  }

  // Suppress errors logged by console.error (e.g. from dev tools or page scripts)
  const originalConsoleError = console.error
  console.error = function (...args) {
    const msg = args.map(arg => String(arg?.message || arg || '')).join(' ')
    if (
      msg.includes('message channel closed') ||
      msg.includes('asynchronous response') ||
      msg.includes('listener indicated')
    ) {
      return
    }
    originalConsoleError.apply(console, args)
  }

  window.addEventListener('unhandledrejection', (event) => {
    const msg = String(event.reason?.message || event.reason || '')
    if (
      msg.includes('message channel closed') ||
      msg.includes('asynchronous response') ||
      msg.includes('listener indicated')
    ) {
      event.preventDefault()
    }
  })

  window.addEventListener('error', (event) => {
    const msg = String(event.message || event.error?.message || '')
    if (
      msg.includes('message channel closed') ||
      msg.includes('asynchronous response') ||
      msg.includes('listener indicated')
    ) {
      event.preventDefault()
    }
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <SavedBooksProvider>
          <App />
        </SavedBooksProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
)
