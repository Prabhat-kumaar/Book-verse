import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="readify-footer py-8 text-slate-200">
      <div className="footer-shell">
        <div className="footer-grid">
          <div className="footer-column footer-brand">
            <div className="footer-logo-wrap">
              <span className="footer-logo" aria-hidden="true">
                <span className="footer-logo-book" />
                <span className="footer-logo-dot" />
              </span>
              <div>
                <p className="footer-brand-title">READIFY AI</p>
                <p className="footer-brand-copy">Streamlined reading experience for books, notes, and progress tracking.</p>
              </div>
            </div>
            <div className="footer-social flex items-center gap-3 mt-4">
              <a href="#" aria-label="Readify AI on X / Twitter" className="footer-social-link hover:border-[#1DA1F2]/50 transition-colors">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4.5 h-4.5"><path fill="#1DA1F2" d="M22.46 6c-.77.35-1.6.6-2.47.71a4.33 4.33 0 0 0 1.9-2.38 8.65 8.65 0 0 1-2.75 1.05 4.32 4.32 0 0 0-7.37 3.94 12.26 12.26 0 0 1-8.9-4.52 4.32 4.32 0 0 0 1.34 5.76 4.31 4.31 0 0 1-1.96-.54v.05a4.32 4.32 0 0 0 3.46 4.24 4.34 4.34 0 0 1-1.95.07 4.33 4.33 0 0 0 4.04 3 8.68 8.68 0 0 1-5.37 1.85A8.94 8.94 0 0 1 2 19.92a12.26 12.26 0 0 0 6.63 1.94c7.95 0 12.29-6.58 12.29-12.29 0-.19 0-.38-.01-.57A8.8 8.8 0 0 0 24 5.35a8.55 8.55 0 0 1-2.54.7z" /></svg>
              </a>
              <a href="#" aria-label="Readify AI on GitHub" className="footer-social-link hover:border-white/50 transition-colors">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4.5 h-4.5"><path fill="#ffffff" d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.71-2.78.6-3.37-1.34-3.37-1.34-.45-1.14-1.1-1.44-1.1-1.44-.9-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.82.09-.64.35-1.08.64-1.33-2.22-.25-4.55-1.11-4.55-4.95 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.57 9.57 0 0 1 12 6.8a9.6 9.6 0 0 1 2.5.34c1.9-1.3 2.74-1.02 2.74-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.6 1.03 2.68 0 3.85-2.34 4.7-4.57 4.95.36.31.68.92.68 1.86 0 1.34-.01 2.42-.01 2.75 0 .26.18.57.69.47A10 10 0 0 0 12 2Z" /></svg>
              </a>
              <a href="#" aria-label="Readify AI on Instagram" className="footer-social-link hover:border-pink-500/50 transition-colors">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4.5 h-4.5">
                  <defs>
                    <linearGradient id="instagram-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#fdf497" />
                      <stop offset="5%" stopColor="#fdf497" />
                      <stop offset="45%" stopColor="#fd5949" />
                      <stop offset="60%" stopColor="#d6249f" />
                      <stop offset="90%" stopColor="#285AEB" />
                    </linearGradient>
                  </defs>
                  <path fill="url(#instagram-grad)" d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm8.5 1.5h-8.5a4.25 4.25 0 0 0-4.25 4.25v8.5a4.25 4.25 0 0 0 4.25 4.25h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5A4.25 4.25 0 0 0 16.25 3.5Zm-4.25 3.25a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm5.5-.25a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
                </svg>
              </a>
            </div>
          </div>

          <div className="footer-column">
            <p className="footer-section-title">Explore</p>
            <nav className="footer-links">
              <Link to="/" className="footer-link">Home</Link>
              <Link to="/categories" className="footer-link">Categories</Link>
              <Link to="/recommended" className="footer-link">Recommended</Link>
              <Link to="/books" className="footer-link">Explore Books</Link>
            </nav>
          </div>

          <div className="footer-column">
            <p className="footer-section-title">Account</p>
            <nav className="footer-links">
              <Link to="/login" className="footer-link">Login</Link>
              <Link to="/signup" className="footer-link">Sign up</Link>
              <Link to="/saved-books" className="footer-link">Saved books</Link>
            </nav>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 Readify AI. All rights reserved. | A Prabhat Production</p>
          <p className="footer-credit">⚡ Developed by <strong>Prabhat Production</strong></p>
        </div>
      </div>
    </footer>
  )
}
