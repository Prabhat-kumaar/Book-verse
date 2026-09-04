import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  MdHome,
  MdCollectionsBookmark,
  MdBarChart,
  MdSettings,
  MdHelpOutline,
  MdLogout,
  MdClose,
  MdCheckCircle,
  MdStar,
} from 'react-icons/md'

export default function AppSidebar({ mobileOpen = false, onCloseMobile = () => {} }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [proModalOpen, setProModalOpen] = useState(false)
  const [helpModalOpen, setHelpModalOpen] = useState(false)

  const pathname = location.pathname

  const isDiscoverActive = pathname === '/books' || pathname === '/'
  const isLibraryActive = pathname === '/library' || pathname === '/saved-books'
  const isAnalyticsActive = pathname === '/analytics' || (pathname === '/profile' && location.hash === '#analytics')
  const isProfileActive = pathname === '/profile' && location.hash !== '#analytics'

  const navItems = [
    { label: 'Discover', href: '/books', active: isDiscoverActive },
    { label: 'Library', href: '/saved-books', active: isLibraryActive },
    { label: 'Analytics', href: '/profile#analytics', active: isAnalyticsActive },
    { label: 'Profile', href: '/profile', active: isProfileActive },
  ]

  const handleSignOut = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
    window.dispatchEvent(new Event('authChanged'))
    navigate('/login')
  }

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col justify-between border-r border-white/[0.06] bg-[#0c101a] px-4 py-6 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: Logo & Main Navigation */}
        <div className="flex flex-col gap-7">
          {/* Logo Brand Header */}
          <div className="flex items-center justify-between px-2">
            <Link
              to="/"
              onClick={onCloseMobile}
              className="flex items-center gap-3 transition-transform duration-200 active:scale-95"
            >
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-tr from-violet-600 to-pink-500 text-white shadow-md shadow-purple-900/30">
                <MdHome className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-black tracking-tight text-white flex items-center">
                  Read<span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">ify</span>
                </span>
                <span className="text-[8px] font-bold tracking-[0.2em] text-slate-400 uppercase">
                  PREMIUM READING
                </span>
              </div>
            </Link>

            {/* Mobile close button */}
            <button
              onClick={onCloseMobile}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white md:hidden"
              aria-label="Close Sidebar"
            >
              <MdClose className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const active = item.active
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={onCloseMobile}
                  className={`group flex items-center gap-3.5 rounded-xl px-4 py-3 text-xs font-semibold transition-all duration-200 ${
                    active
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-purple-900/40'
                      : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
                  }`}
                >
                  <span className="text-sm">
                    {item.label === 'Discover' && '🧭'}
                    {item.label === 'Library' && '📖'}
                    {item.label === 'Analytics' && '📈'}
                    {item.label === 'Community' && '👥'}
                    {item.label === 'Profile' && '👤'}
                  </span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Bottom Section: Start Reading Button & Controls */}
        <div className="flex flex-col gap-3 pt-4 border-t border-white/[0.06]">
          <Link
            to="/read/the-silent-stars"
            className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 py-3 px-4 text-xs font-bold text-white shadow-lg shadow-purple-950/40 transition hover:brightness-110 active:scale-[0.98]"
          >
            Start Reading
          </Link>

          <div className="flex flex-col gap-1">
            <button
              onClick={() => setHelpModalOpen(true)}
              type="button"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-200"
            >
              <MdHelpOutline className="h-4 w-4" />
              <span>Help</span>
            </button>

            <button
              onClick={handleSignOut}
              type="button"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300"
            >
              <MdLogout className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop for Mobile */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Upgrade to Pro Modal */}
      {proModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md rounded-2xl border border-purple-500/30 bg-[#121528] p-6 shadow-2xl shadow-purple-950/60">
            <button
              onClick={() => setProModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <MdClose className="h-5 w-5" />
            </button>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 shadow-lg shadow-purple-600/30">
              <MdStar className="h-6 w-6 text-amber-300" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-white">Readify Pro</h3>
            <p className="mt-1 text-xs text-slate-400">
              Unlock unlimited AI book summaries, voice narration, synced highlights, and offline downloads.
            </p>

            <div className="mt-5 space-y-2.5">
              {[
                'Unlimited AI speed-reading & chapter synthesis',
                'Advanced speech-to-text neural audiobook narrations',
                'Unlimited personal library & custom book uploads',
                'Cross-device reading sync & custom notes export',
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-2 text-xs text-slate-300">
                  <MdCheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  alert('Thank you for your interest! Pro features are currently unlocked for your account in beta.')
                  setProModalOpen(false)
                }}
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg hover:brightness-110"
              >
                Start 14-Day Free Trial
              </button>
              <button
                type="button"
                onClick={() => setProModalOpen(false)}
                className="w-full rounded-xl py-2 text-xs text-slate-400 hover:text-white"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {helpModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#121528] p-6 shadow-2xl">
            <button
              onClick={() => setHelpModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <MdClose className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold text-white">Help & Support</h3>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              Readify is designed to help you read and absorb books faster with AI assistance and reading analytics.
            </p>
            <div className="mt-4 space-y-2 text-xs text-slate-400">
              <p>• <strong>Home</strong>: Discover featured books of the week, trending titles, and recent arrivals.</p>
              <p>• <strong>Library</strong>: Access your reading list, filter by status, and track completion progress.</p>
              <p>• <strong>Stats</strong>: View reading metrics, hours spent, and daily reading streaks.</p>
              <p>• <strong>Reader</strong>: Distraction-free reading with chapter sidebar and font controls.</p>
            </div>
            <button
              type="button"
              onClick={() => setHelpModalOpen(false)}
              className="mt-6 w-full rounded-xl bg-white/10 py-2.5 text-xs font-semibold text-white hover:bg-white/20"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}
