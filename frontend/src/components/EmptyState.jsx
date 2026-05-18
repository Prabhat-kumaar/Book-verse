import { motion } from 'framer-motion'

export default function EmptyState({
  icon = '📚',
  title,
  description,
  actionLabel,
  onAction,
  className = '',
  compact = false,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-slate-900/70 via-slate-900/60 to-blue-950/50 p-6 text-center shadow-[0_16px_48px_rgba(0,0,0,0.35)] backdrop-blur-xl ${className}`}
    >
      <div className="pointer-events-none absolute -left-8 -top-8 h-28 w-28 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-8 -right-8 h-28 w-28 rounded-full bg-violet-500/20 blur-3xl" />
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2.8, ease: 'easeInOut', repeat: Infinity }}
        className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-white/20 bg-white/10 text-3xl"
      >
        {icon}
      </motion.div>
      <h3 className={`mt-4 font-bold text-white ${compact ? 'text-lg' : 'text-xl'}`}>{title}</h3>
      <p className="mt-2 text-sm text-slate-300">{description}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded-xl border border-blue-300/40 bg-blue-500/15 px-4 py-2 text-sm font-semibold text-blue-100 transition duration-200 hover:-translate-y-0.5 hover:bg-blue-500/25 hover:shadow-[0_0_20px_rgba(99,102,241,0.35)]"
        >
          {actionLabel}
        </button>
      ) : null}
    </motion.div>
  )
}
