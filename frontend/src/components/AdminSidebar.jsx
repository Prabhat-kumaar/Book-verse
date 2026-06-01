import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { MdClose, MdMenu } from 'react-icons/md'

const navItems = [
  { label: 'Dashboard', to: '/admin/dashboard' },
  { label: 'Add Book', to: '/admin/add-book' },
  { label: 'Manage Books', to: '/admin/manage-books' },
  { label: 'Analytics', to: '/admin/analytics' },
  { label: 'Manage Users', to: '/admin/users' },
]

export default function AdminSidebar() {
  const navigate = useNavigate()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const onLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
    window.dispatchEvent(new Event('authChanged'))
    localStorage.removeItem('adminEmail')
    navigate('/login', { replace: true })
  }

  return (
    <>
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="Open admin menu"
          className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-blue-300/40 hover:bg-white/15"
        >
          <MdMenu className="h-5 w-5" />
          Menu
        </button>
      </div>

      <aside className="hidden rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.11] to-white/[0.05] p-4 backdrop-blur-2xl lg:block lg:p-5">
        <div className="mb-5 rounded-2xl border border-blue-300/30 bg-blue-500/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100/80">Readify AI</p>
          <h1 className="mt-1 bg-gradient-to-r from-blue-300 to-violet-300 bg-clip-text text-2xl font-black text-transparent">Admin Panel</h1>
        </div>

        <nav className="flex gap-2 overflow-x-auto lg:flex-col">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-xl border px-4 py-3 text-left text-sm font-semibold transition duration-300 ${
                  isActive
                    ? 'border-blue-300/45 bg-gradient-to-r from-blue-500/20 to-violet-500/20 text-white shadow-[0_0_24px_rgba(95,120,255,0.35)]'
                    : 'border-white/10 bg-white/[0.04] text-slate-300 hover:-translate-y-0.5 hover:border-blue-300/30 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={onLogout}
            className="whitespace-nowrap rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm font-semibold text-slate-300 transition duration-300 hover:-translate-y-0.5 hover:border-blue-300/30 hover:text-white"
          >
            Logout
          </button>
        </nav>
      </aside>

      <div
        onClick={() => setMobileSidebarOpen(false)}
        className={`fixed inset-0 z-[70] bg-slate-950/75 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          mobileSidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        className={`fixed left-0 top-0 z-[80] h-full w-[min(84vw,320px)] border-r border-white/15 bg-gradient-to-b from-slate-900 to-slate-950 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition-transform duration-300 lg:hidden ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm font-bold text-white">Admin Menu</p>
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close admin menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-slate-100 transition hover:bg-white/15"
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-blue-300/30 bg-blue-500/10 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100/80">Readify AI</p>
          <h2 className="mt-1 bg-gradient-to-r from-blue-300 to-violet-300 bg-clip-text text-xl font-black text-transparent">Admin Panel</h2>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              onClick={() => setMobileSidebarOpen(false)}
              className={({ isActive }) =>
                `block rounded-xl border px-4 py-3 text-left text-sm font-semibold transition duration-300 ${
                  isActive
                    ? 'border-blue-300/45 bg-gradient-to-r from-blue-500/20 to-violet-500/20 text-white shadow-[0_0_24px_rgba(95,120,255,0.35)]'
                    : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-blue-300/30 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={onLogout}
            className="block w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm font-semibold text-slate-300 transition duration-300 hover:border-blue-300/30 hover:text-white"
          >
            Logout
          </button>
        </nav>
      </aside>
    </>
  )
}
