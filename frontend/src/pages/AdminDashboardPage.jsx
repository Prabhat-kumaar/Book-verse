import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { MdPeople, MdLibraryBooks, MdVisibility, MdGroup, MdBook, MdAccessTime } from 'react-icons/md'
import AdminSidebar from '../components/AdminSidebar'
import apiClient from '../lib/apiClient'

const isDev = import.meta.env.DEV

function StatCard({ title, value, hint, icon }) {
  return (
    <motion.article
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 240, damping: 18 }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#111827]/75 to-[#0b0f19]/80 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl"
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition duration-500 group-hover:opacity-100 [background:radial-gradient(circle_at_top_right,rgba(99,102,241,0.06),transparent_50%)]" />
      
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <p className="mt-2.5 text-3xl font-extrabold text-white tracking-tight">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/15 to-purple-500/15 text-indigo-400 border border-indigo-500/20 shadow-inner">
          {icon}
        </div>
      </div>
      
      <div className="mt-4 flex items-center gap-1.5 text-xs text-indigo-300">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
        <span>{hint}</span>
      </div>
    </motion.article>
  )
}

export default function AdminDashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        const response = await apiClient.get('/api/analytics/admin')
        if (response.data?.success) {
          setData(response.data)
        } else {
          setError('Failed to fetch analytics overview.')
        }
      } catch (err) {
        if (isDev) console.error('Error fetching admin statistics:', err)
        setError(err.response?.data?.message || 'Error communicating with analytics service.')
      } finally {
        setLoading(false)
      }
    }
    fetchAdminStats()
  }, [])

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#050914] text-slate-100">
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-blue-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-violet-500/20 blur-[130px]" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 gap-4 p-4 lg:grid-cols-[280px_1fr] lg:gap-6 lg:p-6">
        <AdminSidebar />

        <main className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 backdrop-blur-2xl lg:p-8">
          
          {/* Header Banner */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-400">Dashboard Overview</p>
              <h2 className="mt-1 text-3xl font-black text-white sm:text-4xl tracking-tight">Welcome back, Admin</h2>
              <p className="mt-2 text-sm text-slate-300">Monitor library metrics, review clean EPUB pipelines, and track engagement.</p>
            </div>
            <button
              onClick={() => window.print()}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-200 transition hover:border-indigo-500/40 hover:bg-white/10"
            >
              Print Summary
            </button>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          {/* Stat Grid */}
          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
              ))
            ) : (
              <>
                <StatCard 
                  title="Total Users" 
                  value={data?.totalUsers ?? 0} 
                  hint={data ? `Today: +${data.newUsersToday ?? 0} | This Week: +${data.newUsersThisWeek ?? 0}` : "Live registrations"} 
                  icon={<MdPeople className="h-6 w-6" />} 
                />
                <StatCard 
                  title="Books Uploaded" 
                  value={data?.totalBooks ?? 0} 
                  hint="Clean EPUB & PDFs ready" 
                  icon={<MdLibraryBooks className="h-6 w-6" />} 
                />
                <StatCard 
                  title="Website Visits" 
                  value={data?.websiteVisits ?? 0} 
                  hint="Cumulative pageviews" 
                  icon={<MdVisibility className="h-6 w-6" />} 
                />
                <StatCard 
                  title="Active Readers Today" 
                  value={data?.activeReadersTodayCount ?? 0} 
                  hint="Users reading within 24h" 
                  icon={<MdGroup className="h-6 w-6" />} 
                />
              </>
            )}
          </section>

          {/* Details Section */}
          <section className="mt-8 grid gap-6 xl:grid-cols-2">
            
            {/* Most Read Book Card */}
            <motion.article
              whileHover={{ y: -3 }}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#111827]/75 to-[#0b0f19]/80 p-6 shadow-lg backdrop-blur-xl"
            >
              <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition duration-500 group-hover:opacity-100 [background:radial-gradient(circle_at_top_right,rgba(147,51,234,0.06),transparent_50%)]" />
              
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <MdBook className="h-5 w-5 text-indigo-400" />
                  Most Popular Content
                </h3>
                <p className="mt-1 text-xs text-slate-400">Content generated from live open counters</p>
                
                {loading ? (
                  <div className="mt-6 space-y-3 animate-pulse">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-10 rounded bg-white/10" />
                    ))}
                  </div>
                ) : data?.popularBooks && data.popularBooks.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    {data.popularBooks.map((book, idx) => (
                      <div key={book.id} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-indigo-500/10 text-xs font-bold text-indigo-300">
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <h4 className="truncate text-sm font-bold text-white max-w-[180px] sm:max-w-[240px]" title={book.title}>{book.title}</h4>
                            <p className="truncate text-[11px] text-slate-400">{book.author}</p>
                          </div>
                        </div>
                        <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-300">
                          🔥 {book.openCount} opens
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-8 text-center text-slate-500 text-sm">
                    No reading history recorded yet.
                  </div>
                )}
              </div>
            </motion.article>

            {/* Recent Uploads Table */}
            <motion.article
              whileHover={{ y: -3 }}
              className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#111827]/75 to-[#0b0f19]/80 p-6 shadow-lg backdrop-blur-xl"
            >
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MdAccessTime className="h-5 w-5 text-indigo-400" />
                Recent Library Additions
              </h3>
              <p className="mt-1 text-xs text-slate-400">Last 5 books processed by the clean EPUB pipeline</p>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider font-semibold">
                      <th className="pb-3">Title</th>
                      <th className="pb-3">Author</th>
                      <th className="pb-3 text-right">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      [...Array(3)].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="py-3"><div className="h-4 w-28 rounded bg-white/10" /></td>
                          <td className="py-3"><div className="h-4 w-20 rounded bg-white/10" /></td>
                          <td className="py-3 text-right"><div className="h-4 w-16 ml-auto rounded bg-white/10" /></td>
                        </tr>
                      ))
                    ) : data?.recentUploads && data.recentUploads.length > 0 ? (
                      data.recentUploads.map((book) => (
                        <tr key={book.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                          <td className="py-3 font-semibold text-white truncate max-w-[150px]" title={book.title}>{book.title}</td>
                          <td className="py-3 text-slate-300 truncate max-w-[120px]">{book.author}</td>
                          <td className="py-3 text-right">
                            <span className="inline-block rounded-full bg-indigo-500/10 px-2 py-0.5 font-medium text-indigo-300 border border-indigo-500/10">
                              {book.category}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="py-8 text-center text-slate-500">
                          No books uploaded to the database yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.article>
          </section>

          {/* Bottom Custom Sections */}
          <section className="mt-8 grid gap-6 xl:grid-cols-2">
            
            {/* Recent Registrations Card */}
            <motion.article
              whileHover={{ y: -3 }}
              className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#111827]/75 to-[#0b0f19]/80 p-6 shadow-lg backdrop-blur-xl"
            >
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MdPeople className="h-5 w-5 text-indigo-400" />
                Recent User Registrations
              </h3>
              <p className="mt-1 text-xs text-slate-400">Latest 5 readers who joined Readify AI</p>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider font-semibold">
                      <th className="pb-3">Username</th>
                      <th className="pb-3">Email</th>
                      <th className="pb-3">Role</th>
                      <th className="pb-3 text-right">Joined At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      [...Array(3)].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="py-3"><div className="h-4 w-24 rounded bg-white/10" /></td>
                          <td className="py-3"><div className="h-4 w-28 rounded bg-white/10" /></td>
                          <td className="py-3"><div className="h-4 w-12 rounded bg-white/10" /></td>
                          <td className="py-3 text-right"><div className="h-4 w-16 ml-auto rounded bg-white/10" /></td>
                        </tr>
                      ))
                    ) : data?.recentRegistrations && data.recentRegistrations.length > 0 ? (
                      data.recentRegistrations.map((user) => (
                        <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                          <td className="py-3 font-semibold text-white truncate max-w-[120px]">{user.username}</td>
                          <td className="py-3 text-slate-300 truncate max-w-[140px]">{user.email}</td>
                          <td className="py-3">
                            <span className={`inline-block rounded px-2 py-0.5 font-semibold text-[10px] ${
                              user.role === 'admin' 
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/10' 
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/10'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="py-3 text-right text-slate-400">
                            {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="py-8 text-center text-slate-500">
                          No users registered yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.article>

            {/* AI Genre Book Suggestions Card */}
            <motion.article
              whileHover={{ y: -3 }}
              className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#111827]/75 to-[#0b0f19]/80 p-6 shadow-lg backdrop-blur-xl"
            >
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🤖</span>
                AI Genre Suggestions
              </h3>
              <p className="mt-1 text-xs text-slate-400">Recommendations based on what genres users read most</p>

              {loading ? (
                <div className="mt-6 space-y-4 animate-pulse">
                  <div className="h-6 w-1/2 rounded bg-white/10" />
                  <div className="h-20 rounded bg-white/10" />
                </div>
              ) : data?.aiSuggestions ? (
                <div className="mt-5">
                  {/* Top genres badge list */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs text-slate-400 self-center mr-1">Top Genres:</span>
                    {data.aiSuggestions.topGenres && data.aiSuggestions.topGenres.length > 0 ? (
                      data.aiSuggestions.topGenres.map((g) => (
                        <span key={g.category} className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-300 border border-violet-500/10 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                          {g.category} ({g.count} reads)
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 italic">No reading activity recorded yet. Defaulting to presets.</span>
                    )}
                  </div>

                  {/* Recommended book suggestions */}
                  <div className="space-y-3">
                    {data.aiSuggestions.books && data.aiSuggestions.books.length > 0 ? (
                      data.aiSuggestions.books.map((book) => (
                        <div key={book.id} className="flex gap-3 items-center border-b border-white/5 pb-2 last:border-0 last:pb-0 hover:bg-white/[0.01] transition-colors p-1 rounded-lg">
                          <div className="h-12 w-9 flex-shrink-0 overflow-hidden rounded bg-slate-800">
                            {book.thumbnail ? (
                              <img src={book.thumbnail} alt={book.title} className="h-full w-full object-cover animate-[fadeIn_200ms_ease]" />
                            ) : (
                              <div className="grid h-full place-items-center text-[8px] text-slate-500 text-center font-bold">{book.title}</div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate text-xs font-bold text-white leading-tight">{book.title}</h4>
                            <p className="truncate text-[10px] text-slate-400 mt-0.5">by {book.author}</p>
                          </div>
                          <span className="rounded bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-300 border border-violet-500/10 shrink-0">
                            {book.category}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-slate-500 text-xs">
                        No books available in recommended genres.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-8 text-center text-slate-500 text-sm">
                  No recommendation profile generated.
                </div>
              )}
            </motion.article>
          </section>
        </main>
      </div>
    </div>
  )
}
