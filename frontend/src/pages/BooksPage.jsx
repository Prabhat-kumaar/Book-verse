import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import useBooks from '../hooks/useBooks'

function normalize(value) {
  return (value || '').toString().trim().toLowerCase()
}

function BookCard({ book }) {
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

export default function BooksPage() {
  const { books, loading, error } = useBooks()
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''

  const filteredBooks = useMemo(() => {
    const q = normalize(query)
    if (!q) return books

    return books.filter((book) => {
      const title = normalize(book.title)
      const author = normalize(book.author)
      const category = normalize(book.category)
      return title.includes(q) || author.includes(q) || category.includes(q)
    })
  }, [books, query])

  return (
    <section id="books-section" className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 sm:p-7">
      <h1 className="text-2xl font-bold text-white sm:text-3xl">Explore Books</h1>
      <p className="mt-1 text-sm text-slate-300">Search by title, author, or category.</p>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
        Showing {filteredBooks.length} of {books.length} books{query ? ` for "${query}"` : ''}
      </div>

      {loading ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={`book-skeleton-${i}`} className="h-80 animate-pulse rounded-2xl border border-white/10 bg-white/[0.05]" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-5 rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>
      ) : filteredBooks.length === 0 ? (
        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">No books found</div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredBooks.map((book) => (
            <BookCard key={book._id || `${book.title}-${book.author}`} book={book} />
          ))}
        </div>
      )}
    </section>
  )
}