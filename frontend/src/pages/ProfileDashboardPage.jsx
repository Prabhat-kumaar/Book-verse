import React, { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MdEdit,
  MdShare,
  MdBookmark,
  MdBookmarkBorder,
  MdAccessTime,
  MdWhatshot,
  MdCollectionsBookmark,
  MdMenuBook,
  MdCheckCircle,
  MdVerified,
  MdTrendingUp,
  MdCalendarToday,
  MdClose,
} from 'react-icons/md'
import { STATS_DASHBOARD_DATA, CATALOG_PRESET_BOOKS } from '../lib/stitchBooks'
import useStreak from '../hooks/useStreak'
import useReadingAnalytics from '../hooks/useReadingAnalytics'
import useProgress from '../hooks/useProgress'
import apiClient from '../lib/apiClient'
import useBooks from '../hooks/useBooks'
import SEO from '../components/SEO'

export default function ProfileDashboardPage() {
  const navigate = useNavigate()
  const { books: backendBooks } = useBooks()
  const [profile, setProfile] = useState(() => {
    try {
      const raw = localStorage.getItem('authUser')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  const [isEditing, setIsEditing] = useState(false)
  const [bio, setBio] = useState(
    profile?.bio ||
      'Lover of sci-fi epics and architectural history. Seeking narratives that build new worlds.'
  )
  const [displayName, setDisplayName] = useState(profile?.username || 'Alex Sterling')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

  // Fetch fresh user profile from backend on mount
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const token = localStorage.getItem('authToken')
        if (!token) return
        const res = await apiClient.get('/auth/me')
        if (res.data?.success && res.data.data) {
          const u = res.data.data
          setProfile(u)
          setDisplayName(u.username || 'Alex Sterling')
          if (u.bio) setBio(u.bio)
          localStorage.setItem('authUser', JSON.stringify(u))
        }
      } catch (err) {
        console.log('User session sync offline')
      }
    }
    fetchMe()
  }, [])

  const userId = profile?._id
  const { streak } = useStreak(userId)
  const { overall } = useReadingAnalytics(userId)
  const { progressItems } = useProgress(userId)

  // Real or Curated Analytics from backend
  const booksReadCount = overall?.completedBooks || (progressItems?.length || 24)
  const hoursSpentCount = overall?.totalReadingTimeHours
    ? Math.round(overall.totalReadingTimeHours)
    : 142
  const dailyStreakCount = streak?.currentStreak || 14

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      const res = await apiClient.put('/auth/profile', { username: displayName, bio })
      const updatedUser = res.data?.data || { ...profile, username: displayName, bio }
      localStorage.setItem('authUser', JSON.stringify(updatedUser))
      setProfile(updatedUser)
      setIsEditing(false)
    } catch (err) {
      console.log('Local profile update fallback:', err.message)
      const updated = { ...profile, username: displayName, bio }
      localStorage.setItem('authUser', JSON.stringify(updated))
      setProfile(updated)
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Active reading library books from real progress or backend books
  const libraryBooks = useMemo(() => {
    if (progressItems && progressItems.length > 0) {
      return progressItems.map((p) => ({
        id: p.book?._id || p._id,
        slug: p.book?.slug || p.book?._id || 'the-silent-stars',
        title: p.book?.title || 'Active Book',
        author: p.book?.author || 'Author',
        coverImage: p.book?.coverImage || p.book?.thumbnail || CATALOG_PRESET_BOOKS[0].coverImage,
      }))
    }
    if (backendBooks && backendBooks.length > 0) {
      return backendBooks.slice(0, 4).map((b) => ({
        id: b._id || b.id,
        slug: b.slug || b._id,
        title: b.title,
        author: b.author || 'Author',
        coverImage: b.coverImage || b.thumbnail || CATALOG_PRESET_BOOKS[0].coverImage,
      }))
    }
    return CATALOG_PRESET_BOOKS.slice(0, 4)
  }, [progressItems, backendBooks])

  return (
    <>
      <SEO
        title={`${displayName} - Profile & Analytics | Readify`}
        description="View reading stats, personal goals, and active library on Readify."
      />

      <div className="space-y-10 pb-16 pt-2 max-w-6xl mx-auto text-left">
        {/* ========================================================================= */}
        {/* 1. USER PROFILE HEADER (Exact match to 5th Design Image)                   */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[#0c101a]/95 p-6 sm:p-10 shadow-2xl shadow-black/80 backdrop-blur-xl">
          {/* Subtle Ambient Glow */}
          <div className="pointer-events-none absolute -left-10 -top-10 h-72 w-72 rounded-full bg-violet-600/15 blur-[100px]" />
          <div className="pointer-events-none absolute -right-10 -bottom-10 h-72 w-72 rounded-full bg-pink-600/10 blur-[100px]" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
            {/* Avatar with Ambient Glow & Premium Badge */}
            <div className="flex flex-col items-center shrink-0">
              <div className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-full p-1 border-2 border-violet-500/40 shadow-[0_0_35px_rgba(139,92,246,0.3)]">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop"
                  alt={displayName}
                  className="h-full w-full rounded-full object-cover"
                />
              </div>

              {/* Premium Member Badge */}
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-pink-500/30 bg-[#121624] px-3.5 py-1 text-[10px] font-bold text-pink-300 shadow-sm">
                <MdVerified className="h-3.5 w-3.5 text-pink-400" />
                <span>Premium Member</span>
              </div>
            </div>

            {/* Profile Info & Bio */}
            <div className="flex-1 text-center sm:text-left space-y-3">
              <div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                  {displayName}
                </h1>
                <p className="mt-2 max-w-xl text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                  "{bio}"
                </p>
              </div>

              {/* Action Buttons: Edit Profile & Share */}
              <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-5 py-2.5 text-xs font-semibold text-white transition active:scale-95"
                >
                  <MdEdit className="h-3.5 w-3.5 text-slate-300" />
                  <span>Edit Profile</span>
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-slate-300 transition active:scale-95"
                  title="Share Profile Link"
                >
                  {copied ? <MdCheckCircle className="h-4 w-4 text-emerald-400" /> : <MdShare className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Inline Profile Editor Modal / Dropdown */}
          {isEditing && (
            <form onSubmit={handleSaveProfile} className="mt-6 pt-6 border-t border-white/[0.08] space-y-4 max-w-md">
              <div>
                <label className="text-xs font-semibold text-slate-400">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#141828] px-3.5 py-2 text-xs text-white outline-none focus:border-violet-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Personal Bio</label>
                <textarea
                  rows="2"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#141828] p-3 text-xs text-white outline-none focus:border-violet-400"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-violet-600 hover:bg-violet-500 px-5 py-1.5 text-xs font-bold text-white transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-full bg-white/5 hover:bg-white/10 px-4 py-1.5 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>

        {/* ========================================================================= */}
        {/* 2. READING ANALYTICS STATS METRICS                                        */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <MdTrendingUp className="h-5 w-5 text-violet-400" />
            <span>Reading Analytics</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Stat 1: Books Completed */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#121624]/90 p-5 shadow-xl shadow-black/40 backdrop-blur-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold">Books Completed</span>
                <MdCollectionsBookmark className="h-4 w-4 text-violet-400" />
              </div>
              <div className="mt-4">
                <span className="text-3xl font-black text-white">{booksReadCount}</span>
                <p className="text-[11px] text-emerald-400 font-medium mt-1">+4 books this month</p>
              </div>
            </div>

            {/* Stat 2: Hours Spent Reading */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#121624]/90 p-5 shadow-xl shadow-black/40 backdrop-blur-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold">Hours Read</span>
                <MdAccessTime className="h-4 w-4 text-pink-400" />
              </div>
              <div className="mt-4">
                <span className="text-3xl font-black text-white">{hoursSpentCount}h</span>
                <p className="text-[11px] text-violet-300 font-medium mt-1">Top 5% of active readers</p>
              </div>
            </div>

            {/* Stat 3: Daily Reading Streak */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#121624]/90 p-5 shadow-xl shadow-black/40 backdrop-blur-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold">Daily Streak</span>
                <MdWhatshot className="h-4 w-4 text-amber-400" />
              </div>
              <div className="mt-4">
                <span className="text-3xl font-black text-white">{dailyStreakCount} Days</span>
                <div className="mt-2 h-1.5 w-full rounded-full bg-[#1e2438] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-pink-500"
                    style={{ width: `${Math.min(100, dailyStreakCount * 7)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Stat 4: 2026 Reading Goal */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#121624]/90 p-5 shadow-xl shadow-black/40 backdrop-blur-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold">2026 Goal</span>
                <MdCalendarToday className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="mt-4">
                <span className="text-3xl font-black text-white">18 / 30</span>
                <p className="text-[11px] text-slate-400 font-medium mt-1">60% completed</p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. READING ACTIVITY MATRIX & SAVED LIBRARY                                 */}
        {/* ========================================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (8 cols): Reading Heatmap / Activity Tracker */}
          <div className="lg:col-span-8 rounded-2xl border border-white/[0.08] bg-[#121624]/90 p-6 shadow-xl shadow-black/40 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Reading Consistency Heatmap</h3>
              <span className="text-xs font-semibold text-violet-400">Last 12 Weeks</span>
            </div>

            {/* Matrix Squares (GitHub style weekly heatmap with purple gradients) */}
            <div className="pt-2 overflow-x-auto">
              <div className="grid grid-flow-col grid-rows-7 gap-1.5 w-max">
                {[...Array(84)].map((_, i) => {
                  const intensity = (i * 7 + 3) % 5
                  let bg = 'bg-[#1a2035]'
                  if (intensity === 1) bg = 'bg-violet-950/80 border border-violet-800/40'
                  if (intensity === 2) bg = 'bg-violet-700/60'
                  if (intensity === 3) bg = 'bg-purple-600'
                  if (intensity === 4) bg = 'bg-pink-500 shadow-sm shadow-pink-500/50'

                  return (
                    <div
                      key={i}
                      className={`h-3.5 w-3.5 rounded-sm ${bg} transition duration-200 hover:scale-125 cursor-pointer`}
                      title={`Activity level: ${intensity}/4`}
                    />
                  )
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 text-[10px] text-slate-400 pt-2 font-medium">
              <span>Less</span>
              <div className="h-2.5 w-2.5 rounded-sm bg-[#1a2035]" />
              <div className="h-2.5 w-2.5 rounded-sm bg-violet-950/80" />
              <div className="h-2.5 w-2.5 rounded-sm bg-violet-700/60" />
              <div className="h-2.5 w-2.5 rounded-sm bg-purple-600" />
              <div className="h-2.5 w-2.5 rounded-sm bg-pink-500" />
              <span>More</span>
            </div>
          </div>

          {/* Right Column (4 cols): Quick Resume Library */}
          <div className="lg:col-span-4 rounded-2xl border border-white/[0.08] bg-[#121624]/90 p-6 shadow-xl shadow-black/40 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <h3 className="text-base font-bold text-white">Active Library</h3>
              <Link to="/saved-books" className="text-xs font-semibold text-slate-400 hover:text-violet-300">
                View All
              </Link>
            </div>

            <div className="space-y-3">
              {libraryBooks.map((b) => (
                <div
                  key={b.id}
                  onClick={() => navigate(`/read/${b.slug}`)}
                  className="group flex items-center justify-between rounded-xl p-2.5 border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.06] hover:border-violet-500/30 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={b.coverImage}
                      alt={b.title}
                      className="h-10 w-8 rounded-md object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate group-hover:text-violet-300">
                        {b.title}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{b.author}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-violet-400 shrink-0">Resume</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
