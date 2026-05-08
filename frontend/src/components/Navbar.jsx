import { motion } from 'framer-motion'
import useNavItems from '../hooks/useNavItems'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MdClose, MdMenu } from 'react-icons/md'

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
  const navItems = useNavItems()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [authUser, setAuthUser] = useState(() => {
    try {
      const raw = localStorage.getItem('authUser')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const profileRef = useRef(null)
  const isAdmin = authUser?.role === 'admin'
  const avatarLabel = useMemo(() => (authUser?.username?.trim()?.[0] || 'P').toUpperCase(), [authUser])

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
    setMobileMenuOpen(false)
    navigate('/login', { replace: true })
  }

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className="sticky top-0 z-50 px-3 pt-3 sm:px-6 lg:px-10"
    >
      <nav className="mx-auto w-full max-w-7xl rounded-2xl border border-white/15 bg-gradient-to-r from-white/[0.13] via-white/[0.08] to-white/[0.1] shadow-[0_14px_50px_rgba(6,10,34,0.6)] backdrop-blur-2xl">
        <div className="flex items-center gap-4 px-4 py-3.5 sm:px-6">
          <a href="#" className="group flex shrink-0 items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 text-sm font-bold text-white shadow-[0_0_35px_rgba(100,105,255,0.55)] transition duration-300 group-hover:scale-105 group-hover:rotate-3">
              R
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-blue-200/75">Intelligent Reading</p>
              <p className="bg-gradient-to-r from-blue-300 via-indigo-200 to-violet-300 bg-clip-text text-lg font-extrabold text-transparent">
                Readify AI
              </p>
            </div>
          </a>

          <div className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
            <label className="group relative w-full max-w-md">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300/80 transition group-focus-within:text-blue-300">
                <SearchIcon />
              </span>
              <input
                type="text"
                placeholder="Search books, genres, or authors..."
                className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/45 pl-10 pr-4 text-sm text-white placeholder:text-slate-300/60 outline-none transition duration-300 focus:border-blue-300/60 focus:bg-slate-900/55 focus:shadow-[0_0_0_4px_rgba(96,102,255,0.18)]"
              />
            </label>
          </div>

          <ul className="hidden items-center gap-1 xl:flex">
            {navItems.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="group relative rounded-lg px-4 py-2 text-sm font-medium text-slate-200/90 transition duration-300 hover:-translate-y-0.5 hover:text-white"
                >
                  {item.label}
                  <span className="absolute inset-x-3 -bottom-0.5 h-px scale-x-0 bg-gradient-to-r from-blue-400 to-violet-400 transition duration-300 group-hover:scale-x-100" />
                </a>
              </li>
            ))}
            {!authUser ? (
              <li>
                <Link
                  to="/login"
                  className="rounded-lg border border-blue-300/35 bg-blue-500/15 px-4 py-2 text-sm font-semibold text-blue-100 transition duration-300 hover:-translate-y-0.5 hover:border-blue-200/55 hover:bg-blue-500/25 hover:text-white"
                >
                  Login
                </Link>
              </li>
            ) : null}
            {!authUser ? (
              <li>
                <Link
                  to="/signup"
                  className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 transition duration-300 hover:-translate-y-0.5 hover:border-blue-300/45 hover:bg-white/15 hover:text-white"
                >
                  Sign Up
                </Link>
              </li>
            ) : null}
          </ul>

          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={() => setMobileMenuOpen(true)}
            className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-slate-100 transition hover:border-blue-300/45 hover:bg-white/15 xl:hidden"
          >
            <MdMenu className="h-6 w-6" />
          </button>

          {authUser ? (
            <div ref={profileRef} className="relative hidden xl:block">
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
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-white/15 bg-slate-950/90 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
                  <Link to="/me" className="block rounded-xl px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10">
                    My Profile
                  </Link>
                  <a href="/#continue-reading" className="block rounded-xl px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10">
                    Continue Reading
                  </a>
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

      </nav>

      <div className="mx-auto mt-2 h-px w-[92%] max-w-7xl bg-gradient-to-r from-transparent via-blue-400/35 to-transparent" />

      <div
        onClick={() => setMobileMenuOpen(false)}
        className={`fixed inset-0 z-[70] bg-slate-950/75 backdrop-blur-sm transition-opacity duration-300 xl:hidden ${
          mobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        className={`fixed right-0 top-0 z-[80] h-full w-[min(86vw,360px)] border-l border-white/15 bg-gradient-to-b from-slate-900 to-slate-950 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition-transform duration-300 xl:hidden ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm font-bold text-white">Menu</p>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-slate-100 transition hover:bg-white/15"
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>

        <label className="group relative mb-4 block">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300/80 transition group-focus-within:text-blue-300">
            <SearchIcon />
          </span>
          <input
            type="text"
            placeholder="Search books..."
            className="h-10 w-full rounded-xl border border-white/15 bg-slate-950/45 pl-10 pr-4 text-sm text-white placeholder:text-slate-300/60 outline-none transition duration-300 focus:border-blue-300/60 focus:bg-slate-900/55 focus:shadow-[0_0_0_4px_rgba(96,102,255,0.18)]"
          />
        </label>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-blue-300/40 hover:bg-white/[0.12]"
            >
              {item.label}
            </a>
          ))}
          {!authUser ? (
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-xl border border-blue-300/35 bg-blue-500/15 px-4 py-3 text-sm font-semibold text-blue-100 transition hover:border-blue-200/55 hover:bg-blue-500/25 hover:text-white"
            >
              Login
            </Link>
          ) : null}
          {!authUser ? (
            <Link
              to="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-blue-300/40 hover:bg-white/[0.12]"
            >
              Sign Up
            </Link>
          ) : null}
          {authUser ? (
            <a
              href="/me"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-blue-300/40 hover:bg-white/[0.12]"
            >
              My Profile
            </a>
          ) : null}
          {authUser ? (
            <a
              href="/#continue-reading"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-blue-300/40 hover:bg-white/[0.12]"
            >
              Continue Reading
            </a>
          ) : null}
          {authUser && isAdmin ? (
            <Link
              to="/admin/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-xl border border-blue-300/35 bg-blue-500/15 px-4 py-3 text-sm font-semibold text-blue-100 transition hover:border-blue-200/55 hover:bg-blue-500/25 hover:text-white"
            >
              Admin Dashboard
            </Link>
          ) : null}
          {authUser ? (
            <button
              type="button"
              onClick={handleLogout}
              className="block w-full rounded-xl border border-rose-200/25 bg-rose-500/10 px-4 py-3 text-left text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20"
            >
              Logout
            </button>
          ) : null}
        </nav>
      </aside>
    </motion.header>
  )
}
