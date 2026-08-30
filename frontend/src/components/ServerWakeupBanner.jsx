import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MdHourglassEmpty } from 'react-icons/md'

export default function ServerWakeupBanner() {
  const [isSlow, setIsSlow] = useState(false)

  useEffect(() => {
    const handleWakeupState = (e) => {
      setIsSlow(!!e.detail?.isSlow)
    }
    window.addEventListener('api-wakeup-state', handleWakeupState)
    return () => {
      window.removeEventListener('api-wakeup-state', handleWakeupState)
    }
  }, [])

  return (
    <AnimatePresence>
      {isSlow && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="fixed bottom-6 left-1/2 z-[9999] w-[92%] max-w-md -translate-x-1/2"
        >
          <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-slate-950/85 p-4 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
            {/* Glowing background gradient */}
            <div className="absolute -left-10 -top-10 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl" />
            <div className="absolute -right-10 -bottom-10 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl" />

            <div className="relative flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/25 shadow-[0_0_12px_rgba(59,130,246,0.15)]">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
                >
                  <MdHourglassEmpty className="h-5.5 w-5.5" />
                </motion.div>
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-white tracking-wide">
                  Waking up Readify server
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  Our backend is hosted on a free Render service and takes about 50 seconds to spin up from a cold start. Thanks for waiting!
                </p>
              </div>
            </div>
            
            {/* Tiny progress line indicating activity */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-800">
              <motion.div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                initial={{ width: '0%' }}
                animate={{ width: '90%' }}
                transition={{ duration: 45, ease: 'easeOut' }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
