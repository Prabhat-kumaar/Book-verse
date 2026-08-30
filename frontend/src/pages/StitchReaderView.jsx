import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  MdMenu,
  MdBookmark,
  MdBookmarkBorder,
  MdMoreVert,
  MdFormatSize,
  MdClose,
  MdArrowBack,
  MdOutlineTextFormat,
} from 'react-icons/md'
import { READER_DEMO_BOOK } from '../lib/stitchBooks'
import SEO from '../components/SEO'

export default function StitchReaderView({ book = null }) {
  const navigate = useNavigate()
  const currentBook = book || READER_DEMO_BOOK
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeChapterIndex, setActiveChapterIndex] = useState(1) // Chapter 2
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [fontMenuOpen, setFontMenuOpen] = useState(false)
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false)

  // Typography state
  const [fontSize, setFontSize] = useState('text-base sm:text-lg') // 'text-sm', 'text-base sm:text-lg', 'text-xl'
  const [fontFamily, setFontFamily] = useState('font-serif') // 'font-sans', 'font-serif', 'font-mono'
  const [lineSpacing, setLineSpacing] = useState('leading-relaxed') // 'leading-normal', 'leading-relaxed', 'leading-loose'

  const chapters = currentBook.chapters || READER_DEMO_BOOK.chapters
  const activeChapter = chapters[activeChapterIndex] || chapters[0]

  return (
    <>
      <SEO
        title={`${currentBook.title} - Reader | Readify AI`}
        description={`Read ${currentBook.title} online free with Readify AI distraction-free reader.`}
      />

      <div className="flex h-screen w-full flex-col overflow-hidden bg-[#0a0c16] text-slate-100 select-text">
        {/* ========================================================================= */}
        {/* 1. TOP HEADER BAR (Screen 3 exact match)                                  */}
        {/* ========================================================================= */}
        <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-white/[0.08] bg-[#0c0e1a]/95 px-4 backdrop-blur-md">
          {/* Left: Hamburger Menu & Book Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              type="button"
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                sidebarOpen
                  ? 'bg-white/10 text-white'
                  : 'bg-white/[0.03] text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
              title="Toggle Table of Contents"
            >
              <MdMenu className="h-5 w-5" />
            </button>

            <Link
              to="/library"
              className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition"
              title="Back to Library"
            >
              <MdArrowBack className="h-4 w-4" />
            </Link>

            <h1 className="line-clamp-1 text-sm sm:text-base font-bold text-white max-w-[200px] sm:max-w-md">
              {currentBook.title}
            </h1>
          </div>

          {/* Center: Reading Progress Bar & Percentage */}
          <div className="hidden md:flex items-center gap-3">
            <div className="h-1.5 w-36 sm:w-48 overflow-hidden rounded-full bg-[#1e2238]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-400"
                style={{ width: `${currentBook.progress || 34}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-300">
              {currentBook.progress || 34}% Read
            </span>
          </div>

          {/* Right Action Icons: Font 'A', Bookmark, Three Dots */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Font Style Toggle Button */}
            <div className="relative">
              <button
                onClick={() => setFontMenuOpen((prev) => !prev)}
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.03] text-slate-300 transition hover:bg-white/10 hover:text-white"
                title="Typography & Appearance"
              >
                <span className="font-serif text-base font-bold">A</span>
              </button>

              {/* Font Settings Dropdown */}
              {fontMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/10 bg-[#121528] p-4 shadow-2xl backdrop-blur-xl animate-fadeIn z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-xs font-bold text-white uppercase">Reader Settings</span>
                    <button
                      onClick={() => setFontMenuOpen(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <MdClose className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 space-y-3 text-xs">
                    {/* Font Size */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400">Font Size</label>
                      <div className="mt-1 grid grid-cols-3 gap-1.5">
                        {[
                          { label: 'Small', val: 'text-sm sm:text-base' },
                          { label: 'Medium', val: 'text-base sm:text-lg' },
                          { label: 'Large', val: 'text-lg sm:text-xl' },
                        ].map((sz) => (
                          <button
                            key={sz.label}
                            onClick={() => setFontSize(sz.val)}
                            className={`rounded-lg py-1.5 font-bold transition ${
                              fontSize === sz.val
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white/5 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            {sz.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Font Family */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400">Typography</label>
                      <div className="mt-1 grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => setFontFamily('font-serif')}
                          className={`rounded-lg py-1.5 font-serif text-sm font-bold transition ${
                            fontFamily === 'font-serif'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          Serif
                        </button>
                        <button
                          onClick={() => setFontFamily('font-sans')}
                          className={`rounded-lg py-1.5 font-sans text-xs font-bold transition ${
                            fontFamily === 'font-sans'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          Sans
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bookmark Button */}
            <button
              onClick={() => setIsBookmarked((prev) => !prev)}
              type="button"
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                isBookmarked
                  ? 'bg-purple-600/20 text-purple-400'
                  : 'bg-white/[0.03] text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
              title={isBookmarked ? 'Bookmarked' : 'Bookmark Page'}
            >
              {isBookmarked ? (
                <MdBookmark className="h-5 w-5 fill-current" />
              ) : (
                <MdBookmarkBorder className="h-5 w-5" />
              )}
            </button>

            {/* Three Dots More Options */}
            <div className="relative">
              <button
                onClick={() => setOptionsMenuOpen((prev) => !prev)}
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.03] text-slate-300 transition hover:bg-white/10 hover:text-white"
                title="More Options"
              >
                <MdMoreVert className="h-5 w-5" />
              </button>

              {optionsMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-white/10 bg-[#121528] p-2 shadow-2xl backdrop-blur-xl animate-fadeIn z-50">
                  <button
                    onClick={() => {
                      alert('Fullscreen mode activated')
                      setOptionsMenuOpen(false)
                    }}
                    className="w-full text-left rounded-xl px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10"
                  >
                    Fullscreen Mode
                  </button>
                  <button
                    onClick={() => {
                      alert('Progress reset for demo')
                      setOptionsMenuOpen(false)
                    }}
                    className="w-full text-left rounded-xl px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10"
                  >
                    Reset Progress
                  </button>
                  <Link
                    to="/"
                    className="block w-full text-left rounded-xl px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10"
                  >
                    Exit to Home
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* 2. BODY LAYOUT: TABLE OF CONTENTS SIDEBAR + MAIN CANVAS                   */}
        {/* ========================================================================= */}
        <div className="relative flex flex-1 overflow-hidden">
          {/* Left Table of Contents Sidebar */}
          <aside
            className={`flex flex-col border-r border-white/[0.08] bg-[#0c0e1a] transition-all duration-300 ease-in-out shrink-0 overflow-y-auto ${
              sidebarOpen ? 'w-72 sm:w-80 p-5' : 'w-0 p-0 border-transparent overflow-hidden'
            }`}
          >
            {sidebarOpen && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold tracking-tight text-white">Contents</h2>

                <nav className="flex flex-col gap-1.5 pt-2">
                  {chapters.map((ch, idx) => {
                    const isActive = idx === activeChapterIndex
                    return (
                      <div key={ch.id || idx} className="flex flex-col">
                        <button
                          onClick={() => setActiveChapterIndex(idx)}
                          type="button"
                          className={`flex items-start text-left rounded-xl p-3 text-xs sm:text-sm font-semibold transition duration-200 ${
                            isActive
                              ? 'bg-[#22253d] text-white border-l-4 border-indigo-500 shadow-md'
                              : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'
                          }`}
                        >
                          <span className="leading-snug">{ch.title}</span>
                        </button>

                        {/* Indented Subsections if Active Chapter */}
                        {isActive && ch.subsections && ch.subsections.length > 0 && (
                          <div className="pl-6 pt-1.5 pb-2 space-y-1">
                            {ch.subsections.map((sub) => (
                              <p
                                key={sub.id}
                                className="text-xs text-slate-300 font-medium hover:text-white cursor-pointer py-1 transition"
                              >
                                {sub.title}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </nav>
              </div>
            )}
          </aside>

          {/* Main Reading Canvas */}
          <main className="flex-1 overflow-y-auto px-6 py-8 sm:py-12 md:px-16 lg:px-24">
            <div className={`mx-auto max-w-3xl ${fontFamily}`}>
              {/* Chapter Badge */}
              <p className="text-xs font-black tracking-widest text-indigo-400 uppercase mb-3">
                {activeChapter.content?.chapterLabel || `CHAPTER ${activeChapter.number || 2}`}
              </p>

              {/* Chapter Main Title */}
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-8 leading-tight">
                {activeChapter.content?.title || activeChapter.title}
              </h2>

              {/* Main Reading Paragraphs */}
              <div className={`space-y-6 text-slate-200 ${fontSize} ${lineSpacing}`}>
                {activeChapter.content?.paragraphs?.map((p, i) => (
                  <p key={i} className="leading-relaxed">
                    {p}
                  </p>
                )) || (
                  <>
                    <p className="leading-relaxed">
                      When people use something, they face two gulfs: the Gulf of Execution, where they try to figure out how it operates, and the Gulf of Evaluation, where they try to figure out what happened. The role of the designer is to help people bridge the two gulfs.
                    </p>
                    <p className="leading-relaxed">
                      We bridge the Gulf of Execution through the use of signifiers, constraints, mappings, and a conceptual model. We bridge the Gulf of Evaluation through the use of feedback and a good conceptual model.
                    </p>
                  </>
                )}

                {/* Subheading */}
                <h3 className="pt-4 text-2xl font-bold text-white tracking-tight">
                  {activeChapter.content?.subheading || 'Knowledge in the Head and in the World'}
                </h3>

                {activeChapter.content?.subheadingParagraphs?.map((p, i) => (
                  <p key={i} className="leading-relaxed">
                    {p}
                  </p>
                )) || (
                  <p className="leading-relaxed">
                    Human memory is notoriously flawed. People are apt to forget things, or to remember them incorrectly. Fortunately, we don't have to have all the knowledge we need in our heads. A lot of knowledge can be placed in the world.
                  </p>
                )}
              </div>

              {/* Bottom Chapter Navigation Controls */}
              <div className="mt-16 flex items-center justify-between border-t border-white/10 pt-6">
                <button
                  onClick={() => setActiveChapterIndex((prev) => Math.max(0, prev - 1))}
                  disabled={activeChapterIndex === 0}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 disabled:opacity-40"
                >
                  &larr; Previous Chapter
                </button>

                <span className="text-xs font-semibold text-slate-400">
                  Chapter {activeChapterIndex + 1} of {chapters.length}
                </span>

                <button
                  onClick={() =>
                    setActiveChapterIndex((prev) => Math.min(chapters.length - 1, prev + 1))
                  }
                  disabled={activeChapterIndex === chapters.length - 1}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-40 shadow-lg shadow-indigo-600/30"
                >
                  Next Chapter &rarr;
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  )
}
