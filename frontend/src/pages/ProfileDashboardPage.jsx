import React, { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  MdBookmark,
  MdBookmarkBorder,
  MdAccessTime,
  MdWhatshot,
  MdCollectionsBookmark,
  MdMenuBook,
  MdCheckCircle,
} from 'react-icons/md'
import { STATS_DASHBOARD_DATA } from '../lib/stitchBooks'
import useStreak from '../hooks/useStreak'
import useReadingAnalytics from '../hooks/useReadingAnalytics'
import useProgress from '../hooks/useProgress'
import apiClient from '../lib/apiClient'
import SEO from '../components/SEO'

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

  const userId = profile?._id
  const { streak } = useStreak(userId)
  const { overall } = useReadingAnalytics(userId)
  const { progressItems } = useProgress(userId)

  // Use real backend data if available, or Stitch demo data
  const booksReadCount = overall?.completedBooks || STATS_DASHBOARD_DATA.booksRead
  const hoursSpentCount = overall?.totalReadingTimeHours
    ? Math.round(overall.totalReadingTimeHours)
    : STATS_DASHBOARD_DATA.hoursSpent
  const dailyStreakCount = streak?.currentStreak || STATS_DASHBOARD_DATA.dailyStreak

  const savedBooksList = useMemo(() => {
    return STATS_DASHBOARD_DATA.savedBooks
  }, [])

  const readingHistoryList = useMemo(() => {
    if (progressItems && progressItems.length > 0) {
      return progressItems.slice(0, 2).map((item) => ({
        id: item._id,
        slug: item.book?.slug || 'the-design-of-everyday-things',
        title: item.book?.title || 'Current Book',
        lastRead: `Last read recently`,
        progress: Math.round(Number(item.progressPercentage || item.progress || 50)),
      }))
    }
    return STATS_DASHBOARD_DATA.readingHistory
  }, [progressItems])

  return (
    <>
      <SEO
        title="Your Dashboard - Readify AI"
        description="Track your reading streaks, hours spent, saved books, and history on Readify AI."
      />

      <div className="space-y-8 pb-12">
        {/* ========================================================================= */}
        {/* 1. DASHBOARD HEADER (Screen 4 exact match)                                */}
        {/* ========================================================================= */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Your Dashboard
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-400">
              Welcome back, {profile?.username || 'Reader'}.
            </p>
          </div>

          {/* Top-Right Badge Box */}
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-500/30 bg-[#141628] shadow-lg shadow-purple-950/20">
            <div className="flex flex-col gap-1 w-5">
              <div className="h-0.5 w-full rounded-full bg-indigo-400" />
              <div className="h-0.5 w-3/4 rounded-full bg-purple-400" />
              <div className="h-0.5 w-full rounded-full bg-indigo-300" />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. TOP 3 METRIC CARDS (Screen 4 exact match)                              */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Books Read */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#141629] p-6 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-400">Books Read</span>
              <MdCollectionsBookmark className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-4">
              <span className="text-4xl font-black tracking-tight text-white">
                {booksReadCount}
              </span>
              <p className="mt-1.5 text-xs font-medium text-slate-400">
                {STATS_DASHBOARD_DATA.booksReadDelta}
              </p>
            </div>
          </div>

          {/* Card 2: Hours Spent */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#141629] p-6 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-400">Hours Spent</span>
              <MdAccessTime className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-4">
              <span className="text-4xl font-black tracking-tight text-white">
                {hoursSpentCount}
              </span>
              <p className="mt-1.5 text-xs font-medium text-slate-400">
                {STATS_DASHBOARD_DATA.hoursSpentPercentile}
              </p>
            </div>
          </div>

          {/* Card 3: Daily Streak */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#141629] p-6 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-400">Daily Streak</span>
              <MdWhatshot className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-4">
              <span className="text-4xl font-black tracking-tight text-white">
                {dailyStreakCount} Days
              </span>
              <p className="mt-1.5 text-xs font-medium text-slate-400">
                {STATS_DASHBOARD_DATA.streakMessage}
              </p>
              {/* Progress Bar Underneath */}
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#20233b]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500 shadow-sm shadow-purple-500/50"
                  style={{ width: `${Math.min(100, dailyStreakCount * 7)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. TWO LARGE SECTION CARDS: SAVED BOOKS & READING HISTORY                 */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Left: Saved Books */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#141629] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.05]">
              <h2 className="text-lg font-bold tracking-tight text-white">Saved Books</h2>
              <Link
                to="/library"
                className="text-xs font-semibold text-slate-400 hover:text-indigo-300 transition"
              >
                View All
              </Link>
            </div>

            <div className="space-y-4 pt-1">
              {savedBooksList.map((book) => (
                <div
                  key={book.id}
                  onClick={() => navigate(`/read/the-design-of-everyday-things`)}
                  className="group flex items-center justify-between rounded-xl p-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.03] transition cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    {/* Cover thumbnail with badge */}
                    <div className="relative aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-1.5 shadow-md">
                      <img
                        src={book.coverImage}
                        alt={book.title}
                        className="h-full w-full object-cover rounded-lg opacity-85"
                      />
                      <div className="absolute inset-0 flex items-center justify-center p-1 bg-black/40 text-center">
                        <span className="text-[7px] font-black text-white leading-tight uppercase">
                          {book.badge}
                        </span>
                      </div>
                    </div>

                    {/* Book Titles & Category */}
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {book.title}
                      </h3>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                        {book.category}
                      </p>
                    </div>
                  </div>

                  {/* Bookmark ribbon icon */}
                  <MdBookmarkBorder className="h-5 w-5 text-slate-400 group-hover:text-purple-400 transition-colors" />
                </div>
              ))}
            </div>
          </div>

          {/* Right: Reading History */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#141629] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.05]">
              <h2 className="text-lg font-bold tracking-tight text-white">Reading History</h2>
              <Link
                to="/library"
                className="text-xs font-semibold text-slate-400 hover:text-indigo-300 transition"
              >
                View All
              </Link>
            </div>

            <div className="space-y-5 pt-1">
              {readingHistoryList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/read/the-design-of-everyday-things`)}
                  className="group rounded-xl p-3.5 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.03] transition cursor-pointer space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">{item.lastRead}</p>
                    </div>
                    <span className="text-xs font-black text-slate-300">{item.progress}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#20233b]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
