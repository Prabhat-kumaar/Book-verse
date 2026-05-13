import { useMemo } from 'react'
import useStreak from '../hooks/useStreak'
import EmptyState from '../components/EmptyState'
import useReadingAnalytics from '../hooks/useReadingAnalytics'

export default function ProfileDashboardPage() {
  const authUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('authUser')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [])
  const userId = authUser?._id
  const { streak, loading: streakLoading } = useStreak(userId)
  const { daily, weekly, overall, loading: analyticsLoading } = useReadingAnalytics(userId)
  const streakStats = useMemo(() => {
    const currentStreak = streak?.currentStreak || 0
    const longestStreak = streak?.longestStreak || 0
    const totalReadingDays = streak?.totalReadingDays || 0
    return { currentStreak, longestStreak, totalReadingDays }
  }, [streak])

  const analyticsStats = useMemo(() => {
    const pagesToday = daily?.pagesReadToday || 0
    const weeklyPages = weekly?.weeklyPagesRead || 0
    const readingHours = overall?.totalReadingHours || 0
    const booksCompleted = overall?.booksCompleted || 0
    return { pagesToday, weeklyPages, readingHours, booksCompleted }
  }, [daily, overall, weekly])

  const maxWeeklyPages = Math.max(1, ...(weekly?.daily || []).map((d) => d.pagesRead || 0))

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 sm:p-7">
      <h1 className="text-2xl font-bold text-white sm:text-3xl">Profile Dashboard</h1>
      <p className="mt-1 text-sm text-slate-300">Track your reading consistency and activity.</p>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-orange-300/25 bg-gradient-to-br from-orange-500/15 to-amber-500/10 p-4">
          <p className="text-2xl">??</p>
          <p className="mt-2 text-sm text-slate-300">Day Streak</p>
          <p className="text-2xl font-bold text-white">{streakLoading ? '...' : streakStats.currentStreak}</p>
        </div>
        <div className="rounded-2xl border border-blue-300/25 bg-gradient-to-br from-blue-500/15 to-indigo-500/10 p-4">
          <p className="text-2xl">??</p>
          <p className="mt-2 text-sm text-slate-300">Pages Read Today</p>
          <p className="text-2xl font-bold text-white">{analyticsLoading ? '...' : analyticsStats.pagesToday}</p>
        </div>
        <div className="rounded-2xl border border-violet-300/25 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 p-4">
          <p className="text-2xl">?</p>
          <p className="mt-2 text-sm text-slate-300">Reading Hours</p>
          <p className="text-2xl font-bold text-white">{analyticsLoading ? '...' : analyticsStats.readingHours}</p>
        </div>
        <div className="rounded-2xl border border-emerald-300/25 bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 p-4">
          <p className="text-2xl">??</p>
          <p className="mt-2 text-sm text-slate-300">Books Completed</p>
          <p className="text-2xl font-bold text-white">{analyticsLoading ? '...' : analyticsStats.booksCompleted}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <h2 className="text-lg font-semibold text-white">Streak Insights</h2>
          {streakLoading ? (
            <div className="mt-3 h-40 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
          ) : (
            <div className="mt-3 space-y-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Current Streak</p>
                <p className="mt-1 text-lg font-bold text-white">{streakStats.currentStreak} days</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Longest Streak</p>
                <p className="mt-1 text-lg font-bold text-white">{streakStats.longestStreak} days</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Total Reading Days</p>
                <p className="mt-1 text-lg font-bold text-white">{streakStats.totalReadingDays} days</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Weekly Reading</p>
                <p className="mt-1 text-lg font-bold text-white">{analyticsLoading ? '...' : `${analyticsStats.weeklyPages} pages`}</p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <h2 className="text-lg font-semibold text-white">7-Day Activity</h2>
          {analyticsLoading ? (
            <div className="mt-3 h-40 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
          ) : !weekly?.daily?.length ? (
            <EmptyState
              className="mt-3"
              icon="??"
              title="No activity data yet"
              description="Start reading to populate your weekly chart."
              compact
            />
          ) : (
            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <div className="grid grid-cols-7 items-end gap-2">
                {weekly.daily.map((item) => {
                  const height = Math.max(10, Math.round(((item.pagesRead || 0) / maxWeeklyPages) * 96))
                  return (
                    <div key={item.label} className="text-center">
                      <div className="mx-auto flex h-28 w-full max-w-[26px] items-end">
                        <div
                          className="w-full rounded-t-md bg-gradient-to-t from-blue-500 to-violet-500 transition-all duration-500"
                          style={{ height: `${height}px` }}
                          title={`${item.label}: ${item.pagesRead} pages`}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-300">{item.label}</p>
                    </div>
                  )
                })}
              </div>
              <p className="mt-3 text-xs text-slate-300">
                Weekly total: {analyticsStats.weeklyPages} pages
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

