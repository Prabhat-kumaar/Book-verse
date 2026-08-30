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

  const isHomeActive = pathname === '/'
  const isLibraryActive = pathname === '/library' || pathname === '/saved-books'
  const isStatsActive = pathname === '/stats' || pathname === '/profile' || pathname === '/me'
  const isSettingsActive = pathname === '/settings' || pathname.startsWith('/admin')

  const navItems = [
    { label: 'Home', href: '/', icon: MdHome, active: isHomeActive },
    { label: 'Library', href: '/library', icon: MdCollectionsBookmark, active: isLibraryActive },
    { label: 'Stats', href: '/stats', icon: MdBarChart, active: isStatsActive },
    { label: 'Settings', href: '/profile', icon: MdSettings, active: isSettingsActive },
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
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col justify-between border-r border-[#1e2238] bg-[#0c0e18] px-4 py-6 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: Logo & Main Navigation */}
        <div className="flex flex-col gap-8">
          {/* Logo Brand Header */}
          <div className="flex items-center justify-between px-2">
            <Link
              to="/"
              onClick={onCloseMobile}
              className="flex items-center gap-3.5 transition-transform duration-200 active:scale-95"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-violet-500 font-extrabold text-white text-lg shadow-lg shadow-purple-900/30">
                R
              </div>
              <div className="flex flex-col">
                <span className="text-base font-black tracking-tight text-white">Readify AI</span>
                <span className="text-[11px] font-medium text-slate-400">Intelligent Reading</span>
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
              const Icon = item.icon
              const active = item.active
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={onCloseMobile}
                  className={`group flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                    active
                      ? 'bg-[#21243b] text-white shadow-inner shadow-black/20'
                      : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${
                      active ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Bottom Section: Pro Upgrade, Help, Sign Out */}
        <div className="flex flex-col gap-4 border-t border-[#1a1e33] pt-5">
          {/* Upgrade to Pro Button */}
          <button
            onClick={() => setProModalOpen(true)}
            type="button"
            className="group relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-[#6e3df6] via-[#854bfb] to-[#a155f9] px-4 py-3 text-sm font-bold text-white shadow-xl shadow-purple-950/40 transition-all duration-300 hover:brightness-110 hover:shadow-purple-700/30 active:scale-[0.98]"
          >
            <span className="relative z-10 flex items-center gap-1.5">
              <MdStar className="h-4 w-4 text-amber-300 animate-pulse" />
              Upgrade to Pro
            </span>
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
          </button>

          {/* Help & Sign Out links */}
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
              <span>Sign Out</span>
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
            <h3 className="mt-4 text-xl font-bold text-white">Readify AI Pro</h3>
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
              Readify AI is designed to help you read and absorb books faster with AI assistance and reading analytics.
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
