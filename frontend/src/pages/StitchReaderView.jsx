import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MdBookmark,
  MdBookmarkBorder,
  MdMenuBook,
  MdFormatListBulleted,
  MdCreate,
  MdNote,
  MdClose,
  MdWbSunny,
  MdNightlightRound,
  MdCoffee,
  MdTranslate,
  MdCheck,
} from 'react-icons/md'
import { READER_DEMO_BOOK } from '../lib/stitchBooks'
import SEO from '../components/SEO'

const THEMES = {
  dark: {
    name: 'Lumina Noir',
    bg: 'bg-[#090c15]',
    text: 'text-slate-200',
    titleColor: 'text-white',
    border: 'border-white/10',
    highlightBg: 'bg-indigo-500/25 text-indigo-200 border-b border-indigo-400/40',
    drawerBg: 'bg-[#0c101d]',
  },
  sepia: {
    name: 'Lumina Sepia',
    bg: 'bg-[#f4ecd8]',
    text: 'text-[#3d2b1f]',
    titleColor: 'text-[#2b1810]',
    border: 'border-[#d6c7b0]',
    highlightBg: 'bg-amber-400/35 text-[#2b1810] border-b border-amber-600/40',
    drawerBg: 'bg-[#ebe0c8]',
  },
  light: {
    name: 'Lumina Pure',
    bg: 'bg-[#f8fafc]',
    text: 'text-slate-800',
    titleColor: 'text-slate-950',
    border: 'border-slate-200',
    highlightBg: 'bg-yellow-300/40 text-slate-900 border-b border-yellow-500/50',
    drawerBg: 'bg-slate-100',
  },
}

export default function StitchReaderView({ book = null }) {
  const navigate = useNavigate()
  const currentBook = book || READER_DEMO_BOOK

  // Reader States
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [activeDrawerTab, setActiveDrawerTab] = useState('toc') // 'toc' | 'highlights' | 'notes'
  const [themeMode, setThemeMode] = useState('dark') // 'dark' | 'sepia' | 'light'
  const [fontSizeLevel, setFontSizeLevel] = useState(2) // 1: small, 2: base, 3: large, 4: extra large
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [progressPercent, setProgressPercent] = useState(32)

  // Selection & Highlight Popover state
  const [selectedText, setSelectedText] = useState('')
  const [popoverPosition, setPopoverPosition] = useState(null)
  const [highlights, setHighlights] = useState([
    'In his blue gardens men and girls came and went like moths among the whisperings and the champagne and the stars.',
  ])
  const [notes, setNotes] = useState([
    { text: 'Metaphor for the ephemeral luxury of the Jazz Age.', date: 'Chapter 3' },
  ])
  const [dictionaryDefinition, setDictionaryDefinition] = useState(null)

  const contentRef = useRef(null)
  const currentTheme = THEMES[themeMode]

  // Font size class mapping
  const fontSizeClasses = [
    'text-base leading-relaxed',
    'text-lg leading-relaxed',
    'text-xl leading-loose',
    'text-2xl leading-loose',
  ]

  // Handle Text Selection for Popover
  const handleMouseUp = () => {
    const selection = window.getSelection()
    const text = selection?.toString()?.trim()
    if (text && text.length > 2) {
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      setSelectedText(text)
      setPopoverPosition({
        top: rect.top - 50,
        left: rect.left + rect.width / 2,
      })
      setDictionaryDefinition(null)
    } else {
      setPopoverPosition(null)
      setSelectedText('')
      setDictionaryDefinition(null)
    }
  }

  const addHighlight = () => {
    if (selectedText && !highlights.includes(selectedText)) {
      setHighlights((prev) => [...prev, selectedText])
    }
    setPopoverPosition(null)
    window.getSelection()?.removeAllRanges()
  }

  const addNote = () => {
    const userNote = window.prompt(`Add note for: "${selectedText.slice(0, 30)}..."`)
    if (userNote) {
      setNotes((prev) => [...prev, { text: userNote, quote: selectedText, date: 'Chapter 3' }])
    }
    setPopoverPosition(null)
    window.getSelection()?.removeAllRanges()
  }

  const lookupDictionary = () => {
    setDictionaryDefinition(`"${selectedText}": Evoking vivid atmosphere, sensory imagery, or literary expression.`)
  }

  return (
    <>
      <SEO
        title={`${currentBook.title || 'The Great Gatsby'} - Chapter 3 | LuminaReader`}
        description="Distraction-free digital reading experience on LuminaBooks."
      />

      <div
        className={`relative flex h-screen w-full overflow-hidden ${currentTheme.bg} ${currentTheme.text} select-text transition-colors duration-300 font-serif`}
        onMouseUp={handleMouseUp}
      >
        {/* ========================================================================= */}
        {/* 1. LEFT SLIDING TABLE OF CONTENTS DRAWER                                   */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {drawerOpen && (
            <motion.aside
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col justify-between border-r ${currentTheme.border} ${currentTheme.drawerBg} p-5 shadow-2xl backdrop-blur-xl md:static font-sans`}
            >
              {/* Drawer Top Header */}
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className={`text-base font-bold tracking-tight ${currentTheme.titleColor}`}>
                      Table of Contents
                    </h2>
                    <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mt-0.5">
                      THE GREAT GATSBY - CHAPTER 3
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="p-1 text-slate-400 hover:text-white"
                    title="Close Drawer"
                  >
                    <MdClose className="h-4 w-4" />
                  </button>
                </div>

                {/* Navigation Items List */}
                <nav className="space-y-1.5 text-xs font-semibold">
                  <Link
                    to="/saved-books"
                    className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
                  >
                    <MdMenuBook className="h-4 w-4 text-slate-400" />
                    <span>Library</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setActiveDrawerTab('toc')}
                    className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 transition text-left ${
                      activeDrawerTab === 'toc'
                        ? 'bg-[#1a2035] text-white shadow-inner font-bold'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    <MdFormatListBulleted className="h-4 w-4 text-violet-400" />
                    <span>Table of Contents</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveDrawerTab('highlights')}
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 transition text-left ${
                      activeDrawerTab === 'highlights'
                        ? 'bg-[#1a2035] text-white shadow-inner font-bold'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <MdCreate className="h-4 w-4 text-pink-400" />
                      <span>Highlights</span>
                    </div>
                    {highlights.length > 0 && (
                      <span className="rounded-full bg-pink-500/20 px-2 py-0.5 text-[9px] font-bold text-pink-300">
                        {highlights.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveDrawerTab('notes')}
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 transition text-left ${
                      activeDrawerTab === 'notes'
                        ? 'bg-[#1a2035] text-white shadow-inner font-bold'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <MdNote className="h-4 w-4 text-amber-400" />
                      <span>Notes</span>
                    </div>
                    {notes.length > 0 && (
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-300">
                        {notes.length}
                      </span>
                    )}
                  </button>
                </nav>

                {/* Sub-view: TOC Chapter list */}
                {activeDrawerTab === 'toc' && (
                  <div className="space-y-1 pt-2 border-t border-white/[0.06] max-h-60 overflow-y-auto pr-1">
                    {[
                      'Chapter I',
                      'Chapter II',
                      'Chapter III',
                      'Chapter IV',
                      'Chapter V',
                      'Chapter VI',
                      'Chapter VII',
                      'Chapter VIII',
                      'Chapter IX',
                    ].map((chap, i) => (
                      <div
                        key={chap}
                        className={`rounded-lg px-3 py-2 text-xs transition cursor-pointer ${
                          i === 2
                            ? 'bg-violet-500/15 text-violet-300 font-bold border-l-2 border-violet-400'
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                        }`}
                      >
                        {chap}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Drawer Bottom: Reader Profile */}
              <div className="flex items-center gap-3 border-t border-white/[0.06] pt-4">
                <div className="grid h-9 w-9 place-items-center rounded-full border border-violet-400/40 bg-gradient-to-br from-violet-500 to-pink-500 text-xs font-black text-white shadow-md">
                  R
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">Reader Profile</span>
                  <span className="text-[10px] text-slate-400 font-medium">Premium Member</span>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* 2. MAIN READING AREA CANVAS                                               */}
        {/* ========================================================================= */}
        <div className="relative flex flex-1 flex-col h-full overflow-y-auto">
          {/* Top Floating Minimalist Pill Toolbar */}
          <div className="sticky top-4 z-30 flex justify-center px-4 font-sans pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-4 sm:gap-6 rounded-full border border-white/10 bg-[#0e121e]/90 px-5 sm:px-6 py-2 shadow-2xl backdrop-blur-2xl text-xs font-semibold text-slate-200">
              {/* Drawer Toggle Icon if closed */}
              {!drawerOpen && (
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="text-slate-400 hover:text-white transition"
                  title="Open Table of Contents"
                >
                  <MdFormatListBulleted className="h-4 w-4" />
                </button>
              )}

              {/* Theme Preset / Title Name */}
              <span className="font-bold text-white tracking-wide">{currentTheme.name}</span>

              {/* Progress Percentage */}
              <span className="text-slate-400 font-medium">{progressPercent}% Read</span>

              <span className="text-slate-600">|</span>

              {/* Font Size Adjuster Stepper: A- / A+ */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFontSizeLevel((l) => Math.max(0, l - 1))}
                  className="px-1.5 py-0.5 rounded hover:bg-white/10 text-slate-300 font-bold"
                  title="Decrease Font Size"
                >
                  A-
                </button>
                <button
                  type="button"
                  onClick={() => setFontSizeLevel((l) => Math.min(3, l + 1))}
                  className="px-1.5 py-0.5 rounded hover:bg-white/10 text-slate-300 font-bold"
                  title="Increase Font Size"
                >
                  A+
                </button>
              </div>

              <span className="text-slate-600">|</span>

              {/* Theme Switcher Pill (Light, Dark, Sepia) */}
              <div className="flex items-center gap-1 rounded-full bg-black/40 p-0.5 border border-white/5">
                <button
                  type="button"
                  onClick={() => setThemeMode('light')}
                  className={`p-1.5 rounded-full transition ${
                    themeMode === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Light Mode"
                >
                  <MdWbSunny className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setThemeMode('dark')}
                  className={`p-1.5 rounded-full transition ${
                    themeMode === 'dark' ? 'bg-[#1a2238] text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Lumina Noir Mode"
                >
                  <MdNightlightRound className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setThemeMode('sepia')}
                  className={`p-1.5 rounded-full transition ${
                    themeMode === 'sepia' ? 'bg-[#c7b28b] text-[#2b1810] shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Sepia Mode"
                >
                  <MdCoffee className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Bookmark Toggle */}
              <button
                type="button"
                onClick={() => setIsBookmarked((b) => !b)}
                className="text-slate-300 hover:text-pink-400 transition"
                title={isBookmarked ? 'Bookmarked' : 'Bookmark Page'}
              >
                {isBookmarked ? (
                  <MdBookmark className="h-4 w-4 text-pink-400" />
                ) : (
                  <MdBookmarkBorder className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Reader Chapter Text Body */}
          <main
            ref={contentRef}
            className="mx-auto w-full max-w-3xl px-6 sm:px-12 py-16 sm:py-24 space-y-8 tracking-normal"
          >
            {/* Chapter Header */}
            <div className="text-center pb-6">
              <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-widest uppercase ${currentTheme.titleColor}`}>
                CHAPTER III
              </h1>
            </div>

            {/* Reading Paragraphs with interactive highlight */}
            <div className={`space-y-6 text-left ${fontSizeClasses[fontSizeLevel]}`}>
              <p>
                There was music from my neighbor's house through the summer nights.{' '}
                <mark className={`${currentTheme.highlightBg} px-1.5 py-0.5 rounded transition-colors`}>
                  In his blue gardens men and girls came and went like moths among the whisperings and the champagne and the stars.
                </mark>{' '}
                At high tide in the afternoon I watched his guests diving from the tower of his raft, or taking the sun on the hot sand of his beach while his two motor-boats slit the waters of the Sound, drawing aquaplanes over cataracts of foam.
              </p>

              <p>
                On week-ends his Rolls-Royce became an omnibus, bearing parties to and from the city between nine in the morning and long past midnight, while his station wagon scampered like a brisk yellow bug to meet all trains. And on Mondays eight servants, including an extra gardener, toiled all day with mops and scrubbing-brushes and hammers and garden-shears, repairing the ravages of the night before.
              </p>

              <p>
                Every Friday five crates of oranges and lemons arrived from a fruiterer in New York—every Monday these same oranges and lemons left his back door in a pyramid of pulpless halves. There was a machine in the kitchen which could extract the juice of two hundred oranges in half an hour if a little button was pressed two hundred times by a butler's thumb.
              </p>

              <p>
                At least once a fortnight a corps of caterers came down with several hundred feet of canvas and enough colored lights to make a Christmas tree of Gatsby's enormous gardens. On buffet tables, garnished with glistening hors-d'oeuvre, spiced baked hams crowded against salads of harlequin designs and pastry pigs and turkeys bewitched to a dark gold. In the main hall a bar with a real brass rail was set up, and stocked with gins and liquors and with cordials so long forgotten that most of his female guests were too young to know one from another.
              </p>
            </div>

            {/* Bottom Segmented Chapter Progress Indicator */}
            <div className="pt-12 pb-4 flex justify-center">
              <div className="h-1 w-48 rounded-full bg-slate-800 overflow-hidden flex">
                <div className="h-full w-1/3 bg-gradient-to-r from-violet-400 to-pink-400 rounded-full" />
              </div>
            </div>
          </main>
        </div>

        {/* ========================================================================= */}
        {/* 3. INTERACTIVE TEXT SELECTION POPOVER TOOLTIP                             */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {popoverPosition && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                position: 'fixed',
                top: `${popoverPosition.top}px`,
                left: `${popoverPosition.left}px`,
                transform: 'translateX(-50%)',
              }}
              className="z-50 font-sans"
            >
              <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-[#0e121e]/95 px-3 py-1.5 shadow-2xl backdrop-blur-xl text-xs font-semibold text-white">
                <button
                  type="button"
                  onClick={addHighlight}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full hover:bg-violet-600/30 text-violet-300 transition"
                >
                  <MdCreate className="h-3.5 w-3.5" />
                  <span>Highlight</span>
                </button>

                <button
                  type="button"
                  onClick={addNote}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full hover:bg-pink-600/30 text-pink-300 transition"
                >
                  <MdNote className="h-3.5 w-3.5" />
                  <span>Note</span>
                </button>

                <button
                  type="button"
                  onClick={lookupDictionary}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full hover:bg-amber-600/30 text-amber-300 transition"
                >
                  <MdTranslate className="h-3.5 w-3.5" />
                  <span>Define</span>
                </button>
              </div>

              {/* Dictionary definition popup if selected */}
              {dictionaryDefinition && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 max-w-xs rounded-xl border border-white/10 bg-[#0e121e] p-3 text-[11px] text-slate-300 shadow-2xl text-left font-sans"
                >
                  <p className="font-bold text-amber-300 mb-0.5">Dictionary Definition</p>
                  <p>{dictionaryDefinition}</p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
