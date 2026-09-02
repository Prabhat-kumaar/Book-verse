import React from 'react'
import {
  MdMenu,
  MdLightMode,
  MdDarkMode,
  MdBookmark,
  MdBookmarkBorder,
} from 'react-icons/md'
import { RiBookReadLine } from 'react-icons/ri'

export default function ReaderTopBar({
  bookTitle = 'Untitled Book',
  chapterTitle = '',
  chapterNumber = 1,
  progressPercent = 0,
  theme = 'dark',
  onThemeChange,
  onFontSizeChange,
  onToggleSidebar,
  isBookmarked = false,
  onToggleBookmark,
}) {
  const themeLabel =
    theme === 'dark' ? 'Lumina Noir' : theme === 'sepia' ? 'Warm Sepia' : 'Pure Light'

  return (
    <header className="fixed top-4 inset-x-0 z-40 flex justify-center px-4 pointer-events-none animate-reader-fade-up">
      <div className="reader-floating-pill pointer-events-auto flex items-center gap-3 sm:gap-5 rounded-full px-4 sm:px-6 py-2.5 text-xs font-semibold transition-all duration-300">
        {/* Table of Contents Drawer Button */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-full p-1 text-slate-400 hover:text-white hover:bg-white/10 transition"
          title="Table of Contents"
          aria-label="Open Table of Contents"
        >
          <MdMenu className="h-5 w-5 text-current" />
        </button>

        {/* Theme Preset Badge */}
        <span className="hidden sm:inline-block font-extrabold tracking-wide" style={{ color: 'var(--reader-heading)' }}>
          {themeLabel}
        </span>

        {/* Book Title & Chapter Label */}
        <div className="flex items-center gap-1.5 truncate max-w-[140px] sm:max-w-[220px]">
          <span className="truncate" style={{ color: 'var(--reader-text)' }}>
            {bookTitle}
          </span>
          {chapterTitle && (
            <span className="hidden md:inline truncate opacity-70" style={{ color: 'var(--reader-subtext)' }}>
              — {chapterTitle}
            </span>
          )}
        </div>

        {/* Progress Percentage Badge */}
        <div className="rounded-full border border-purple-500/30 bg-purple-500/15 px-2.5 py-0.5 text-[10px] font-bold text-purple-400 shrink-0">
          {Math.round(progressPercent)}% Complete
        </div>

        <span className="hidden sm:inline text-white/20">|</span>

        {/* Font Size Adjuster Controls (A- / A+) */}
        <div className="hidden sm:flex items-center gap-1">
          <button
            type="button"
            onClick={() => onFontSizeChange(-1)}
            className="px-2 py-0.5 rounded hover:bg-white/10 font-bold transition"
            style={{ color: 'var(--reader-text)' }}
            title="Decrease font size"
          >
            A-
          </button>
          <button
            type="button"
            onClick={() => onFontSizeChange(1)}
            className="px-2 py-0.5 rounded hover:bg-white/10 font-bold transition"
            style={{ color: 'var(--reader-text)' }}
            title="Increase font size"
          >
            A+
          </button>
        </div>

        <span className="hidden sm:inline text-white/20">|</span>

        {/* Theme Switcher Toggle (Light, Dark, Sepia) */}
        <div className="flex items-center gap-1 rounded-full bg-black/20 dark:bg-black/40 p-0.5 border border-white/5">
          <button
            type="button"
            onClick={() => onThemeChange('light')}
            className={`p-1.5 rounded-full transition ${
              theme === 'light'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Light Mode"
            aria-label="Switch to Light Theme"
          >
            <MdLightMode className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onThemeChange('dark')}
            className={`p-1.5 rounded-full transition ${
              theme === 'dark'
                ? 'bg-[#1a2238] text-purple-300 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Lumina Noir Mode"
            aria-label="Switch to Lumina Noir Theme"
          >
            <MdDarkMode className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onThemeChange('sepia')}
            className={`p-1.5 rounded-full transition ${
              theme === 'sepia'
                ? 'bg-[#c7b28b] text-[#2b1810] shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Warm Sepia Mode"
            aria-label="Switch to Warm Sepia Theme"
          >
            <RiBookReadLine className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Bookmark Action */}
        <button
          type="button"
          onClick={onToggleBookmark}
          className="rounded-full p-1 text-slate-400 hover:text-pink-400 transition"
          title={isBookmarked ? 'Remove Bookmark' : 'Bookmark this chapter'}
          aria-label="Toggle Bookmark"
        >
          {isBookmarked ? (
            <MdBookmark className="h-5 w-5 text-pink-400 animate-reader-scale-in" />
          ) : (
            <MdBookmarkBorder className="h-5 w-5 text-current" />
          )}
        </button>
      </div>
    </header>
  )
}
