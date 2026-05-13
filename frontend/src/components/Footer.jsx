import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="relative mt-10 border-t border-white/10 bg-black/60">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-8 lg:grid-cols-3 lg:px-12">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-300/80">Readify AI</p>
          <p className="mt-2 text-sm text-zinc-300">Streamlined reading experience for books, notes, and progress tracking.</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Explore</p>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-zinc-300">
            <Link to="/" className="transition hover:text-blue-300">Home</Link>
            <Link to="/books" className="transition hover:text-blue-300">Books</Link>
            <Link to="/categories" className="transition hover:text-blue-300">Categories</Link>
            <Link to="/recommended" className="transition hover:text-blue-300">Recommended</Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Account</p>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-zinc-300">
            <Link to="/login" className="transition hover:text-blue-300">Login</Link>
            <Link to="/signup" className="transition hover:text-blue-300">Sign up</Link>
            <Link to="/saved-books" className="transition hover:text-blue-300">Saved books</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-3 text-center text-xs text-zinc-400">
        © {new Date().getFullYear()} Readify AI. All rights reserved.
      </div>
    </footer>
  )
}
