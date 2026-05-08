import { motion } from 'framer-motion'
import AdminSidebar from '../components/AdminSidebar'

function AnalyticsCard({ title, value, hint }) {
  return (
    <motion.article
      whileHover={{ y: -3, scale: 1.01 }}
      className="rounded-2xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur-xl"
    >
      <p className="text-sm text-slate-300">{title}</p>
      <p className="mt-2 text-3xl font-extrabold text-white">{value}</p>
      <p className="mt-2 text-xs text-blue-100/85">{hint}</p>
    </motion.article>
  )
}

export default function AdminAnalyticsPage() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#050914] text-slate-100">
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-blue-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-violet-500/20 blur-[130px]" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 gap-4 p-4 lg:grid-cols-[280px_1fr] lg:gap-6 lg:p-6">
        <AdminSidebar />

        <main className="rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.08] to-white/[0.03] p-5 backdrop-blur-2xl lg:p-8">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100/80">Insights</p>
            <h2 className="mt-1 text-3xl font-black text-white sm:text-4xl">Analytics</h2>
            <p className="mt-2 text-sm text-slate-300">Track content performance and reader behavior.</p>
          </div>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AnalyticsCard title="Monthly Reads" value="48,210" hint="+12.4% vs last month" />
            <AnalyticsCard title="Completion Rate" value="79%" hint="Strong upward trend" />
            <AnalyticsCard title="Avg Session" value="18m" hint="+2m improvement" />
            <AnalyticsCard title="Returning Readers" value="63%" hint="High retention" />
          </section>
        </main>
      </div>
    </div>
  )
}
