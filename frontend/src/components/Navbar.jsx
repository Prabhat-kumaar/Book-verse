import { motion } from 'framer-motion'
import useNavItems from '../hooks/useNavItems'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { MdMenu, MdPerson, MdSearch } from 'react-icons/md'
import useProgress from '../hooks/useProgress'
import { buildReaderHash } from '../lib/readerLink'


function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const navItems = useNavItems()
  const [profileOpen, setProfileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [searchDirty, setSearchDirty] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [authUser, setAuthUser] = useState(() => {
    try {
      const raw = localStorage.getItem('authUser')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const profileRef = useRef(null)
  const mobileSearchInputRef = useRef(null)
  const isAdmin = authUser?.role === 'admin'
  const avatarLabel = useMemo(() => (authUser?.username?.trim()?.[0] || 'P').toUpperCase(), [authUser])

  const { progressItems } = useProgress(authUser?._id)
  const continueReadingLink = useMemo(() => {
    if (!progressItems || !progressItems.length) return '/saved-books'
    const inProgress = progressItems.find(
      (item) => item.book?.slug && Number(item.progressPercentage || 0) < 100
    )
    if (inProgress?.book) return buildReaderHash(inProgress.book)
    const latest = progressItems.find((item) => item.book?.slug)
    if (latest?.book) return buildReaderHash(latest.book)
    return '/saved-books'
  }, [progressItems])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setSearch(params.get('q') || '')
    setSearchDirty(false)
    setMenuOpen(false)
    setProfileOpen(false)
    if (!location.pathname.startsWith('/books')) {
      setMobileSearchOpen(false)
    }
  }, [location])

  useEffect(() => {
    if (!mobileSearchOpen) return
    window.requestAnimationFrame(() => {
      mobileSearchInputRef.current?.focus()
    })
  }, [mobileSearchOpen])

  useEffect(() => {
    if (!searchDirty) return
    const trimmed = search.trim()
    const timer = window.setTimeout(() => {
      // Navigate using the raw search value to preserve spaces in the input field
      navigate(trimmed ? `/books?q=${encodeURIComponent(search)}` : '/books')
    }, 300)
    return () => window.clearTimeout(timer)
  }, [navigate, search, searchDirty])

  useEffect(() => {
    const syncAuth = () => {
      try {
        const raw = localStorage.getItem('authUser')
        setAuthUser(raw ? JSON.parse(raw) : null)
      } catch {
        setAuthUser(null)
      }
    }

    const handleOutside = (event) => {
      if (!profileRef.current?.contains(event.target)) {
        setProfileOpen(false)
      }
    }

    window.addEventListener('storage', syncAuth)
    window.addEventListener('authChanged', syncAuth)
    document.addEventListener('mousedown', handleOutside)
    return () => {
      window.removeEventListener('storage', syncAuth)
      window.removeEventListener('authChanged', syncAuth)
      document.removeEventListener('mousedown', handleOutside)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
    window.dispatchEvent(new Event('authChanged'))
    setProfileOpen(false)
    navigate('/login', { replace: true })
  }

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className="sticky top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4 lg:px-8"
    >
      <nav className="mx-auto w-full max-w-7xl rounded-2xl border border-white/[0.08] bg-[#0c101a]/90 shadow-2xl shadow-black/60 backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
          {/* Left: Brand Logo */}
          <Link to="/" className="group flex shrink-0 items-center gap-2">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center">
              Read<span className="bg-gradient-to-r from-violet-400 via-pink-400 to-rose-400 bg-clip-text text-transparent">ify</span>
            </span>
          </Link>

          {/* Center: Nav Links with active indicator */}
          <ul className="hidden md:flex items-center gap-6 lg:gap-8">
            {navItems.map((item) => {
              const isActive =
                item.href === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.href)
              return (
                <li key={item.label}>
                  <Link
                    to={item.href}
                    className={`relative py-1 text-sm font-medium transition-colors duration-200 ${
                      isActive
                        ? 'text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="navIndicator"
                        className="absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full bg-gradient-to-r from-violet-400 to-pink-400"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Right: Search, Icons & Auth */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {/* Search Input Pill */}
            <div className="hidden sm:block relative w-48 md:w-56 lg:w-64">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setSearchDirty(true)
                }}
                placeholder="Search books, authors..."
                className="h-9 w-full rounded-full border border-white/10 bg-[#141824]/90 pl-9 pr-4 text-xs text-white placeholder:text-slate-400 outline-none transition duration-200 focus:border-violet-400/50 focus:bg-[#181e2e]"
              />
            </div>

            {/* Notification Icon */}
            <button
              type="button"
              aria-label="Notifications"
              className="relative hidden sm:grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-[#141824]/60 text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>

            {/* Saved Bookmark Icon */}
            <Link
              to="/saved-books"
              aria-label="Bookmarks"
              className="hidden sm:grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-[#141824]/60 text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </Link>

            {/* Subscribe / Auth Button */}
            {!authUser ? (
              <Link
                to="/signup"
                className="rounded-full bg-[#c4b5fd] hover:bg-[#d8b4fe] px-4 py-1.5 text-xs font-bold text-[#090d16] shadow-sm transition-all duration-200 active:scale-95"
              >
                Subscribe
              </Link>
            ) : (
              <div ref={profileRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((prev) => !prev)}
                  aria-label="Profile menu"
                  className="grid h-9 w-9 place-items-center rounded-full border border-violet-400/40 bg-gradient-to-br from-violet-500 to-pink-500 text-xs font-black text-white shadow-md transition hover:scale-105"
                >
                  {avatarLabel}
                </button>
              </div>
            )}

            {/* Mobile Menu Trigger */}
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="md:hidden grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-[#141824] text-slate-200"
            >
              <MdMenu className="h-5 w-5" />
            </button>
          </div>
        </div>
            {authUser ? (
              <div ref={profileRef} className="relative">
                <motion.button
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setProfileOpen((prev) => !prev)}
                  aria-label="Profile menu"
                  className="group inline-flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 p-1 pr-3 transition duration-300 hover:border-blue-300/45 hover:bg-white/15"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-bold text-white shadow-[0_8px_25px_rgba(85,104,255,0.5)]">
                    {avatarLabel}
                  </span>
                  <span className="hidden text-sm font-semibold text-slate-100 sm:block">Profile</span>
                </motion.button>

                {profileOpen ? (
                  <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-white/15 bg-slate-950/90 p-2 shadow-lg shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl z-50">
                    <Link to="/profile" className="block rounded-xl px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10">
                      My Profile
                    </Link>
                    <Link to={continueReadingLink} className="block rounded-xl px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10">
                      Continue Reading
                    </Link>
                    <Link to="/saved-books" className="block rounded-xl px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10">
                      Saved Books
                    </Link>
                    <Link to="/#continue-reading" className="block rounded-xl px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10">
                      Reading History
                    </Link>
                    <Link to="/profile" className="block rounded-xl px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10">
                      Settings
                    </Link>
                    {isAdmin ? (
                      <Link to="/admin/dashboard" className="block rounded-xl px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10">
                        Admin Dashboard
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-200 transition hover:bg-rose-500/15"
                    >
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {mobileSearchOpen ? (
          <div className="px-4 pb-3 md:hidden">
            <label className="relative block">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                <SearchIcon />
              </span>
              <input
                ref={mobileSearchInputRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setSearchDirty(true)
                }}
                placeholder="Search books, genres, authors..."
                className="h-11 w-full rounded-xl border border-white/15 bg-black/55 pl-10 pr-4 text-sm text-white placeholder:text-zinc-400 outline-none transition focus:border-blue-300/60 focus:bg-black/75"
              />
            </label>
          </div>
        ) : null}
        {menuOpen ? (
          <div className="px-3 pb-3 md:hidden">
            <div className="overflow-hidden rounded-xl border border-white/15 bg-slate-950/85 p-2 backdrop-blur-xl">
              {authUser ? (
                <>
                  <Link to="/profile" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-slate-100 transition hover:bg-white/10">
                    My Profile
                  </Link>
                  <Link to={continueReadingLink} onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-slate-100 transition hover:bg-white/10">
                    Continue Reading
                  </Link>
                  <Link to="/saved-books" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-slate-100 transition hover:bg-white/10">
                    Saved Books
                  </Link>
                  <Link to="/#continue-reading" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-slate-100 transition hover:bg-white/10">
                    Reading History
                  </Link>
                  <Link to="/profile" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-slate-100 transition hover:bg-white/10">
                    Settings
                  </Link>
                  {isAdmin ? (
                    <>
                      <div className="my-2 border-t border-white/10" />
                      <Link to="/admin/dashboard" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-slate-100 transition hover:bg-white/10">
                        Admin Dashboard
                      </Link>
                    </>
                  ) : null}
                  <div className="my-2 border-t border-white/10" />
                  <button
                    type="button"
                    onClick={() => {
                      handleLogout()
                      setMenuOpen(false)
                    }}
                    className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-rose-200 transition hover:bg-rose-500/15"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <div className="my-2 border-t border-white/10" />
                  <Link to="/login" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/15">
                    Login
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : null}

      </nav>

      <div className="mx-auto mt-2 h-px w-[92%] max-w-7xl bg-gradient-to-r from-transparent via-blue-400/35 to-transparent" />

    </motion.header>
  )
}
