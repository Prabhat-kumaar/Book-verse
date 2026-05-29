import { Link, useLocation } from 'react-router-dom'
import { MdHome, MdLibraryBooks, MdStar, MdExplore, MdPerson } from 'react-icons/md'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function MainLayout({ children, hideChrome = false, fullBleed = false }) {
  const location = useLocation()
  const mobileNavItems = [
    { label: 'Home', href: '/', Icon: MdHome },
    { label: 'Categories', href: '/categories', Icon: MdLibraryBooks },
    { label: 'Recommended', href: '/recommended', Icon: MdStar },
    { label: 'Explore', href: '/books', Icon: MdExplore },
    { label: 'Account', href: '/me', Icon: MdPerson },
  ]

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      {!hideChrome ? <div className="pointer-events-none absolute -left-20 top-24 h-72 w-72 rounded-full bg-blue-600/20 blur-[110px]" /> : null}
      {!hideChrome ? <div className="pointer-events-none absolute right-0 top-56 h-80 w-80 rounded-full bg-indigo-500/20 blur-[120px]" /> : null}
      {!hideChrome ? <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-cyan-400/10 blur-[100px]" /> : null}

      {!hideChrome ? <Navbar /> : null}
      <main className={fullBleed
        ? 'relative w-full flex-1'
        : 'relative mx-auto w-full max-w-7xl flex-1 bg-[#0d0d1a] px-3 pb-[calc(92px+var(--safe-bottom))] pt-5 sm:bg-transparent sm:px-8 sm:pt-10 md:pb-16 lg:px-12'}
      >
        {children}
      </main>
      {!hideChrome ? <Footer /> : null}

      {!hideChrome ? <nav className="fixed bottom-0 left-0 right-0 z-[90] border-t border-white/[0.08] bg-[#05070f]/95 pb-[calc(4px+var(--safe-bottom))] backdrop-blur-xl md:hidden">
        <ul className="mx-auto grid max-w-7xl grid-cols-5 px-1 py-1">
          {mobileNavItems.map((item) => {
            const active = location.pathname === item.href
            const IconComponent = item.Icon
            return (
              <li key={item.label} className="px-0.5">
                <Link
                  to={item.href}
                  className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[10px] font-bold transition duration-300 ${
                    active 
                      ? 'text-white bg-gradient-to-b from-purple-500/10 to-pink-500/10' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className={`transition-all duration-300 ${active ? 'text-pink-400 scale-110 drop-shadow-[0_0_10px_rgba(244,63,94,0.65)]' : 'text-slate-400'}`}>
                    <IconComponent className="h-6 w-6" />
                  </span>
                  <span className={active ? 'text-white font-extrabold' : 'text-slate-400'}>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav> : null}
    </div>
  )
}
