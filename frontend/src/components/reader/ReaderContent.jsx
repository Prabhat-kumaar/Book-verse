import React, { useRef, useState } from 'react'

export default function ReaderContent({
  chapterNumber = 1,
  chapterTitle = '',
  paragraphs = [],
  pullQuote = '',
  fontSize = 18,
}) {
  const contentRef = useRef(null)

  // Determine where to place the pull-quote: after paragraph 1 or 2
  const pullQuoteInsertIndex = Math.min(2, Math.max(1, Math.floor(paragraphs.length / 3)))

  return (
    <article
      ref={contentRef}
      className="mx-auto max-w-[760px] px-6 pt-28 pb-32 transition-all duration-200"
      style={{ fontSize: `${fontSize}px` }}
    >
      {/* Chapter Title & Header */}
      <header className="mb-14 text-center">
        <h1
          className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight"
          style={{ color: 'var(--reader-heading)' }}
        >
          {chapterTitle || `Chapter ${chapterNumber}`}
        </h1>

        <div className="mt-3 flex items-center justify-center gap-3">
          <span className="h-px w-10 bg-current opacity-20" />
          <span
            className="text-[11px] font-bold tracking-[0.25em] uppercase"
            style={{ color: 'var(--reader-accent)' }}
          >
            CHAPTER {chapterNumber}
          </span>
          <span className="h-px w-10 bg-current opacity-20" />
        </div>
      </header>

      {/* Paragraphs and Pull-Quote Rendering */}
      <div className="reader-prose-body space-y-6">
        {paragraphs.length === 0 ? (
          <p className="text-center italic opacity-60">No text content available in this chapter.</p>
        ) : (
          paragraphs.map((paragraph, index) => {
            const isFirstParagraph = index === 0
            const shouldRenderPullQuote = index === pullQuoteInsertIndex && pullQuote

            return (
              <React.Fragment key={index}>
                <p
                  className={`leading-[1.85] text-justify ${
                    isFirstParagraph ? 'reader-drop-cap' : ''
                  }`}
                  style={{ color: 'var(--reader-text)' }}
                >
                  {paragraph}
                </p>

                {shouldRenderPullQuote && (
                  <aside className="reader-pull-quote my-8">
                    <p className="font-serif text-lg leading-relaxed">
                      "{pullQuote}"
                    </p>
                  </aside>
                )}
              </React.Fragment>
            )
          })
        )}
      </div>
    </article>
  )
}
