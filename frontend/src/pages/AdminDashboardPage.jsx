import { motion } from 'framer-motion'
import AdminSidebar from '../components/AdminSidebar'

function StatCard({ title, value, hint }) {
  return (
    <motion.article
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="rounded-2xl border border-white/15 bg-white/[0.07] p-5 shadow-[0_12px_35px_rgba(7,12,38,0.35)] backdrop-blur-xl"
    >
      <p className="text-sm text-slate-300">{title}</p>
      <p className="mt-2 text-3xl font-extrabold text-white">{value}</p>
      <p className="mt-2 text-xs text-blue-100/85">{hint}</p>
    </motion.article>
  )
}

export default function AdminDashboardPage() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#050914] text-slate-100">
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-blue-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-violet-500/20 blur-[130px]" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 gap-4 p-4 lg:grid-cols-[280px_1fr] lg:gap-6 lg:p-6">
        <AdminSidebar />

        <main className="rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.08] to-white/[0.03] p-5 backdrop-blur-2xl lg:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100/80">Dashboard Overview</p>
              <h2 className="mt-1 text-3xl font-black text-white sm:text-4xl">Welcome back, Admin</h2>
              <p className="mt-2 text-sm text-slate-300">Manage books, monitor growth, and keep Readify AI content fresh.</p>
            </div>
            <a
              href="#"
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:-translate-y-0.5 hover:border-blue-300/40 hover:bg-white/15"
            >
              Export Report
            </a>
          </div>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Total Books" value="12,840" hint="+240 this month" />
            <StatCard title="Active Readers" value="208K" hint="+8.2% weekly" />
            <StatCard title="Completion Rate" value="78%" hint="Up from 72%" />
            <StatCard title="Avg Rating" value="4.8/5" hint="Across all categories" />
          </section>

          <section className="mt-8 grid gap-4 xl:grid-cols-2">
            <motion.article
              whileHover={{ y: -3 }}
              className="rounded-2xl border border-white/15 bg-white/[0.05] p-5 backdrop-blur-xl"
            >
              <h3 className="text-lg font-bold text-white">Recent Admin Activity</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                <li className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">Added 14 books to Programming category</li>
                <li className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">Updated 6 book thumbnails for better CTR</li>
                <li className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">Scheduled weekly recommendation refresh</li>
              </ul>
            </motion.article>

            <motion.article
              whileHover={{ y: -3 }}
              className="rounded-2xl border border-white/15 bg-white/[0.05] p-5 backdrop-blur-xl"
            >
              <h3 className="text-lg font-bold text-white">Content Health</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                    <span>Metadata Quality</span>
                    <span>91%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div className="h-full w-[91%] rounded-full bg-gradient-to-r from-blue-400 to-violet-500" />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                    <span>Thumbnail Coverage</span>
                    <span>97%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div className="h-full w-[97%] rounded-full bg-gradient-to-r from-indigo-400 to-cyan-400" />
                  </div>
                </div>
              </div>
            </motion.article>
          </section>
        </main>
      </div>
    </div>
  )
}
