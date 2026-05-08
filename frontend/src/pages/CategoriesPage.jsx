import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import useBooks from '../hooks/useBooks'

function normalize(value) {
  return (value || '').toString().trim().toLowerCase()
}

function CategoryBookCard({ book }) {
  const readerLink = `#reader?bookId=${encodeURIComponent(book._id || '')}&pdf=${encodeURIComponent(book.pdf || '')}&title=${encodeURIComponent(book.title || '')}&author=${encodeURIComponent(book.author || '')}`

  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] p-3 backdrop-blur-lg">
      <div className="mb-3 h-52 w-full overflow-hidden rounded-xl bg-slate-900 ring-1 ring-white/10">
        {book.thumbnail ? (
          <img src={book.thumbnail} alt={book.title} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-blue-500/50 to-violet-600/50 p-3 text-center text-sm font-semibold text-white">
            {book.title}
          </div>
        )}
      </div>
      <h3 className="line-clamp-1 text-sm font-semibold text-white">{book.title}</h3>
      <p className="line-clamp-1 text-xs text-slate-300">{book.author || 'Unknown author'}</p>
      <p className="mt-1 line-clamp-1 text-xs text-blue-100/85">{book.category || 'Uncategorized'}</p>
      <a
        href={readerLink}
        className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/15"
      >
        Open Reader
      </a>
    </article>
  )
}

export default function CategoriesPage() {
  const { books, loading, error } = useBooks()
  const [searchParams] = useSearchParams()
  const activeCategory = searchParams.get('category') || ''

  const categories = useMemo(() => {
    const unique = new Set()
    books.forEach((book) => {
      const category = (book.category || '').toString().trim()
      if (category) unique.add(category)
    })
    return Array.from(unique).sort((a, b) => a.localeCompare(b))
  }, [books])

  const filteredBooks = useMemo(() => {
    if (!activeCategory) return []
    const wanted = normalize(activeCategory)
    return books.filter((book) => normalize(book.category) === wanted)
  }, [books, activeCategory])

  const randomBooks = useMemo(() => {
    const copy = [...books]
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy.slice(0, 9)
  }, [books])

  const visibleBooks = activeCategory ? filteredBooks : randomBooks

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 sm:p-7">
      <h1 className="text-2xl font-bold text-white sm:text-3xl">Categories</h1>

      {loading ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={`cat-skeleton-${i}`} className="h-20 animate-pulse rounded-xl border border-white/10 bg-white/[0.05]" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-5 rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>
      ) : categories.length === 0 ? (
        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">No categories found</div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => {
            const selected = normalize(activeCategory) === normalize(category)
            return (
              <Link
                key={category}
                to={`/categories?category=${encodeURIComponent(category)}`}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${selected
                  ? 'border-blue-300/55 bg-blue-500/20 text-blue-100'
                  : 'border-white/15 bg-white/[0.04] text-slate-100 hover:bg-white/[0.08]'}`}
              >
                {category}
              </Link>
            )
          })}
        </div>
      )}

      <div className="mt-7">
        <h2 className="text-lg font-semibold text-white">
          {activeCategory ? `Books in ${activeCategory}` : 'Featured Books'}
        </h2>
        {visibleBooks.length === 0 ? (
          <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">No books found</div>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleBooks.map((book) => (
              <CategoryBookCard key={book._id || `${book.title}-${book.author}`} book={book} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
