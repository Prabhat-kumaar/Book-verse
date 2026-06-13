import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { SavedBooksProvider } from './context/SavedBooksContext'
import './index.css'
import App from './App.jsx'

if (typeof window !== 'undefined') {
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
