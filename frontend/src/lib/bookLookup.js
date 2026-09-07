import apiClient from './apiClient'

// Client-side category detector fallback
export const detectBookCategory = (title = '', subjects = []) => {
  const text = (title + ' ' + (Array.isArray(subjects) ? subjects.join(' ') : '')).toLowerCase()
  if (/code|programming|developer|software|algorithm|javascript|python|computer science|web dev|react|backend|frontend/i.test(text)) return 'Programming'
  if (/artificial intelligence|\bai\b|machine learning|deep learning|neural network|llm|nlp|data science/i.test(text)) return 'AI'
  if (/business|finance|economics|investing|startup|wealth|money|marketing|sales|entrepreneur/i.test(text)) return 'Business'
  if (/productivity|habit|habits|deep work|focus|time management|discipline|atomic|personal growth|self-help|mindset|psychology|success|motivation|leadership/i.test(text)) return 'Self-Help'
  if (/sci-fi|science fiction|space|cyberpunk|dystopia|future|fantasy|robot|alien/i.test(text)) return 'Science Fiction'
  if (/philosophy|stoic|stoicism|ethics|logic|meditation|ancient wisdom/i.test(text)) return 'Philosophy'
  if (/history|biography|memoir|civilization|world war|historical/i.test(text)) return 'History'
  if (/design|typography|ux|ui|graphic design|architecture|art/i.test(text)) return 'Design'
  return 'Fiction'
}

/**
 * Perform a smart book lookup by ISBN or Title.
 * Queries backend first, with direct OpenLibrary fallback.
 */
export async function lookupBookMetadata(query) {
  const cleanQuery = (query || '').trim()
  if (!cleanQuery) throw new Error('Please provide an ISBN or book title to search.')

  // 1. Try Backend API
  try {
    const res = await apiClient.get('/api/books/lookup', {
      params: { query: cleanQuery },
      dedupe: false,
    })
    if (res?.data?.success && res.data.data) {
      return res.data.data
    }
  } catch (backendError) {
    // If backend returned 404 or had an error, proceed to direct client-side fallback
  }

  // 2. Client-side OpenLibrary Fallback
  const cleanIsbn = cleanQuery.replace(/[^0-9X]/gi, '')
  const isIsbn = cleanIsbn.length === 10 || cleanIsbn.length === 13

  if (isIsbn) {
    try {
      const olRes = await fetch(`https://openlibrary.org/isbn/${cleanIsbn}.json`, {
        headers: { 'User-Agent': 'ReadifyApp/1.0' },
      })
      if (olRes.ok) {
        const olJson = await olRes.json()
        let authorName = 'Unknown Author'
        if (olJson.authors?.[0]?.key) {
          try {
            const authorRes = await fetch(`https://openlibrary.org${olJson.authors[0].key}.json`, {
              headers: { 'User-Agent': 'ReadifyApp/1.0' },
            })
            if (authorRes.ok) {
              const aJson = await authorRes.json()
              authorName = aJson.name || authorName
            }
          } catch (e) {}
        }

        let description = ''
        let subjects = []
        if (olJson.works?.[0]?.key) {
          try {
            const wRes = await fetch(`https://openlibrary.org${olJson.works[0].key}.json`, {
              headers: { 'User-Agent': 'ReadifyApp/1.0' },
            })
            if (wRes.ok) {
              const wJson = await wRes.json()
              description = typeof wJson.description === 'string' ? wJson.description : wJson.description?.value || ''
              subjects = Array.isArray(wJson.subjects) ? wJson.subjects : []
            }
          } catch (e) {}
        }

        const coverUrl = olJson.covers?.[0]
          ? `https://covers.openlibrary.org/b/id/${olJson.covers[0]}-L.jpg`
          : `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`

        const title = olJson.title + (olJson.subtitle ? `: ${olJson.subtitle}` : '')
        const category = detectBookCategory(title, subjects)

        return {
          title,
          author: authorName,
          category,
          difficulty: 'Beginner',
          language: 'English',
          thumbnailUrl: coverUrl,
          description: description || `Published by ${olJson.publishers?.[0] || 'Unknown'}.`,
          tags: subjects.slice(0, 4).join(', ') || category.toLowerCase(),
          isbn: cleanIsbn,
        }
      }
    } catch (olErr) {}
  }

  // 3. OpenLibrary Search fallback
  try {
    const searchRes = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(cleanQuery)}&limit=1`, {
      headers: { 'User-Agent': 'ReadifyApp/1.0' },
    })
    if (searchRes.ok) {
      const sJson = await searchRes.json()
      const doc = sJson.docs?.[0]
      if (doc) {
        const title = doc.title || cleanQuery
        const author = doc.author_name?.join(', ') || 'Unknown Author'
        const coverUrl = doc.cover_i
          ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
          : doc.isbn?.[0]
          ? `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-L.jpg`
          : ''
        const subjects = Array.isArray(doc.subject) ? doc.subject : []
        const category = detectBookCategory(title, subjects)

        return {
          title,
          author,
          category,
          difficulty: 'Beginner',
          language: 'English',
          thumbnailUrl: coverUrl,
          description: `Written by ${author}. First published in ${doc.first_publish_year || 'recent years'}.`,
          tags: subjects.slice(0, 4).join(', ') || category.toLowerCase(),
          isbn: doc.isbn?.[0] || '',
        }
      }
    }
  } catch (err) {}

  throw new Error(`No book metadata found for "${cleanQuery}". You can enter details manually.`)
}
