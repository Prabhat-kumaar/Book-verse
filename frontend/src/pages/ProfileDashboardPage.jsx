import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useStreak from '../hooks/useStreak'
import EmptyState from '../components/EmptyState'
import useReadingAnalytics from '../hooks/useReadingAnalytics'
import useProgress from '../hooks/useProgress'
import apiClient from '../lib/apiClient'
import { buildReaderHash } from '../lib/readerLink'

const isDev = import.meta.env.DEV

export default function ProfileDashboardPage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(() => {
    try {
      const raw = localStorage.getItem('authUser')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiClient.get('/api/auth/me')
        setProfile(response.data)
        localStorage.setItem('authUser', JSON.stringify(response.data))
      } catch (err) {
        if (isDev) console.error('Failed to fetch updated profile:', err)
      }
    }
    fetchProfile()
  }, [])

  const userId = profile?._id
  const { streak, loading: streakLoading } = useStreak(userId)
  const { daily, weekly, overall, loading: analyticsLoading } = useReadingAnalytics(userId)
  const { progressItems, loading: progressLoading } = useProgress(userId)

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

  const joinedDate = useMemo(() => {
    if (!profile?.createdAt) return 'Joined recently'
    const date = new Date(profile.createdAt)
    return `Joined ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
  }, [profile])

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 sm:p-7">
      {/* Profile Header Card */}
      <div className="mb-6 flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-violet-500/10 p-6 sm:flex-row sm:gap-6">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 text-3xl font-black text-white shadow-[0_0_30px_rgba(99,102,241,0.4)]">
          {(profile?.username?.[0] || 'U').toUpperCase()}
        </div>
        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-black text-white tracking-tight">{profile?.username || 'User'}</h2>
          <p className="text-sm text-slate-300 mt-1">{profile?.email || 'No email provided'}</p>
          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/10 px-3 py-1 text-xs text-indigo-300 font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
            {joinedDate}
          </div>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-white sm:text-3xl">Profile Dashboard</h1>
      <p className="mt-1 text-sm text-slate-300">Track your reading consistency and activity.</p>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-orange-300/25 bg-gradient-to-br from-orange-500/15 to-amber-500/10 p-4">
          <p className="text-2xl">🔥</p>
          <p className="mt-2 text-sm text-slate-300">Day Streak</p>
          <p className="text-2xl font-bold text-white">{streakLoading ? '...' : streakStats.currentStreak}</p>
        </div>
        <div className="rounded-2xl border border-blue-300/25 bg-gradient-to-br from-blue-500/15 to-indigo-500/10 p-4">
          <p className="text-2xl">📖</p>
          <p className="mt-2 text-sm text-slate-300">Pages Read Today</p>
          <p className="text-2xl font-bold text-white">{analyticsLoading ? '...' : analyticsStats.pagesToday}</p>
        </div>
        <div className="rounded-2xl border border-violet-300/25 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 p-4">
          <p className="text-2xl">⏱️</p>
          <p className="mt-2 text-sm text-slate-300">Reading Hours</p>
          <p className="text-2xl font-bold text-white">{analyticsLoading ? '...' : analyticsStats.readingHours}</p>
        </div>
        <div className="rounded-2xl border border-emerald-300/25 bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 p-4">
          <p className="text-2xl">🎯</p>
          <p className="mt-2 text-sm text-slate-300">Books Completed</p>
          <p className="text-2xl font-bold text-white">{analyticsLoading ? '...' : analyticsStats.booksCompleted}</p>
        </div>
      </div>

      {/* Your Reading Books List */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/40 p-5 sm:p-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          📚 Your Reading Shelf
        </h3>
        <p className="mt-1 text-xs text-slate-400">Resume from where you left off</p>
        
        {progressLoading ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
            ))}
          </div>
        ) : progressItems.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon="📖"
            title="Your reading shelf is empty"
            description="Explore the catalog and start reading a book to track your progress."
            actionLabel="Explore Books"
            onAction={() => navigate('/books')}
            compact
          />
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {progressItems.map((item) => {
              const book = item.book || {};
              const resumePage = Number.isInteger(item.currentPage) && item.currentPage > 0 ? item.currentPage : undefined;
              const link = buildReaderHash(book, { page: resumePage, cfi: item.cfi || '' });
              return (
                <article key={item._id || book._id} className="group relative rounded-xl border border-white/10 bg-[#0f1424]/40 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/30 hover:bg-[#0f1424]/65">
                  <div className="flex gap-4">
                    <div className="aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-lg bg-slate-800 border border-white/10">
                      {book.thumbnail ? (
                        <img loading="lazy" src={book.thumbnail} alt={book.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-indigo-500/30 to-violet-500/30 text-[9px] font-bold text-white text-center p-1">
                          {book.title}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="line-clamp-1 text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors" title={book.title}>{book.title}</h4>
                      <p className="line-clamp-1 text-xs text-slate-400 mt-0.5">by {book.author || 'Unknown'}</p>
                      <span className="inline-block text-[9px] uppercase font-semibold text-indigo-400 tracking-wider mt-1">{book.category || 'Programming'}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span>Progress</span>
                      <span className="font-semibold text-indigo-300">{Math.round(item.progressPercentage || 0)}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-500 transition-all duration-500" style={{ width: `${item.progressPercentage || 0}%` }} />
                    </div>
                  </div>
                  
                  <a href={link} className="mt-4 flex w-full items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/25 px-3 py-2 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-500/20 hover:text-white">
                    Resume Reading
                  </a>
                </article>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
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
