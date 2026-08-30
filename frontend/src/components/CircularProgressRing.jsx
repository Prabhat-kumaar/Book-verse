import React from 'react'

export default function CircularProgressRing({ progress = 0, size = 38, strokeWidth = 3 }) {
  const normalizedProgress = Math.min(100, Math.max(0, Number(progress) || 0))
  const radius = (size - strokeWidth * 2) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (normalizedProgress / 100) * circumference

  return (
    <div
      className="relative flex items-center justify-center rounded-full bg-[#101222]/90 backdrop-blur-md shadow-lg shadow-black/50 border border-white/10"
      style={{ width: size, height: size }}
      title={`${normalizedProgress}% completed`}
    >
      <svg className="h-full w-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#262942"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#9333ea"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-[10px] font-black tracking-tighter text-white select-none">
        {normalizedProgress}%
      </span>
    </div>
  )
}
