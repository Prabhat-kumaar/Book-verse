import React from 'react'
import { Link } from 'react-router-dom'
import {
  MdClose,
  MdBookmarkBorder,
  MdAutoStories,
  MdFormatQuote,
  MdNoteAlt,
  MdShield,
} from 'react-icons/md'

export default function ReaderSidebar({
  isOpen = false,
  onClose,
  bookTitle = '',
  currentChapterTitle = '',
  currentChapterNumber = 1,
  chapters = [],
  onSelectChapter,
}) {
  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-72 sm:w-80 flex-col justify-between border-r border-white/10 bg-[#0c101d] p-5 shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-tr from-violet-600 to-pink-500 text-xs font-black text-white shadow-md">
                📑
              </div>
              <div>
                <h2 className="text-sm font-bold text-white leading-tight">Table of Contents</h2>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate max-w-[170px] mt-0.5">
                  {bookTitle} {currentChapterTitle ? `— ${currentChapterTitle}` : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
              title="Close Table of Contents"
              aria-label="Close"
            >
              <MdClose className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="space-y-1 pt-1 text-xs font-semibold">
            <Link
              to="/saved-books"
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
            >
              <MdAutoStories className="h-4 w-4 text-slate-400" />
              <span>Library</span>
            </Link>

            <div className="flex items-center gap-3 rounded-xl bg-violet-600/15 border border-violet-500/20 px-3 py-2 text-white font-bold">
              <MdBookmarkBorder className="h-4 w-4 text-violet-400" />
              <span>Table of Contents</span>
            </div>
          </div>

          {/* Chapters List */}
          <div className="max-h-[calc(100vh-270px)] overflow-y-auto space-y-1 pr-1 scrollbar-thin">
            {chapters.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">No chapters found</p>
            ) : (
              chapters.map((ch) => {
                const isActive = ch.chapterNumber === currentChapterNumber
                return (
                  <button
                    key={ch.chapterNumber}
                    type="button"
                    onClick={() => {
                      onSelectChapter(ch.chapterNumber)
                      onClose()
                    }}
                    className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition ${
                      isActive
                        ? 'bg-violet-600/20 text-violet-300 font-bold border-l-2 border-violet-400 shadow-sm'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-[11px] opacity-60 shrink-0">
                        {ch.chapterNumber}
                      </span>
                      <span className="truncate">{ch.chapterTitle || `Chapter ${ch.chapterNumber}`}</span>
                    </div>
                    {ch.readingTimeMinutes && (
                      <span className="text-[10px] opacity-40 shrink-0 ml-2">
                        {ch.readingTimeMinutes}m
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Bottom Drawer: Premium Reader Badge */}
        <div className="flex items-center gap-3 border-t border-white/[0.08] pt-4">
          <div className="grid h-8 w-8 place-items-center rounded-full border border-violet-400/30 bg-violet-500/10 text-xs text-violet-300">
            <MdShield className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white">Premium Reader</span>
            <span className="text-[10px] text-slate-400">All features unlocked</span>
          </div>
        </div>
      </aside>
    </>
  )
}
