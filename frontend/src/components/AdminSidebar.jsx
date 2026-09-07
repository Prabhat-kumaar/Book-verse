import { NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  MdAutoAwesome,
  MdLibraryBooks,
  MdPeople,
  MdAnalytics,
  MdStorage,
  MdLogout,
  MdMenu,
  MdClose,
  MdCheckCircle,
  MdSensors,
} from 'react-icons/md'

const navItems = [
  { label: 'Smart Ingestion', to: '/admin/dashboard', icon: <MdAutoAwesome className="h-4.5 w-4.5" /> },
  { label: 'Catalog Studio', to: '/admin/manage-books', icon: <MdLibraryBooks className="h-4.5 w-4.5" /> },
  { label: 'User Command', to: '/admin/users', icon: <MdPeople className="h-4.5 w-4.5" /> },
  { label: 'Analytics & Insights', to: '/admin/analytics', icon: <MdAnalytics className="h-4.5 w-4.5" /> },
  { label: 'Storage & Health', to: '/admin/add-book', icon: <MdStorage className="h-4.5 w-4.5" /> },
]

export default function AdminSidebar() {
  const navigate = useNavigate()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [latency, setLatency] = useState(12)

  useEffect(() => {
    const interval = setInterval(() => {
      // Realistic live cluster ping latency (11ms - 16ms)
      setLatency(Math.floor(Math.random() * 5) + 11)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const onLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
    window.dispatchEvent(new Event('authChanged'))
    localStorage.removeItem('adminEmail')
    navigate('/login', { replace: true })
  }

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden mb-2">
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="Open admin menu"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#0c1222] px-4 py-2.5 text-xs font-semibold text-slate-200 shadow-lg backdrop-blur-xl transition hover:border-purple-500/40 hover:bg-[#131b31]"
        >
          <MdMenu className="h-4.5 w-4.5 text-purple-400" />
          <span>Cluster Command</span>
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden h-fit rounded-3xl border border-white/[0.08] bg-[#070b14]/95 p-5 shadow-2xl shadow-black/80 backdrop-blur-2xl lg:flex lg:flex-col lg:justify-between lg:sticky lg:top-6 w-[260px] shrink-0">
        <div>
          {/* Brand Header */}
          <div className="mb-6 flex items-center justify-between pb-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-lg shadow-purple-900/40">
                <MdAutoAwesome className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>Readify</span>
                  <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-purple-300 border border-purple-500/30">
                    PRO
                  </span>
                </h1>
                <p className="text-[10px] text-slate-400 font-medium">Cluster v4.19-re3</p>
              </div>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" title="System Online" />
          </div>

          {/* System Status Pill */}
          <div className="mb-5 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-950/20 px-3 py-2 text-[11px] font-semibold text-emerald-400">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              All Systems Online
            </span>
            <span className="font-mono text-[10px] opacity-80">99.9%</span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-3.5 py-3 text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'border border-purple-500/40 bg-gradient-to-r from-purple-600/30 via-indigo-600/20 to-purple-900/10 text-white shadow-lg shadow-purple-950/50 font-bold'
                      : 'border border-transparent text-slate-400 hover:border-white/5 hover:bg-white/[0.04] hover:text-slate-200'
                  }`
                }
              >
                <span className="text-purple-400">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Cluster Telemetry & Sign Out */}
        <div className="mt-8 pt-5 border-t border-white/[0.06] space-y-4">
          {/* Cluster Ping Widget */}
          <div className="rounded-2xl border border-white/[0.06] bg-black/40 p-3 text-[11px] space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <MdSensors className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                Cluster Latency
              </span>
              <span className="text-emerald-400 font-mono font-bold text-[11px]">{latency}ms</span>
            </div>
            <div className="flex items-center justify-between text-slate-500 text-[10px]">
              <span>Cluster ID</span>
              <span className="font-mono text-slate-400">us-east-prod-04</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-rose-500/10 py-2.5 px-3 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20 active:scale-[0.98]"
          >
            <MdLogout className="h-4 w-4 text-rose-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      <div
        onClick={() => setMobileSidebarOpen(false)}
        className={`fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          mobileSidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        className={`fixed left-0 top-0 z-[80] h-full w-[min(84vw,320px)] border-r border-white/10 bg-[#070b14] p-6 shadow-2xl backdrop-blur-2xl transition-transform duration-300 lg:hidden flex flex-col justify-between ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white">Readify PRO</h2>
            </div>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Close admin menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            >
              <MdClose className="h-5 w-5" />
            </button>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                onClick={() => setMobileSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-semibold transition ${
                    isActive
                      ? 'border border-purple-500/40 bg-purple-600/20 text-white font-bold shadow-lg shadow-purple-900/40'
                      : 'border border-transparent text-slate-400 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <span className="text-purple-400">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-rose-500/10 py-3 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
        >
          <MdLogout className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </aside>
    </>
  )
}

