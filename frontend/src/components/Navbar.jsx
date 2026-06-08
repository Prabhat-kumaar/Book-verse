import { motion } from 'framer-motion'
import useNavItems from '../hooks/useNavItems'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { MdMenu, MdPerson, MdSearch } from 'react-icons/md'


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
      className="sticky top-0 z-50 px-2 pt-2 sm:px-6 sm:pt-3 lg:px-10"
    >
      <nav className="mx-auto w-full max-w-7xl rounded-2xl border border-white/10 bg-gradient-to-r from-[#0f0f0f]/95 via-[#131313]/95 to-[#0f0f0f]/95 shadow-lg shadow-[0_18px_60px_rgba(0,0,0,0.62)] backdrop-blur-2xl">
        <div className="flex items-center gap-2 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3.5">
          <Link to="/" className="group flex shrink-0 items-center gap-2.5 sm:gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 text-sm font-bold text-white shadow-[0_0_35px_rgba(100,105,255,0.55)] transition duration-300 group-hover:scale-105 group-hover:rotate-3 sm:h-11 sm:w-11 sm:rounded-2xl">
              R
            </span>
            <div className="hidden min-[380px]:block">
              <p className="hidden sm:block text-[10px] font-semibold uppercase tracking-[0.36em] text-blue-200/75">Intelligent Reading</p>
              <p className="bg-gradient-to-r from-blue-300 via-indigo-200 to-violet-300 bg-clip-text text-base font-extrabold text-transparent sm:text-lg">
                Readify AI
              </p>
            </div>
          </Link>

          <div className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
            <label className="group relative w-full max-w-md">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 transition group-focus-within:text-blue-300">
                <SearchIcon />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setSearchDirty(true)
                }}
                placeholder="Search books, genres, or authors..."
                className="h-11 w-full rounded-xl border border-white/10 bg-black/60 pl-10 pr-4 text-sm text-white placeholder:text-zinc-400 outline-none transition duration-300 focus:border-blue-300/60 focus:bg-black/80"
              />
            </label>
          </div>

          <ul className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => {
              const isBlog = item.label === 'Blog'
              return (
                <li key={item.label}>
                  <Link
                    to={item.href}
                    className={`group relative rounded-lg px-4 py-2 text-sm font-medium transition duration-300 hover:-translate-y-0.5 flex items-center gap-1.5 ${
                      isBlog ? 'text-purple-305/90 hover:text-purple-400' : 'text-slate-200/90 hover:text-white'
                    }`}
                  >
                    {isBlog && <span className="select-none text-sm">📝</span>}
                    <span>{item.label}</span>
                    <span className={`absolute inset-x-3 -bottom-0.5 h-px scale-x-0 transition duration-300 group-hover:scale-x-100 ${
                      isBlog ? 'bg-gradient-to-r from-purple-400 to-purple-500' : 'bg-gradient-to-r from-blue-400 to-violet-400'
                    }`} />
                  </Link>
                </li>
              )
            })}
            {!authUser ? (
              <li>
                <Link
                  to="/login"
                  className="btn btn-primary"
                >
                  Login
                </Link>
              </li>
            ) : null}
          </ul>

          {/* Tablet controls */}
          <div className="relative ml-auto hidden md:flex lg:hidden items-center gap-2">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-slate-100 transition hover:border-blue-300/45 hover:bg-white/15"
            >
              <MdMenu className="h-5 w-5" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-12 w-52 overflow-hidden rounded-2xl border border-white/15 bg-slate-950/90 p-2 shadow-lg shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl z-50">
                <Link to="/blog" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10 flex items-center justify-between mb-1">
                  <span>📝 Blog</span>
                  <span className="bg-purple-650 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">New</span>
                </Link>
                <div className="border-b border-white/10 my-1" />
                {authUser ? (
                  <>
                    <Link to="/profile" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10">
                      My Profile
                    </Link>
                    <Link to="/" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10">
                      Continue Reading
                    </Link>
                    <Link to="/saved-books" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10">
                      Saved Books
                    </Link>
                    <Link to="/#continue-reading" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10">
                      Reading History
                    </Link>
                    <Link to="/profile" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10">
                      Settings
                    </Link>
                    {isAdmin ? (
                      <Link to="/admin/dashboard" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10">
                        Admin Dashboard
                      </Link>
                    ) : null}
                  </>
                ) : (
                  <Link to="/login" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/15">
                    Login
                  </Link>
                )}
              </div>
            ) : null}
          </div>

          {/* Mobile controls */}
          <div className="ml-auto flex items-center gap-1.5 md:hidden">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-slate-100 transition hover:border-blue-300/45 hover:bg-white/15"
            >
              <MdMenu className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Search books"
              onClick={() => {
                if (!location.pathname.startsWith('/books')) {
                  navigate('/books')
                }
                setMobileSearchOpen((prev) => !prev)
              }}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-slate-100 transition hover:border-blue-300/45 hover:bg-white/15"
            >
              <MdSearch className="h-5 w-5" />
            </button>
            <Link
              to={authUser ? '/profile' : '/login'}
              aria-label="Account"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-slate-100 transition hover:border-blue-300/45 hover:bg-white/15"
            >
              {authUser ? (
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 text-xs font-bold text-white">
                  {avatarLabel}
                </span>
              ) : (
                <MdPerson className="h-5 w-5" />
              )}
            </Link>
          </div>

          {/* Desktop User Menu */}
          <div className="hidden lg:flex items-center gap-3">
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
                    <Link to="/" className="block rounded-xl px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10">
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
                    <Link to="/blog" className="block rounded-xl px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10">
                      Blog
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
              <Link to="/blog" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-slate-100 transition hover:bg-white/10 flex items-center justify-between mb-1">
                <span>📝 Blog</span>
                <span className="bg-purple-650 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">New</span>
              </Link>
              <div className="border-b border-white/10 my-1.5" />
              {authUser ? (
                <>
                  <Link to="/profile" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-slate-100 transition hover:bg-white/10">
                    My Profile
                  </Link>
                  <Link to="/" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-slate-100 transition hover:bg-white/10">
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
