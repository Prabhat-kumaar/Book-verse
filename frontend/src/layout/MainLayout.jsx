import Navbar from '../components/Navbar'

export default function MainLayout({ children }) {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div className="pointer-events-none absolute -left-20 top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-[110px]" />
      <div className="pointer-events-none absolute right-0 top-56 h-80 w-80 rounded-full bg-violet-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-cyan-400/10 blur-[100px]" />

      <Navbar />
      <main className="relative mx-auto w-full max-w-7xl px-4 pb-20 pt-12 sm:px-8 lg:px-12">
        {children}
      </main>
    </div>
  )
}
