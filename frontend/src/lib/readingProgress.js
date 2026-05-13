export function clampNumber(value, min, max) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return min
  return Math.min(max, Math.max(min, numeric))
}

export function computeProgress(input = {}) {
  const safeTotalPages = Math.max(1, Math.floor(Number(input.totalPages) || 1))
  const safeCurrentPage = clampNumber(Math.floor(Number(input.currentPage) || 1), 1, safeTotalPages)
  const pageBasedPercent = (safeCurrentPage / safeTotalPages) * 100
  const rawPercent = Number.isFinite(Number(input.progressPercentage))
    ? Number(input.progressPercentage)
    : pageBasedPercent
  const safeProgress = clampNumber(Math.round(rawPercent), 0, 100)
  return {
    currentPage: safeCurrentPage,
    totalPages: safeTotalPages,
    progressPercentage: safeProgress,
  }
}

export function getProgressBookId(item) {
  return item?.book?._id || item?.book || ''
}

export function getEpubProgressStorageKey({ bookId, fileUrl }) {
  return `epubProgress:${bookId || fileUrl || ''}`
}

export function getEpubSavedCfi({ bookId, fileUrl }) {
  try {
    return localStorage.getItem(getEpubProgressStorageKey({ bookId, fileUrl })) || ''
  } catch {
    return ''
  }
}

export function normalizeProgressItem(item) {
  const progress = computeProgress({
    currentPage: item?.currentPage ?? item?.page,
    totalPages: item?.totalPages,
    progressPercentage: item?.progressPercentage,
  })
  const bookId = getProgressBookId(item)
  const fileUrl = item?.book?.fileUrl || item?.book?.pdf || ''
  const resumeCfi = item?.locationCfi || item?.cfi || getEpubSavedCfi({ bookId, fileUrl })
  return {
    ...item,
    ...progress,
    page: progress.currentPage,
    bookId,
    resumeCfi,
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
