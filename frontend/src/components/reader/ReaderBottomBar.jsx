import React from 'react'
import { MdArrowBack, MdArrowForward } from 'react-icons/md'

export default function ReaderBottomBar({
  currentChapterNumber = 1,
  totalChapters = 1,
  progressPercent = 0,
  onPrevChapter,
  onNextChapter,
  hasPrev = false,
  hasNext = false,
}) {
  return (
    <footer className="fixed bottom-5 inset-x-0 z-40 flex justify-center px-4 pointer-events-none animate-reader-fade-up">
      <div className="reader-floating-pill pointer-events-auto flex items-center justify-between gap-4 sm:gap-6 rounded-full px-5 sm:px-6 py-2.5 text-xs font-semibold max-w-xl w-full">
        {/* Previous Chapter Button */}
        <button
          type="button"
          onClick={onPrevChapter}
          disabled={!hasPrev}
          className="flex items-center gap-1.5 transition disabled:opacity-25 disabled:cursor-not-allowed hover:text-white"
          style={{ color: 'var(--reader-text)' }}
          title="Previous Chapter"
        >
          <MdArrowBack className="h-4 w-4" />
          <span className="hidden sm:inline">Previous Chapter</span>
        </button>

        {/* Center Chapter & Progress Segment */}
        <div className="flex flex-col items-center">
          <span
            className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase"
            style={{ color: 'var(--reader-subtext)' }}
          >
            CHAPTER {currentChapterNumber} OF {Math.max(1, totalChapters)} • {Math.round(progressPercent)}% COMPLETED
          </span>

          <div className="mt-1 h-1 w-28 sm:w-36 rounded-full bg-black/20 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 transition-all duration-300"
              style={{ width: `${Math.max(4, Math.min(100, progressPercent))}%` }}
            />
          </div>
        </div>

        {/* Next Chapter Button */}
        <button
          type="button"
          onClick={onNextChapter}
          disabled={!hasNext}
          className="flex items-center gap-1.5 transition disabled:opacity-25 disabled:cursor-not-allowed font-bold hover:text-white"
          style={{ color: 'var(--reader-text)' }}
          title="Next Chapter"
        >
          <span className="hidden sm:inline">Next Chapter</span>
          <MdArrowForward className="h-4 w-4" />
        </button>
      </div>
    </footer>
  )
}
