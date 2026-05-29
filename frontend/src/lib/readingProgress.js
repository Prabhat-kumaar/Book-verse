export function clampNumber(value, min, max) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return min
  return Math.min(max, Math.max(min, numeric))
}

export function computeProgress(input = {}) {
  const safeTotalPages = Math.max(1, Math.floor(Number(input.totalPages) || 1))
  const safeCurrentPage = clampNumber(Math.floor(Number(input.currentPage) || 1), 1, safeTotalPages)
  const pageBasedPercent = (safeCurrentPage / safeTotalPages) * 100
  const rawPercent = Number.isFinite(Number(input.progressPercentage ?? input.percentage))
    ? Number(input.progressPercentage ?? input.percentage)
    : pageBasedPercent
  const safeProgress = clampNumber(Math.round(rawPercent), 0, 100)
  return {
    currentPage: safeCurrentPage,
    totalPages: safeTotalPages,
    progressPercentage: safeProgress,
  }
}

export function getProgressBookId(item) {
  return item?.bookId || item?.book?._id || item?.book || ''
}

export function getEpubProgressStorageKey({ bookId, fileUrl }) {
  return `epubProgress:${bookId || fileUrl || ''}`
}

export function getLegacyEpubProgressStorageKeys({ bookId, fileUrl }) {
  return [
    getEpubProgressStorageKey({ bookId, fileUrl }),
    `progress-${bookId || ''}`,
  ]
}

export function getEpubSavedCfi({ bookId, fileUrl }) {
  try {
    const keys = getLegacyEpubProgressStorageKeys({ bookId, fileUrl })
    for (const key of keys) {
      if (!key) continue
      const value = localStorage.getItem(key)
      if (value) return value
    }
    return ''
  } catch {
    return ''
  }
}

export function setEpubSavedCfi({ bookId, fileUrl, cfi }) {
  const safeCfi = typeof cfi === 'string' ? cfi.trim() : ''
  if (!safeCfi) return
  const key = getEpubProgressStorageKey({ bookId, fileUrl })
  if (!key) return
  try {
    localStorage.setItem(key, safeCfi)
  } catch {
    // no-op
  }
}

export function normalizeProgressItem(item) {
  const progress = computeProgress({
    currentPage: item?.currentPage ?? item?.page,
    totalPages: item?.totalPages,
    progressPercentage: item?.progressPercentage ?? item?.percentage,
  })
  const bookId = getProgressBookId(item)
  const fileUrl = item?.book?.fileUrl || item?.book?.pdf || ''
  const resumeCfi = item?.locationCfi || item?.epubCfi || item?.cfi || getEpubSavedCfi({ bookId, fileUrl })
  const completed = typeof item?.completed === 'boolean' ? item.completed : progress.progressPercentage >= 95
  return {
    ...item,
    ...progress,
    page: progress.currentPage,
    bookId,
    resumeCfi,
    locationCfi: resumeCfi,
    epubCfi: resumeCfi,
    cfi: resumeCfi,
    percentage: progress.progressPercentage,
    progressPercentage: progress.progressPercentage,
    percent: progress.progressPercentage,
    readingTime: Math.max(0, Number(item?.readingTime) || 0),
    completed,
    fileType: item?.fileType || item?.book?.fileType || 'pdf',
    lastReadAt: item?.lastReadAt || item?.updatedAt || item?.createdAt || null,
  }
}

export function toProgressView(item) {
  const normalized = normalizeProgressItem(item)
  return {
    ...normalized,
    cfi: normalized.resumeCfi || '',
  }
}

export function buildProgressMap(progressItems = []) {
  const map = new Map()
  progressItems.forEach((item) => {
    const bookId = getProgressBookId(item)
    if (!bookId) return
    map.set(bookId, toProgressView(item))
  })
  return map
}

export function getProgressForBook(progressItems = [], bookId = '') {
  if (!bookId) return null
  const found = progressItems.find((item) => getProgressBookId(item) === bookId)
  return found ? toProgressView(found) : null
}
