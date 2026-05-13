import { motion } from 'framer-motion'

function getMotivation(days) {
  if (days >= 14) return 'Amazing consistency!'
  if (days >= 5) return "You're on fire!"
  if (days > 0) return 'Keep the streak alive!'
  return 'Start your first reading streak today'
}

export default function StreakCard({ streak, previousStreak = 0 }) {
  const current = streak?.currentStreak || 0
  const longest = streak?.longestStreak || 0
  const totalDays = streak?.totalReadingDays || 0
  const weeklyDays = streak?.weeklyReadingDays || 0
  const freezeAvailable = streak?.streakFreezeAvailable ?? true
  const increased = current > previousStreak

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-orange-300/25 bg-gradient-to-br from-orange-500/15 via-amber-500/10 to-violet-500/20 p-5 shadow-[0_20px_55px_rgba(245,158,11,0.2)]"
    >
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-orange-400/25 blur-3xl"
      />
      {increased ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute right-3 top-3 rounded-full border border-emerald-300/40 bg-emerald-500/20 px-2 py-1 text-[10px] font-semibold text-emerald-100"
        >
          Streak +1
        </motion.div>
      ) : null}
      <div className="relative">
        <p className="text-3xl">🔥</p>
        <h3 className="mt-1 text-xl font-bold text-white">{current > 0 ? `${current} Day Reading Streak` : 'No Active Streak'}</h3>
        <p className="mt-1 text-sm text-orange-100/90">{getMotivation(current)}</p>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-white/15 bg-white/10 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Longest</p>
            <p className="mt-1 text-lg font-bold text-white">{longest} days</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/10 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Total Days</p>
            <p className="mt-1 text-lg font-bold text-white">{totalDays}</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/15 bg-white/10 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Weekly Goal</p>
          <p className="mt-1 text-sm text-white">Read {weeklyDays}/5 days this week</p>
          <div className="mt-2 h-2 rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-500 transition-all duration-500" style={{ width: `${Math.min(100, (weeklyDays / 5) * 100)}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-300">{freezeAvailable ? '✅ Streak Freeze available' : '⚡ Streak Freeze used'}</p>
        </div>

        {Array.isArray(streak?.badges) ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {streak.badges.map((badge) => (
              <span key={badge.key} className={`rounded-full border px-2.5 py-1 text-xs ${badge.earned ? 'border-emerald-300/40 bg-emerald-500/15 text-emerald-100' : 'border-white/15 bg-white/5 text-slate-300'}`}>
                {badge.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </motion.article>
  )
}
