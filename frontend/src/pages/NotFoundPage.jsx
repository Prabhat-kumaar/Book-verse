import { Link } from 'react-router-dom'
import SEO from '../components/SEO'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#050914] bg-[radial-gradient(circle_at_12%_8%,rgba(56,96,255,0.22),transparent_34%),radial-gradient(circle_at_86%_4%,rgba(120,80,255,0.2),transparent_30%),linear-gradient(165deg,#05070f_0%,#0a0f1f_46%,#06070d_100%)] px-4 py-10 text-white flex flex-col justify-center items-center">
      <SEO 
        title="Page Not Found | Readify AI" 
        description="The page you are looking for does not exist on Readify AI. Return to your library or home page to continue reading."
        path="/404"
      />
      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center text-center">
        <div className="w-full rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
            404
          </div>
          <h1 className="mt-4 text-2xl font-bold leading-tight">
            Lost in the library?
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            The page you are looking for has been moved, deleted, or never existed in our catalogue.
          </p>

          <div className="mt-8 grid gap-3">
            <Link
              to="/"
              className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-indigo-950/30 transition hover:opacity-95"
            >
              Return Home
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/books" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-slate-100 transition hover:bg-white/10">
                Browse Books
              </Link>
              <Link to="/blog" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-slate-100 transition hover:bg-white/10">
                Read Blog
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
