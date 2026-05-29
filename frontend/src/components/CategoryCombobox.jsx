import { useState, useEffect, useMemo, useRef } from 'react'

const presetCategories = ['Programming', 'AI', 'Business', 'Self-Help', 'Design', 'Productivity']

const inputClass =
  'w-full rounded-xl border border-white/15 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition duration-300 placeholder:text-slate-400 focus:border-blue-300/55 focus:bg-slate-900/70 focus:shadow-[0_0_0_4px_rgba(98,108,255,0.2)]'

export default function CategoryCombobox({ value, onChange, placeholder = 'e.g. Programming, Finance, Fiction' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef(null)

  // Filter categories based on user input
  const filteredCategories = useMemo(() => {
    if (!value) return presetCategories
    const lower = value.toLowerCase()
    return presetCategories.filter((cat) => cat.toLowerCase().includes(lower))
  }, [value])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (category) => {
    onChange(category)
    setIsOpen(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIsOpen(true)
      setHighlightedIndex((prev) =>
        prev < filteredCategories.length - 1 ? prev + 1 : 0
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIsOpen(true)
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredCategories.length - 1
      )
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredCategories.length) {
        handleSelect(filteredCategories[highlightedIndex])
      } else {
        setIsOpen(false)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative w-full text-left">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setIsOpen(true)
            setHighlightedIndex(-1)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition duration-200"
        >
          <svg
            className={`h-5 w-5 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-white/15 bg-slate-950 p-2 shadow-2xl backdrop-blur-xl max-h-60 overflow-y-auto">
          {filteredCategories.length > 0 ? (
            filteredCategories.map((category, index) => (
              <button
                key={category}
                type="button"
                onClick={() => handleSelect(category)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full text-left rounded-lg px-3.5 py-2 text-sm transition duration-150 ${
                  index === highlightedIndex
                    ? 'bg-gradient-to-r from-blue-500/30 to-violet-500/30 text-white font-semibold'
                    : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                {category}
              </button>
            ))
          ) : (
            <div className="px-3.5 py-2 text-xs text-slate-400 italic">
              Type to add custom category: "{value}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}
