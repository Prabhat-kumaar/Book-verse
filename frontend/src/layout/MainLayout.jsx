import { Link, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function MainLayout({ children }) {
  const location = useLocation()
  const mobileNavItems = [
    { label: 'Home', href: '/', icon: '🏠' },
    { label: 'Categories', href: '/categories', icon: '📚' },
    { label: 'Recommended', href: '/recommended', icon: '✨' },
    { label: 'Explore', href: '/books', icon: '🧭' },
    { label: 'Account', href: '/me', icon: '👤' },
  ]

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      <div className="pointer-events-none absolute -left-20 top-24 h-72 w-72 rounded-full bg-blue-600/20 blur-[110px]" />
      <div className="pointer-events-none absolute right-0 top-56 h-80 w-80 rounded-full bg-indigo-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-cyan-400/10 blur-[100px]" />

      <Navbar />
      <main className="relative mx-auto w-full max-w-7xl flex-1 bg-[#0d0d1a] px-3 pb-[calc(92px+var(--safe-bottom))] pt-5 sm:bg-transparent sm:px-8 sm:pt-10 md:pb-16 lg:px-12">
        {children}
      </main>
      <Footer />

      <nav className="fixed bottom-0 left-0 right-0 z-[90] border-t border-[#222] bg-[#0a0a0f]/95 pb-[var(--safe-bottom)] backdrop-blur-xl md:hidden">
        <ul className="mx-auto grid max-w-7xl grid-cols-5 px-1">
          {mobileNavItems.map((item) => {
            const active = location.pathname === item.href
            return (
              <li key={item.label}>
                <Link
                  to={item.href}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-medium transition ${
                    active ? 'text-indigo-300' : 'text-slate-300'
                  }`}
                >
                  <span className={`text-base ${active ? 'drop-shadow-[0_0_10px_rgba(129,140,248,0.75)]' : ''}`}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
