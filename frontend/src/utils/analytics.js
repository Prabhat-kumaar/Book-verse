// Dynamic, deferred and batched Google Analytics v4 loader for performance optimization
const GA_MEASUREMENT_ID = 'G-1XM19MSDLQ'
let eventQueue = []
let trackingInitialized = false
let batchTimer = null

/**
 * Dynamically imports and initializes Google Analytics after the page loads.
 * This directly prevents the external script from delaying LCP and TBT metrics.
 */
export function initGA() {
  if (trackingInitialized || typeof window === 'undefined') return

  try {
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
    document.head.appendChild(script)

    window.dataLayer = window.dataLayer || []
    window.gtag = function gtag() {
      window.dataLayer.push(arguments)
    }

    window.gtag('js', new Date())

    // Disable automatic pageviews (we track them programmatically to avoid double counting)
    // Use beacon transport to avoid blocking page navigation and network bandwidth
    window.gtag('config', GA_MEASUREMENT_ID, {
      send_page_view: false,
      transport_type: 'beacon',
      anonymize_ip: true // GDPR compliance & lightweight processing
    })

    trackingInitialized = true

    // Process any events that were queued before initialization completed
    processQueue()
  } catch (err) {
    console.error('[Analytics] Failed to initialize GA4:', err)
  }
}

/**
 * Dispatches all accumulated events in a single batch.
 */
function processQueue() {
  if (!trackingInitialized || eventQueue.length === 0) return

  try {
    eventQueue.forEach((event) => {
      window.gtag('event', event.name, event.params)
    })
    eventQueue = []
  } catch (err) {
    console.error('[Analytics] Failed to process event queue:', err)
  }
}

/**
 * Tracks a custom event by batching it to reduce main thread blocking.
 * @param {string} name - Event name
 * @param {object} params - Event parameters
 */
export function trackEvent(name, params = {}) {
  if (typeof window === 'undefined') return

  eventQueue.push({ name, params })

  // If GA is not initialized yet, let them sit in the queue until initGA() is called
  if (!trackingInitialized) return

  // Throttle event dispatches to prevent excessive network requests and UI thread layout blocks
  if (batchTimer) clearTimeout(batchTimer)
  batchTimer = setTimeout(() => {
    processQueue()
  }, 2500) // Batch events every 2.5 seconds
}

/**
 * Records a page view programmatically.
 * @param {string} path - The page path (e.g. '/books')
 */
export function trackPageView(path) {
  trackEvent('page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title
  })
}
