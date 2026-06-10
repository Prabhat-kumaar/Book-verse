import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useStreak from '../hooks/useStreak'
import EmptyState from '../components/EmptyState'
import useReadingAnalytics from '../hooks/useReadingAnalytics'
import useProgress from '../hooks/useProgress'
import apiClient from '../lib/apiClient'
import { buildReaderHash } from '../lib/readerLink'
import { getBookThumbnailUrl } from '../lib/mediaUrls'

const isDev = import.meta.env.DEV

export default function ProfileDashboardPage() {
  const navigate = useNavigate()
  
  // Auth state local to the component
  const [profile, setProfile] = useState(() => {
    try {
      const raw = localStorage.getItem('authUser')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  // Calendar tracking state
  const [calendarData, setCalendarData] = useState([])
  const [calendarLoading, setCalendarLoading] = useState(true)

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    avatar: '',
    readingGoal: 12
  })
  const [updateLoading, setUpdateLoading] = useState(false)
  const [updateError, setUpdateError] = useState('')

  // Shelves collapsible expansion states
  const [showAllCurrentlyReading, setShowAllCurrentlyReading] = useState(false)
  const [showAllCompleted, setShowAllCompleted] = useState(false)

  // Reading Goals and History States
  const [goalData, setGoalData] = useState(null)
  const [goalLoading, setGoalLoading] = useState(true)
  const [goalHistory, setGoalHistory] = useState([])
  const [goalHistoryLoading, setGoalHistoryLoading] = useState(true)
  
  const [isEditingGoal, setIsEditingGoal] = useState(false)
  const [goalForm, setGoalForm] = useState({
    targetBooks: 12,
    targetPages: 0
  })
  const [goalSaving, setGoalSaving] = useState(false)
  const [hoveredMonth, setHoveredMonth] = useState(null)
  const currentYear = new Date().getFullYear()

  // Fetch updated profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiClient.get('/api/auth/me')
        setProfile(response.data)
        localStorage.setItem('authUser', JSON.stringify(response.data))
        window.dispatchEvent(new Event('authChanged'))
      } catch (err) {
        if (isDev) console.error('Failed to fetch updated profile:', err)
      }
    }
    fetchProfile()
  }, [])

  const userId = profile?._id
  const { streak, loading: streakLoading, refetch: refetchStreak } = useStreak(userId)
  const { overall, loading: analyticsLoading, refetch: refetchAnalytics } = useReadingAnalytics(userId)
  const { progressItems, loading: progressLoading, refresh: refetchProgress } = useProgress(userId)

  const fetchGoalInfo = async () => {
    if (!userId) return
    try {
      setGoalLoading(true)
      const res = await apiClient.get('/api/goals/me')
      setGoalData(res.data)
      if (res.data && res.data.goalSet) {
        setGoalForm({
          targetBooks: res.data.data.goal.targetBooks,
          targetPages: res.data.data.goal.targetPages || 0
        })
      }
    } catch (err) {
      if (isDev) console.error('Failed to fetch reading goal:', err)
    } finally {
      setGoalLoading(false)
    }
  }

  const fetchGoalHistory = async () => {
    if (!userId) return
    try {
      setGoalHistoryLoading(true)
      const res = await apiClient.get('/api/goals/me/history')
      setGoalHistory(res.data.data || [])
    } catch (err) {
      if (isDev) console.error('Failed to fetch goal history:', err)
    } finally {
      setGoalHistoryLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      fetchGoalInfo()
      fetchGoalHistory()
    } else {
      setGoalLoading(false)
      setGoalHistoryLoading(false)
    }
  }, [userId])

  const handleSaveGoal = async (e) => {
    e.preventDefault()
    try {
      setGoalSaving(true)
      await apiClient.post('/api/goals', {
        targetBooks: Number(goalForm.targetBooks),
        targetPages: Number(goalForm.targetPages),
        year: currentYear
      })
      setIsEditingGoal(false)
      await fetchGoalInfo()
      await fetchGoalHistory()
      
      // Also update general profile to keep in sync
      const response = await apiClient.get('/api/auth/me')
      setProfile(response.data)
      localStorage.setItem('authUser', JSON.stringify(response.data))
    } catch (err) {
      if (isDev) console.error('Failed to save reading goal:', err)
    } finally {
      setGoalSaving(false)
    }
  }

  // Fetch calendar contribution records
  useEffect(() => {
    if (!userId) return
    const fetchCalendar = async () => {
      try {
        setCalendarLoading(true)
        const res = await apiClient.get('/api/analytics/calendar')
        setCalendarData(res.data || [])
      } catch (err) {
        if (isDev) console.error('Failed to fetch contribution calendar:', err)
      } finally {
        setCalendarLoading(false)
      }
    }
    fetchCalendar()
  }, [userId])

  // Populate Edit Form when profile updates or modal opens
  useEffect(() => {
    if (profile) {
      setEditForm({
        username: profile.username || '',
        email: profile.email || '',
        avatar: profile.avatar || '',
        readingGoal: profile.readingGoal || 12
      })
    }
  }, [profile, isEditModalOpen])

  // Split currently reading vs completed books
  const currentlyReadingItems = useMemo(() => {
    return progressItems.filter(item => item.progressPercentage > 0 && item.progressPercentage < 100)
  }, [progressItems])

  const completedItems = useMemo(() => {
    return progressItems.filter(item => item.progressPercentage >= 100)
  }, [progressItems])

  // Dynamic Avatar Initials Gradient Lookup
  const avatarGradient = useMemo(() => {
    const name = profile?.username || 'User'
    const char = name[0] || 'U'
    const charCode = char.toUpperCase().charCodeAt(0)
    const gradients = [
      'from-pink-500 via-purple-500 to-indigo-500 shadow-[0_0_25px_rgba(236,72,153,0.3)]',
      'from-emerald-500 via-teal-500 to-cyan-500 shadow-[0_0_25px_rgba(16,185,129,0.3)]',
      'from-orange-500 via-amber-500 to-yellow-500 shadow-[0_0_25px_rgba(249,115,22,0.3)]',
      'from-blue-500 via-indigo-500 to-violet-600 shadow-[0_0_25px_rgba(99,102,241,0.3)]',
      'from-rose-500 via-red-500 to-orange-500 shadow-[0_0_25px_rgba(244,63,94,0.3)]',
    ]
    return gradients[charCode % gradients.length]
  }, [profile])

  // Calculate statistics
  const stats = useMemo(() => {
    const started = progressItems.length
    const completed = overall?.booksCompleted || completedItems.length
    const pages = overall?.totalPagesRead || profile?.analytics?.totalPagesRead || 0
    const hours = overall?.totalReadingHours || Number(((profile?.analytics?.totalReadingSeconds || 0) / 3600).toFixed(1))
    const currentStr = streak?.currentStreak || profile?.streak?.currentStreak || 0
    const longestStr = streak?.longestStreak || profile?.streak?.longestStreak || 0
    
    return { started, completed, pages, hours, currentStr, longestStr }
  }, [progressItems, overall, completedItems, profile, streak])

  const maxCompletions = useMemo(() => {
    if (!goalData?.data?.monthlyBreakdown) return 2
    const counts = goalData.data.monthlyBreakdown.map(m => m.completed || 0)
    return Math.max(...counts, 2)
  }, [goalData])

  // Calendar dates math for 90 days
  const calendarDays = useMemo(() => {
    const days = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Find Sunday of 13 weeks ago
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - 90)
    const startDay = startDate.getDay()
    startDate.setDate(startDate.getDate() - startDay)
    
    const currentDate = new Date(startDate)
    while (currentDate <= today) {
      days.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }
    return days
  }, [])

  // Map calendar analytics response
  const calendarMap = useMemo(() => {
    const map = new Map()
    if (!Array.isArray(calendarData)) return map
    calendarData.forEach((row) => {
      if (!row || !row.date) return
      try {
        const d = new Date(row.date)
        if (isNaN(d.getTime())) return
        const key = d.toISOString().slice(0, 10)
        map.set(key, row.pagesRead || 0)
      } catch {
        // Ignore invalid dates
      }
    });
    return map
  }, [calendarData])

  // Achievement unlock flags
  const achievements = useMemo(() => {
    const firstBook = stats.completed >= 1
    const streak7 = stats.longestStr >= 7
    const books10 = stats.completed >= 10
    
    // Night Owl: checked via streak badges or local progress updates after midnight
    const localNightOwl = progressItems.some(item => {
      const ts = item.lastReadAt || item.updatedAt
      if (!ts) return false
      const d = new Date(ts)
      const hr = d.getHours()
      return hr >= 0 && hr <= 4
    })
    const nightOwl = streak?.badges?.some(b => b.key === 'nightReader' && b.earned) || localNightOwl

    // Speed Reader: finished book in 1 day (createdAt vs lastReadAt diff <= 24h)
    const speedReader = progressItems.some(item => {
      if (item.progressPercentage < 100 || !item.createdAt || !item.lastReadAt) return false
      const timeDiff = new Date(item.lastReadAt).getTime() - new Date(item.createdAt).getTime()
      return timeDiff > 0 && timeDiff <= 24 * 60 * 60 * 1000
    })

    return [
      { key: 'first', label: 'First Book Read', icon: '📚', desc: 'Completed your first book', earned: firstBook },
      { key: 'streak7', label: '7 Day Streak', icon: '🔥', desc: 'Read 7 days in a row', earned: streak7 },
      { key: 'books10', label: '10 Books Completed', icon: '🏆', desc: 'Finished 10 amazing titles', earned: books10 },
      { key: 'night', label: 'Night Owl', icon: '🦉', desc: 'Logged pages after midnight', earned: nightOwl },
      { key: 'speed', label: 'Speed Reader', icon: '⚡', desc: 'Completed a book in 1 day', earned: speedReader },
    ]
  }, [stats.completed, stats.longestStr, streak, progressItems])

  // Member date format
  const memberSince = useMemo(() => {
    if (!profile?.createdAt) return 'Joined recently'
    const date = new Date(profile.createdAt)
    return `Member since ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
  }, [profile])

  // Handle Edit profile submit
  const handleEditProfile = async (e) => {
    e.preventDefault()
    try {
      setUpdateLoading(true)
      setUpdateError('')
      
      const response = await apiClient.put('/api/auth/profile', {
        username: editForm.username,
        email: editForm.email,
        avatar: editForm.avatar,
        readingGoal: Number(editForm.readingGoal)
      })

      // Sync with dedicated goals database collection
      await apiClient.post('/api/goals', {
        targetBooks: Number(editForm.readingGoal),
        targetPages: goalData?.data?.goal?.targetPages || 0,
        year: currentYear
      })

      localStorage.setItem('authUser', JSON.stringify(response.data))
      setProfile(response.data)
      window.dispatchEvent(new Event('authChanged'))
      setIsEditModalOpen(false)
      
      // Refetch goals history & details
      fetchGoalInfo()
      fetchGoalHistory()
      
      // Refetch analytics & progress to sync goal card data
      refetchAnalytics()
      refetchProgress()
      refetchStreak()
    } catch (err) {
      setUpdateError(err?.response?.data?.message || err?.message || 'Failed to update profile')
    } finally {
      setUpdateLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-3 py-6 sm:px-6">
      {/* 1. PROFILE HEADER */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 p-6 backdrop-blur-md">
        <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl select-none pointer-events-none" />
        <div className="absolute -left-24 -bottom-24 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl select-none pointer-events-none" />
        
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between sm:text-left text-center">
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            {profile?.avatar ? (
              <img
                loading="lazy"
                src={profile.avatar}
                alt={profile.username}
                className="h-24 w-24 rounded-full object-cover border border-white/20 shadow-lg"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '';
                  // Invalidate broken avatar URL fallback
                  const nextProfile = { ...profile, avatar: '' };
                  setProfile(nextProfile);
                  localStorage.setItem('authUser', JSON.stringify(nextProfile));
                }}
              />
            ) : (
              <div className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient} text-4xl font-extrabold text-white`}>
                {(profile?.username?.[0] || 'U').toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-1">
                {profile?.username || 'User'}
              </h1>
              <p className="text-sm text-slate-300 font-medium">{profile?.email || 'No email provided'}</p>
              <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-xs text-indigo-300 font-semibold select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
                {memberSince}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white tracking-wide shadow-md transition-all duration-200 hover:bg-indigo-500 active:scale-95"
          >
            Edit Profile
          </button>
        </div>
      </div>

      {/* 2. READING STATS CARDS */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#0f1424]/40 p-3 sm:p-4 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/20 hover:bg-[#0f1424]/60">
          <div className="absolute right-3 top-3 text-xl opacity-60 transition group-hover:scale-110">📖</div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Started</p>
          <p className="mt-2 text-xl sm:text-2xl font-black text-white truncate">{progressLoading ? '...' : stats.started}</p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#0f1424]/40 p-3 sm:p-4 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/20 hover:bg-[#0f1424]/60">
          <div className="absolute right-3 top-3 text-xl opacity-60 transition group-hover:scale-110">✅</div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Completed</p>
          <p className="mt-2 text-xl sm:text-2xl font-black text-white truncate">{analyticsLoading || progressLoading ? '...' : stats.completed}</p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#0f1424]/40 p-3 sm:p-4 transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/20 hover:bg-[#0f1424]/60">
          <div className="absolute right-3 top-3 text-xl opacity-60 transition group-hover:scale-110">📄</div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Pages Read</p>
          <p className="mt-2 text-xl sm:text-2xl font-black text-white truncate">{analyticsLoading ? '...' : stats.pages}</p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#0f1424]/40 p-3 sm:p-4 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/20 hover:bg-[#0f1424]/60">
          <div className="absolute right-3 top-3 text-xl opacity-60 transition group-hover:scale-110">⏱️</div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Reading Time</p>
          <p className="mt-2 text-xl sm:text-2xl font-black text-white truncate">{analyticsLoading ? '...' : `${stats.hours}h`}</p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#0f1424]/40 p-3 sm:p-4 transition-all duration-300 hover:-translate-y-1 hover:border-orange-500/20 hover:bg-[#0f1424]/60">
          <div className="absolute right-3 top-3 text-xl opacity-60 transition group-hover:scale-110">🔥</div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Current Streak</p>
          <p className="mt-2 text-xl sm:text-2xl font-black text-white truncate">{streakLoading ? '...' : `${stats.currentStr}d`}</p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#0f1424]/40 p-3 sm:p-4 transition-all duration-300 hover:-translate-y-1 hover:border-pink-500/20 hover:bg-[#0f1424]/60">
          <div className="absolute right-3 top-3 text-xl opacity-60 transition group-hover:scale-110">⭐</div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Longest Streak</p>
          <p className="mt-2 text-xl sm:text-2xl font-black text-white truncate">{streakLoading ? '...' : `${stats.longestStr}d`}</p>
        </div>
      </div>

      {/* 3. READING STREAK CALENDAR */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5 sm:p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              📅 Reading Consistency Calendar
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Visualize your daily reading habits over the last 3 months</p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-2 sm:mt-0 font-medium">
            <span>Less</span>
            <span className="h-2.5 w-2.5 rounded bg-slate-800 border border-white/5" />
            <span className="h-2.5 w-2.5 rounded bg-emerald-800 border border-white/5" />
            <span className="h-2.5 w-2.5 rounded bg-emerald-600 border border-white/5" />
            <span className="h-2.5 w-2.5 rounded bg-emerald-500 border border-white/5" />
            <span className="h-2.5 w-2.5 rounded bg-emerald-400 border border-white/5 shadow-[0_0_5px_rgba(52,211,153,0.3)]" />
            <span>More</span>
          </div>
        </div>

        {calendarLoading ? (
          <div className="h-32 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
        ) : (
          <div className="overflow-x-auto scrollbar-thin py-2">
            <div className="flex min-w-[640px] items-start gap-2">
              {/* Day of Week Labels */}
              <div className="grid grid-rows-7 gap-1 text-[10px] text-slate-500 font-bold h-[116px] pr-1.5 pt-1 select-none leading-none justify-between">
                <div />
                <div>Mon</div>
                <div />
                <div>Wed</div>
                <div />
                <div>Fri</div>
                <div />
              </div>

              {/* Reading Activity Grid */}
              <div className="grid grid-flow-col grid-rows-7 gap-1.5">
                {calendarDays.map((day, idx) => {
                  const key = day.toISOString().slice(0, 10)
                  const pages = calendarMap.get(key) || 0
                  
                  // Shade assignment logic
                  let bgClass = 'bg-slate-800/80 hover:bg-slate-700 hover:border-white/20'
                  if (pages > 0 && pages <= 5) bgClass = 'bg-emerald-800 hover:bg-emerald-700 shadow-sm border border-emerald-900'
                  else if (pages > 5 && pages <= 15) bgClass = 'bg-emerald-600 hover:bg-emerald-500 shadow-md border border-emerald-700'
                  else if (pages > 15 && pages <= 30) bgClass = 'bg-emerald-500 hover:bg-emerald-400 shadow-md border border-emerald-600'
                  else if (pages > 30) bgClass = 'bg-emerald-400 hover:bg-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.45)] border border-emerald-500'

                  const formattedDate = day.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                  const tooltipText = pages > 0 ? `${pages} pages read on ${formattedDate}` : `No reading logged on ${formattedDate}`

                  return (
                    <div
                      key={`${key}-${idx}`}
                      title={tooltipText}
                      className={`h-3 w-3 rounded-[3px] transition duration-200 cursor-pointer ${bgClass}`}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid of Currently Reading & Yearly Goals */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 4. CURRENTLY READING */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-slate-950/40 p-5 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                📚 Currently Reading
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Pick up where you left off</p>
            </div>
            {currentlyReadingItems.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAllCurrentlyReading(prev => !prev)}
                className="text-xs text-indigo-400 font-semibold hover:underline"
              >
                {showAllCurrentlyReading ? 'Show Less' : 'View All'}
              </button>
            )}
          </div>

          {progressLoading ? (
            <div className="space-y-4 py-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
              ))}
            </div>
          ) : currentlyReadingItems.length === 0 ? (
            <EmptyState
              className="my-auto py-8"
              icon="📖"
              title="No active books"
              description="Browse the library and start reading your next favorite book today."
              actionLabel="Explore Books"
              onAction={() => navigate('/books')}
              compact
            />
          ) : (
            <div className="space-y-4">
              {currentlyReadingItems
                .slice(0, showAllCurrentlyReading ? undefined : 3)
                .map((item) => {
                  const book = item.book || {}
                  const resumePage = Number.isInteger(item.currentPage) && item.currentPage > 0 ? item.currentPage : undefined
                  const link = buildReaderHash(book, { page: resumePage, cfi: item.cfi || '' })
                  
                  return (
                    <article
                      key={item._id || book._id}
                      className="group relative flex flex-col gap-4 rounded-xl border border-white/5 bg-[#0f1424]/40 p-4 transition-all duration-300 hover:border-indigo-500/20 hover:bg-[#0f1424]/60 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex gap-4">
                        <div className="aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-lg bg-slate-800 border border-white/10 shadow-md">
                          {book.thumbnail ? (
                            <img
                              loading="lazy"
                              src={getBookThumbnailUrl(book)}
                              alt={book.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-indigo-500/30 to-violet-500/30 text-[9px] font-bold text-white text-center p-1">
                              {book.title}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex flex-col justify-center">
                          <h3 className="line-clamp-1 text-sm font-bold text-white group-hover:text-indigo-300 transition-colors" title={book.title}>
                            {book.title}
                          </h3>
                          <p className="line-clamp-1 text-xs text-slate-400 mt-0.5">by {book.author || 'Unknown'}</p>
                          <span className="inline-block text-[9px] uppercase font-bold text-indigo-400 tracking-wider mt-1.5 self-start">
                            {book.category || 'General'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:w-48 shrink-0">
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                            <span className="font-semibold">Progress</span>
                            <span className="font-bold text-indigo-300">{Math.round(item.progressPercentage || 0)}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 transition-all duration-500"
                              style={{ width: `${item.progressPercentage || 0}%` }}
                            />
                          </div>
                        </div>
                        <a
                          href={link}
                          className="flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-500"
                        >
                          Continue Reading
                        </a>
                      </div>
                    </article>
                  )
                })}
            </div>
          )}
        </div>

        {/* 7. READING GOALS CARD */}
        {goalLoading ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5 sm:p-6 flex flex-col h-[340px] animate-pulse">
            <div className="h-6 w-32 bg-white/10 rounded mb-4" />
            <div className="my-auto flex flex-col items-center">
              <div className="h-32 w-32 rounded-full border-8 border-white/5 flex items-center justify-center mb-6" />
              <div className="h-4 w-40 bg-white/10 rounded mb-2" />
              <div className="h-3 w-48 bg-white/10 rounded animate-pulse" />
            </div>
          </div>
        ) : (!goalData?.goalSet || isEditingGoal) ? (
          /* GOAL SETUP OR EDIT CARD */
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                🎯 {isEditingGoal ? `Update ${currentYear} Goal` : `Set Your ${currentYear} Reading Goal`}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                {isEditingGoal 
                  ? "Adjust your yearly target to align with your current reading speed." 
                  : "Challenge yourself! Set a reading milestone for the year."}
              </p>
              
              <form onSubmit={handleSaveGoal} className="space-y-6">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2.5 font-bold uppercase tracking-wider">
                    <span>Target Books</span>
                    <span className="text-sm font-extrabold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20 font-mono">
                      {goalForm.targetBooks} {goalForm.targetBooks === 1 ? 'Book' : 'Books'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={goalForm.targetBooks}
                    onChange={(e) => setGoalForm(prev => ({ ...prev, targetBooks: Number(e.target.value) }))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-semibold">
                    <span>1 book</span>
                    <span>50 books</span>
                    <span>100 books</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Target Pages <span className="text-[10px] text-slate-500 font-semibold lowercase">(optional)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 5000"
                    value={goalForm.targetPages || ''}
                    onChange={(e) => setGoalForm(prev => ({ ...prev, targetPages: e.target.value === '' ? 0 : Number(e.target.value) }))}
                    className="h-10 w-full rounded-xl border border-white/10 bg-slate-950/65 px-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  {isEditingGoal && (
                    <button
                      type="button"
                      onClick={() => setIsEditingGoal(false)}
                      className="flex-1 rounded-xl border border-white/10 bg-transparent py-2.5 text-xs font-bold text-white transition hover:bg-white/5 active:scale-95"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={goalSaving}
                    className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-indigo-500 disabled:opacity-50 active:scale-95"
                  >
                    {goalSaving ? 'Saving...' : isEditingGoal ? 'Save Target' : 'Start Challenge'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* GOAL PROGRESS CARD */
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  🎯 {currentYear} Reading Goal
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setGoalForm({
                      targetBooks: goalData.data.goal.targetBooks,
                      targetPages: goalData.data.goal.targetPages || 0
                    })
                    setIsEditingGoal(true)
                  }}
                  className="text-xs text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                >
                  ✏️ Edit
                </button>
              </div>

              {/* Circular Progress Ring Container */}
              <div className="flex flex-col items-center text-center p-2">
                <div className="relative flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center">
                  <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="52"
                      strokeWidth="8"
                      stroke="rgba(255,255,255,0.06)"
                      fill="transparent"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="52"
                      strokeWidth="8"
                      stroke="url(#fitnessRingGrad)"
                      strokeDasharray={`${2 * Math.PI * 52}`}
                      strokeDashoffset={`${2 * Math.PI * 52 * (1 - Math.min(100, Math.round((goalData.data.completedBooksCount / goalData.data.goal.targetBooks) * 100)) / 100)}`}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-700 ease-out"
                    />
                    <defs>
                      <linearGradient id="fitnessRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="50%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#4f46e5" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-black text-white font-mono">
                      {Math.min(100, Math.round((goalData.data.completedBooksCount / goalData.data.goal.targetBooks) * 100))}%
                    </span>
                    <span className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Completed</span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mt-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
                    goalData.data.status === 'Goal achieved!' || goalData.data.completedBooksCount >= goalData.data.goal.targetBooks
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                      : goalData.data.status === 'Ahead of schedule'
                      ? 'bg-teal-500/10 border-teal-500/20 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.1)]'
                      : goalData.data.status === 'Behind schedule'
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                  }`}>
                    {goalData.data.status === 'Goal achieved!' || goalData.data.completedBooksCount >= goalData.data.goal.targetBooks ? '🏆 Goal Achieved!' : 
                     goalData.data.status === 'Ahead of schedule' ? '🔥 Ahead of schedule' :
                     goalData.data.status === 'Behind schedule' ? '⏰ Behind schedule' : '✨ On track'}
                  </span>
                </div>

                {/* Summary Stats */}
                <div className="mt-4 w-full">
                  <p className="text-sm font-semibold text-slate-300">
                    Read <span className="font-extrabold text-white font-mono">{goalData.data.completedBooksCount}</span> of{' '}
                    <span className="font-extrabold text-indigo-400 font-mono">{goalData.data.goal.targetBooks}</span> books
                  </p>
                  
                  <p className="text-xs text-slate-400 mt-1.5 max-w-[240px] leading-relaxed mx-auto">
                    {goalData.data.completedBooksCount >= goalData.data.goal.targetBooks
                      ? 'Excellent job! You successfully completed your reading goal for the year!'
                      : goalData.data.status === 'Ahead of schedule'
                      ? 'You are crushing it! You are ahead of the pace needed to meet your goal.'
                      : goalData.data.status === 'Behind schedule'
                      ? `You are slightly behind pace. Try to read ${goalData.data.booksPerMonthNeeded} books per month.`
                      : 'Keep going! You are perfectly on track to achieve your yearly goal.'}
                  </p>
                </div>

                {/* Pages Goal Sub-indicator */}
                {goalData.data.goal.targetPages > 0 && (
                  <div className="mt-5 w-full border-t border-white/5 pt-4 text-left">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1.5 font-bold uppercase tracking-wider">
                      <span>Page Target</span>
                      <span className="text-indigo-400 font-extrabold font-mono">
                        {goalData.data.totalPagesRead} / {goalData.data.goal.targetPages} pages
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-700 ease-out"
                        style={{ width: `${Math.min(100, Math.round((goalData.data.totalPagesRead / goalData.data.goal.targetPages) * 100))}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Pace Math Row */}
                <div className="mt-4 grid grid-cols-2 gap-2.5 w-full border-t border-white/5 pt-4 text-left text-[11px] text-slate-400 select-none">
                  <div>
                    <span className="text-slate-500 font-medium block">Projected Finish</span>
                    <span className="text-white font-extrabold font-mono">{goalData.data.projectedFinish} books</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Time Remaining</span>
                    <span className="text-white font-extrabold font-mono">{goalData.data.daysRemaining} days</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reading Goal Charts & History Row */}
      {!goalLoading && goalData?.goalSet && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Monthly Completion Custom HTML/CSS/SVG Chart */}
          <div className="md:col-span-2 rounded-2xl border border-white/10 bg-slate-950/40 p-5 sm:p-6 flex flex-col justify-between select-none relative">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                📊 Reading Velocity Chart
              </h2>
              <p className="text-xs text-slate-400">Monthly breakdown of completed books compared with target pace</p>
            </div>

            <div className="relative h-56 sm:h-64 mt-6 w-full flex items-end justify-between px-1 sm:px-2 pb-6 border-b border-white/10 border-l border-white/10 pt-4">
              {/* Dashed Target line representing target pace */}
              {(() => {
                const targetPace = (goalData?.data?.goal?.targetBooks || 12) / 12
                const targetLinePercent = Math.min(92, Math.max(8, Math.round((targetPace / maxCompletions) * 100)))
                return (
                  <div 
                    className="absolute left-0 right-0 border-t-2 border-dashed border-indigo-400/50 pointer-events-none select-none z-10" 
                    style={{ bottom: `${targetLinePercent}%` }}
                  >
                    <span className="absolute -top-5 right-2 text-[9px] font-black text-indigo-300 uppercase tracking-widest bg-slate-900/90 border border-white/10 px-2 py-0.5 rounded shadow-lg backdrop-blur-md">
                      Target Pace: {targetPace.toFixed(1)} books/mo
                    </span>
                  </div>
                )
              })()}

              {/* Responsive Grid Columns */}
              {(goalData?.data?.monthlyBreakdown || []).map((entry, index) => {
                const isCurrentMonth = index === new Date().getMonth();
                const count = entry.completed || 0;
                const percentHeight = Math.min(100, Math.max(4, Math.round((count / maxCompletions) * 100)));
                const isHovered = hoveredMonth === index;

                return (
                  <div 
                    key={entry.name}
                    className="flex-1 flex flex-col items-center justify-end h-full relative group px-0.5 sm:px-1"
                    onMouseEnter={() => setHoveredMonth(index)}
                    onMouseLeave={() => setHoveredMonth(null)}
                  >
                    {/* Bar graphic */}
                    <div 
                      className={`w-full max-w-[14px] sm:max-w-[28px] rounded-t-lg transition-all duration-500 ease-out cursor-pointer relative shadow-lg ${
                        isCurrentMonth 
                          ? 'bg-gradient-to-t from-purple-500/30 via-purple-500/70 to-purple-400 border border-purple-400/50 shadow-[0_0_15px_rgba(192,132,252,0.25)]' 
                          : 'bg-gradient-to-t from-indigo-600/20 via-indigo-500/70 to-indigo-400 border border-indigo-500/30'
                      } ${isHovered ? 'scale-x-110 -translate-y-0.5 brightness-110' : ''}`}
                      style={{ height: `${percentHeight}%` }}
                    >
                      {/* Interactive glow effect on hover */}
                      {isHovered && (
                        <div className="absolute inset-0 bg-white/10 rounded-t-lg animate-pulse" />
                      )}
                    </div>

                    {/* Month Label */}
                    <span className={`text-[8px] sm:text-[10px] font-bold mt-2 select-none uppercase tracking-wide absolute -bottom-5 ${
                      isCurrentMonth ? 'text-purple-400 font-black' : 'text-slate-400'
                    }`}>
                      {entry.name}
                    </span>

                    {/* Hover Tooltip Card */}
                    {isHovered && (
                      <div className="absolute bottom-full mb-3 z-30 pointer-events-none transform -translate-y-1 animate-in fade-in zoom-in-95 duration-150">
                        <div className="bg-[#0f1424]/95 border border-white/10 rounded-xl p-3 shadow-xl backdrop-blur-md text-left w-36">
                          <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider mb-1">
                            {entry.name} Progress
                          </p>
                          <p className="text-[11px] font-bold text-white flex items-center gap-1.5 leading-none">
                            📖 Read: <span className={`${isCurrentMonth ? 'text-purple-400' : 'text-indigo-400'} font-extrabold font-mono`}>{count}</span> {count === 1 ? 'book' : 'books'}
                          </p>
                          <p className="text-[9px] text-slate-500 mt-1.5 font-bold uppercase tracking-wider leading-none">
                            {count >= ((goalData?.data?.goal?.targetBooks || 12) / 12) ? '🔥 On Track' : '⌛ Behind Target'}
                          </p>
                        </div>
                        {/* Tooltip caret arrow */}
                        <div className="w-2.5 h-2.5 bg-[#0f1424] border-r border-b border-white/10 transform rotate-45 mx-auto -mt-1.5 shadow-lg" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Historical Milestones Log */}
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                🏅 Milestones & History
              </h2>
              <p className="text-xs text-slate-400">Your historical yearly milestones and stats</p>
            </div>

            <div className="mt-6 flex-1 overflow-y-auto max-h-56 pr-1 scrollbar-thin space-y-3">
              {goalHistoryLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded bg-white/[0.04]" />
                  ))}
                </div>
              ) : goalHistory.filter(h => h.year !== currentYear).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-8 opacity-60">
                  <span className="text-3xl mb-2">⭐</span>
                  <p className="text-xs text-slate-500 font-medium">No previous milestones logged.</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">Your past years will show up here.</p>
                </div>
              ) : (
                goalHistory
                  .filter(h => h.year !== currentYear)
                  .map((item) => {
                    const metGoal = item.completedBooksCount >= item.targetBooks;
                    return (
                      <div
                        key={item.year}
                        className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0"
                      >
                        <div>
                          <span className="text-sm font-bold text-white tracking-wide">{item.year} Reading Goal</span>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">
                            Target: {item.targetBooks} {item.targetBooks === 1 ? 'book' : 'books'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-black px-2 py-0.5 rounded border font-mono ${
                            metGoal
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-extrabold'
                              : 'bg-slate-800 border-white/5 text-slate-400'
                          }`}>
                            {item.completedBooksCount} Read
                          </span>
                          <p className="text-[9px] text-slate-500 mt-1 font-bold uppercase tracking-wider">
                            {metGoal ? '🏆 Goal Met' : 'Incomplete'}
                          </p>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. COMPLETED BOOKS */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              🏆 Completed Books
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Your lifetime reading accomplishments</p>
          </div>
          {completedItems.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAllCompleted(prev => !prev)}
              className="text-xs text-indigo-400 font-semibold hover:underline"
            >
              {showAllCompleted ? 'Show Less' : 'View All'}
            </button>
          )}
        </div>

        {progressLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 py-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />
            ))}
          </div>
        ) : completedItems.length === 0 ? (
          <EmptyState
            className="py-12"
            icon="🏆"
            title="No completed books yet"
            description="Complete a book fully to place it on your wall of fame."
            compact
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {completedItems
              .slice(0, showAllCompleted ? undefined : 6)
              .map((item) => {
                const book = item.book || {}
                const readDate = item.lastReadAt
                  ? new Date(item.lastReadAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'Recent'
                
                return (
                  <article
                    key={item._id || book._id}
                    className="group relative flex flex-col rounded-xl border border-white/5 bg-[#0f1424]/30 p-2.5 transition duration-300 hover:-translate-y-1 hover:border-emerald-500/20 hover:bg-[#0f1424]/50"
                  >
                    <div className="aspect-[3/4] overflow-hidden rounded-lg bg-slate-800 border border-white/10 shadow-sm transition group-hover:shadow-md">
                      {book.thumbnail ? (
                        <img
                          loading="lazy"
                          src={getBookThumbnailUrl(book)}
                          alt={book.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-[10px] font-bold text-white text-center p-2">
                          {book.title}
                        </div>
                      )}
                    </div>
                    <div className="mt-2.5 text-center min-w-0">
                      <h3 className="line-clamp-1 text-xs font-bold text-white group-hover:text-emerald-400 transition-colors" title={book.title}>
                        {book.title}
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold tracking-wide">
                        Finished {readDate}
                      </p>
                    </div>
                  </article>
                )
              })}
          </div>
        )}
      </div>

      {/* 6. ACHIEVEMENTS/BADGES */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
            🏅 Unlocked Achievements
          </h2>
          <p className="text-xs text-slate-400">Complete challenges to unlock special reading badges</p>
        </div>

        <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {achievements.map((badge) => (
            <div
              key={badge.key}
              className={`relative overflow-hidden rounded-xl border p-4 text-center transition-all duration-300 hover:scale-[1.02] flex flex-col justify-center items-center ${
                badge.earned
                  ? 'border-indigo-500/20 bg-indigo-500/5 shadow-[0_0_15px_rgba(99,102,241,0.08)]'
                  : 'border-white/5 bg-slate-900/10 grayscale select-none opacity-40'
              }`}
            >
              <div className={`text-4xl mb-3 flex items-center justify-center h-14 w-14 rounded-full ${badge.earned ? 'bg-indigo-500/15' : 'bg-slate-800'}`}>
                {badge.icon}
              </div>
              <h3 className={`text-xs font-bold ${badge.earned ? 'text-white' : 'text-slate-500'}`}>
                {badge.label}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1 leading-normal max-w-[120px]">
                {badge.desc}
              </p>

              {!badge.earned && (
                <div className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider text-slate-500 border border-slate-700/30 bg-slate-800/40 px-1.5 py-0.5 rounded">
                  Locked
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 8. EDIT PROFILE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
          
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2">Edit Profile Settings</h3>
            <p className="text-xs text-slate-400 mb-5">Update your credentials, avatar URL, or yearly reading milestone.</p>
            
            {updateError && (
              <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 font-semibold">
                {updateError}
              </div>
            )}

            <form onSubmit={handleEditProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Username</label>
                <input
                  type="text"
                  required
                  value={editForm.username}
                  onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-white/10 bg-slate-950/65 px-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500/50"
                  placeholder="Your username"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-white/10 bg-slate-950/65 px-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500/50"
                  placeholder="Your email address"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Avatar Image URL</label>
                <input
                  type="url"
                  value={editForm.avatar}
                  onChange={(e) => setEditForm(prev => ({ ...prev, avatar: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-white/10 bg-slate-950/65 px-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500/50"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Yearly Reading Goal (books)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editForm.readingGoal}
                  onChange={(e) => setEditForm(prev => ({ ...prev, readingGoal: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-white/10 bg-slate-950/65 px-3 text-sm text-white outline-none focus:border-indigo-500/50"
                  placeholder="12"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-transparent py-2.5 text-xs font-semibold text-white transition hover:bg-white/5 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateLoading}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-indigo-500 disabled:opacity-50 active:scale-95"
                >
                  {updateLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
