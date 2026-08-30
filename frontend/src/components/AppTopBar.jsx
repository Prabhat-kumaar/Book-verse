import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  MdSearch,
  MdNotificationsNone,
  MdSettings,
  MdMenu,
  MdPerson,
  MdLogout,
  MdAdminPanelSettings,
  MdClose,
} from 'react-icons/md'

export default function AppTopBar({ onOpenMobileSidebar = () => {} }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [authUser, setAuthUser] = useState(() => {
    try {
      const raw = localStorage.getItem('authUser')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  const profileRef = useRef(null)
  const notifRef = useRef(null)

  useEffect(() => {
    const syncAuth = () => {
      try {
        const raw = localStorage.getItem('authUser')
        setAuthUser(raw ? JSON.parse(raw) : null)
      } catch {
        setAuthUser(null)
      }
    }
    window.addEventListener('storage', syncAuth)
    window.addEventListener('authChanged', syncAuth)
    return () => {
      window.removeEventListener('storage', syncAuth)
      window.removeEventListener('authChanged', syncAuth)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileMenuOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed) {
      navigate(`/books?q=${encodeURIComponent(trimmed)}`)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
    window.dispatchEvent(new Event('authChanged'))
    navigate('/login')
  }

  const userInitial = (authUser?.username?.[0] || 'R').toUpperCase()
  const avatarUrl =
    authUser?.avatar ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop'

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-[#181b2e]/80 bg-[#0c0e18]/80 px-4 backdrop-blur-xl md:px-8">
      {/* Left: Mobile hamburger & Search bar */}
      <div className="flex flex-1 items-center gap-3 md:gap-4">
        <button
          onClick={onOpenMobileSidebar}
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-white md:hidden"
          aria-label="Open Navigation"
        >
          <MdMenu className="h-6 w-6" />
        </button>

        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-xl">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <MdSearch className="h-5 w-5" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search books, authors, or genres..."
            className="w-full rounded-xl border border-white/[0.08] bg-[#121526]/90 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-100 placeholder-slate-400 shadow-inner transition focus:border-indigo-500/80 focus:bg-[#151930] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </form>
      </div>

      {/* Right: Actions (Notification, Settings, Avatar) */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotificationsOpen((prev) => !prev)}
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.03] text-slate-400 transition hover:bg-white/[0.07] hover:text-white"
            aria-label="Notifications"
          >
            <MdNotificationsNone className="h-5 w-5" />
            {/* Notification Dot */}
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-400" />
          </button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-white/10 bg-[#121528] p-4 shadow-2xl backdrop-blur-xl animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Notifications</span>
                <span className="text-[10px] font-semibold text-indigo-400">2 New</span>
              </div>
              <div className="mt-2.5 space-y-2 text-xs">
                <div className="rounded-xl bg-white/[0.03] p-2.5 hover:bg-white/[0.06] transition">
                  <p className="font-semibold text-white">Daily Streak Achieved!</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">You reached 14 days of reading consistency.</p>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-2.5 hover:bg-white/[0.06] transition">
                  <p className="font-semibold text-white">New Arrival Added</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Synthetic Minds by Dr. E. Turing is now available.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Settings Gear */}
        <Link
          to="/profile"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.03] text-slate-400 transition hover:bg-white/[0.07] hover:text-white"
          title="Account Settings"
        >
          <MdSettings className="h-5 w-5" />
        </Link>

        {/* Profile Avatar Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileMenuOpen((prev) => !prev)}
            type="button"
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-purple-500/40 bg-purple-900/30 ring-2 ring-purple-500/20 transition hover:ring-purple-500/50"
            aria-label="User Profile"
          >
            <img
              src={avatarUrl}
              alt="User Avatar"
              className="h-full w-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
            <span style={{ display: 'none' }} className="h-full w-full items-center justify-center font-bold text-white text-sm">
              {userInitial}
            </span>
          </button>

          {/* Profile Menu Dropdown */}
          {profileMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/10 bg-[#121528] p-2 shadow-2xl backdrop-blur-xl animate-fadeIn">
              <div className="px-3 py-2 border-b border-white/10">
                <p className="text-xs font-bold text-white truncate">
                  {authUser?.username || 'Reader'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {authUser?.email || 'reader@readify.ai'}
                </p>
              </div>

              <div className="mt-1 space-y-0.5">
                <Link
                  to="/stats"
                  onClick={() => setProfileMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/[0.06] hover:text-white transition"
                >
                  <MdPerson className="h-4 w-4 text-indigo-400" />
                  <span>Dashboard & Stats</span>
                </Link>

                <Link
                  to="/profile"
                  onClick={() => setProfileMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/[0.06] hover:text-white transition"
                >
                  <MdSettings className="h-4 w-4 text-indigo-400" />
                  <span>Account Settings</span>
                </Link>

                {authUser?.role === 'admin' && (
                  <Link
                    to="/admin/dashboard"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-amber-300 hover:bg-white/[0.06] transition"
                  >
                    <MdAdminPanelSettings className="h-4 w-4" />
                    <span>Admin Panel</span>
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition"
                >
                  <MdLogout className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
