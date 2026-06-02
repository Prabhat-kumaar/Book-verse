import { motion } from 'framer-motion'
import Papa from 'papaparse'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MdAdd, MdCancel, MdCheckCircle, MdClose, MdHourglassEmpty, MdRefresh } from 'react-icons/md'
import apiClient from '../lib/apiClient'
import AdminSidebar from '../components/AdminSidebar'
import CategoryCombobox from '../components/CategoryCombobox'

const difficulties = ['Beginner', 'Intermediate', 'Advanced']
const maxBulkSlots = 5
const csvColumns = ['title', 'author', 'category', 'difficulty', 'language', 'tags', 'description']
const csvTemplateRows = [
  ['Think and Grow Rich', 'Napoleon Hill', 'Business', 'Beginner', 'English', 'wealth,mindset,success', 'A timeless classic about wealth creation'],
  ['The Art of War', 'Sun Tzu', 'Business', 'Intermediate', 'English', 'strategy,leadership', 'Ancient masterpiece on strategy and tactics'],
]

const initialForm = {
  title: '',
  author: '',
  category: 'Programming',
  description: '',
  fileUrl: '',
  thumbnailUrl: '',
  tags: '',
  language: '',
  difficulty: 'Beginner',
}

const initialBulkBook = {
  title: '',
  author: '',
  category: 'Programming',
  description: '',
  tags: '',
  language: 'English',
  difficulty: 'Beginner',
  bookFile: null,
  thumbnailFile: null,
}

const initialMediaMode = {
  thumbnail: 'url',
  file: 'url',
}

const urlPattern = /^https?:\/\/.+/i

const escapeCsvValue = (value) => {
  const text = String(value ?? '')
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const slugifyFilename = (value) => value
  .trim()
  .toLowerCase()
  .replace(/['’]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const fileKey = (fileName) => slugifyFilename(fileName.replace(/\.[^.]+$/, ''))

const getCsvTemplate = () => [
  csvColumns.join(','),
  ...csvTemplateRows.map((row) => row.map(escapeCsvValue).join(',')),
].join('\r\n')

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-200">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-rose-300">{error}</span> : null}
    </label>
  )
}

const inputClass =
  'w-full rounded-xl border border-white/15 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition duration-300 placeholder:text-slate-400 focus:border-blue-300/55 focus:bg-slate-900/70 focus:shadow-[0_0_0_4px_rgba(98,108,255,0.2)]'

const createBulkSlot = () => ({
  id: crypto.randomUUID(),
  ...initialBulkBook,
})

const getBookFileError = (bookFile) => {
  if (!bookFile) return 'Upload a PDF or EPUB file'

  const name = (bookFile.name || '').toLowerCase()
  const type = (bookFile.type || '').toLowerCase()
  const isPdf = type === 'application/pdf' || name.endsWith('.pdf')
  const isEpub = type === 'application/epub+zip' || name.endsWith('.epub')

  return isPdf || isEpub ? '' : 'Only PDF or EPUB files are allowed'
}

const getThumbnailFileError = (thumbnailFile) => {
  if (!thumbnailFile) return 'Upload a thumbnail image'
  return thumbnailFile.type.startsWith('image/') ? '' : 'Only image files are allowed'
}

const validateBookFields = ({ book, requireFiles = false }) => {
  const nextErrors = {}

  if (!book.title.trim()) nextErrors.title = 'Title is required'
  if (!book.author.trim()) nextErrors.author = 'Author is required'
  if (!book.category.trim()) nextErrors.category = 'Category is required'
  if (!book.description.trim() || book.description.trim().length < 20) {
    nextErrors.description = 'Description should be at least 20 characters'
  }
  if (!book.language.trim()) nextErrors.language = 'Language is required'
  if (!book.difficulty.trim()) nextErrors.difficulty = 'Difficulty is required'

  if (requireFiles) {
    const bookFileError = getBookFileError(book.bookFile)
    const thumbnailFileError = getThumbnailFileError(book.thumbnailFile)
    if (bookFileError) nextErrors.bookFile = bookFileError
    if (thumbnailFileError) nextErrors.thumbnailFile = thumbnailFileError
  }

  return nextErrors
}

function ProgressBadge({ state }) {
  const status = state?.status || 'pending'

  if (status === 'uploading') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-blue-300/30 bg-blue-500/15 px-3 py-1.5 text-xs font-semibold text-blue-100">
        <MdRefresh className="h-4 w-4 animate-spin" />
        Uploading
      </span>
    )
  }

  if (status === 'done') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-100">
        <MdCheckCircle className="h-4 w-4" />
        Done
      </span>
    )
  }

  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-rose-300/30 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-100">
        <MdCancel className="h-4 w-4" />
        Failed
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-300/20 bg-slate-500/10 px-3 py-1.5 text-xs font-semibold text-slate-300">
      <MdHourglassEmpty className="h-4 w-4" />
      Pending
    </span>
  )
}

export default function AdminAddBookPage() {
  const [activeTab, setActiveTab] = useState('single')
  const [form, setForm] = useState(initialForm)
  const [mediaMode, setMediaMode] = useState(initialMediaMode)
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [bookFile, setBookFile] = useState(null)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('')
  const [toast, setToast] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [thumbnailObjectUrl, setThumbnailObjectUrl] = useState('')
  const [bulkSlots, setBulkSlots] = useState(() => [createBulkSlot()])
  const [bulkErrors, setBulkErrors] = useState({})
  const [bulkProgress, setBulkProgress] = useState({})
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkSummary, setBulkSummary] = useState('')
  const [bulkUploading, setBulkUploading] = useState(false)
  const [csvBooks, setCsvBooks] = useState([])
  const [csvErrors, setCsvErrors] = useState({})
  const [csvStatus, setCsvStatus] = useState('')
  const [csvSummary, setCsvSummary] = useState('')
  const [csvProgress, setCsvProgress] = useState({})
  const [csvUploading, setCsvUploading] = useState(false)
  const epubInputRef = useRef(null)
  const thumbnailInputRef = useRef(null)

  const thumbnailPreview = useMemo(() => {
    if (mediaMode.thumbnail === 'url' && form.thumbnailUrl.trim()) {
      return form.thumbnailUrl.trim()
    }
    if (thumbnailFile) return thumbnailObjectUrl
    return ''
  }, [form.thumbnailUrl, mediaMode.thumbnail, thumbnailFile, thumbnailObjectUrl])

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailObjectUrl('')
      return
    }
    const objectUrl = URL.createObjectURL(thumbnailFile)
    setThumbnailObjectUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [thumbnailFile])

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  const onMediaModeChange = (type, mode) => {
    setMediaMode((prev) => ({ ...prev, [type]: mode }))
    setErrors((prev) => ({ ...prev, [type === 'thumbnail' ? 'thumbnailUrl' : 'fileUrl']: '' }))
  }

  const validate = () => {
    const nextErrors = validateBookFields({ book: { ...form, bookFile, thumbnailFile } })
    const fileUrl = form.fileUrl.trim()
    const thumbnailUrl = form.thumbnailUrl.trim()
    const hasFileUrl = Boolean(fileUrl)
    const hasThumbnailUrl = Boolean(thumbnailUrl)
    const hasBookFile = Boolean(bookFile)
    const hasThumbnailFile = Boolean(thumbnailFile)

    if (!hasFileUrl && !hasBookFile) {
      nextErrors.fileUrl = 'Provide a file URL or upload a PDF/EPUB file'
    } else if (hasFileUrl && !urlPattern.test(fileUrl)) {
      nextErrors.fileUrl = 'Enter a valid file URL'
    } else if (hasBookFile) {
      const bookFileError = getBookFileError(bookFile)
      if (bookFileError) nextErrors.fileUrl = bookFileError
    }

    if (!hasThumbnailUrl && !hasThumbnailFile) {
      nextErrors.thumbnailUrl = 'Provide a thumbnail URL or upload an image file'
    } else if (hasThumbnailUrl && !urlPattern.test(thumbnailUrl)) {
      nextErrors.thumbnailUrl = 'Enter a valid thumbnail URL'
    } else if (hasThumbnailFile) {
      const thumbnailFileError = getThumbnailFileError(thumbnailFile)
      if (thumbnailFileError) nextErrors.thumbnailUrl = thumbnailFileError
    }

    if (!form.tags.trim()) nextErrors.tags = 'Add at least one tag'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const buildBookFormData = (book) => {
    const formData = new FormData()
    formData.append('title', book.title.trim())
    formData.append('author', book.author.trim())
    formData.append('category', book.category.trim())
    formData.append('description', book.description.trim())
    formData.append('tags', JSON.stringify(
      book.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    ))
    formData.append('language', book.language.trim())
    formData.append('difficulty', book.difficulty.trim())

    if (book.thumbnailUrl?.trim()) {
      formData.append('thumbnail', book.thumbnailUrl.trim())
    } else if (book.thumbnailFile) {
      formData.append('thumbnail', book.thumbnailFile)
    }

    if (book.fileUrl?.trim()) {
      formData.append('fileUrl', book.fileUrl.trim())
    } else if (book.bookFile) {
      formData.append('file', book.bookFile)
    }

    return formData
  }

  const uploadBook = async ({ book, token }) => apiClient.post('/api/books', buildBookFormData(book), {
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const downloadCsvTemplate = () => {
    const blobUrl = URL.createObjectURL(new Blob([getCsvTemplate()], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = 'book-import-template.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(blobUrl)
  }

  const handleCsvUpload = (event) => {
    const file = event.target.files?.[0]
    setCsvStatus('')
    setCsvSummary('')
    setCsvErrors({})
    setCsvProgress({})

    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: ({ data, errors: parseErrors, meta }) => {
        if (parseErrors.length) {
          setCsvBooks([])
          setCsvStatus(parseErrors[0]?.message || 'Unable to parse CSV file.')
          return
        }

        const missingColumns = csvColumns.filter((column) => !meta.fields?.includes(column))
        if (missingColumns.length) {
          setCsvBooks([])
          setCsvStatus(`Missing columns: ${missingColumns.join(', ')}`)
          return
        }

        const nextBooks = data
          .filter((row) => csvColumns.some((column) => String(row[column] ?? '').trim()))
          .map((row) => ({
            id: crypto.randomUUID(),
            title: String(row.title ?? '').trim(),
            author: String(row.author ?? '').trim(),
            category: String(row.category ?? '').trim(),
            difficulty: String(row.difficulty ?? '').trim(),
            language: String(row.language ?? '').trim(),
            tags: String(row.tags ?? '').trim(),
            description: String(row.description ?? '').trim(),
            bookFile: null,
            thumbnailFile: null,
          }))

        setCsvBooks(nextBooks)
        setCsvStatus(nextBooks.length ? '' : 'No book rows found in the CSV file.')
      },
      error: (parseError) => {
        setCsvBooks([])
        setCsvStatus(parseError.message || 'Unable to parse CSV file.')
      },
    })
  }

  const matchCsvFiles = ({ files, key }) => {
    const fileMap = new Map(Array.from(files).map((file) => [fileKey(file.name), file]))

    setCsvBooks((prev) => prev.map((book) => ({
      ...book,
      [key]: fileMap.get(slugifyFilename(book.title)) || book[key],
    })))
    setCsvProgress((prev) => {
      const next = { ...prev }
      csvBooks.forEach((book) => {
        if (next[book.id]?.status === 'failed') next[book.id] = { status: 'pending', error: '' }
      })
      return next
    })
    setCsvStatus('')
    setCsvSummary('')
  }

  const validateCsvBooks = (booksToValidate) => {
    const nextErrors = {}

    booksToValidate.forEach((book) => {
      const bookErrors = validateBookFields({ book, requireFiles: true })
      const bookFileError = book.bookFile?.name?.toLowerCase().endsWith('.epub') ? '' : 'Match an EPUB file'
      if (bookFileError) bookErrors.bookFile = bookFileError
      if (Object.keys(bookErrors).length) nextErrors[book.id] = bookErrors
    })

    setCsvErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleCsvImport = async (event) => {
    event.preventDefault()
    setCsvStatus('')
    setCsvSummary('')

    const pendingBooks = csvBooks.filter((book) => csvProgress[book.id]?.status !== 'done')
    if (!pendingBooks.length) {
      setCsvSummary(`${csvBooks.length} uploaded, 0 failed`)
      return
    }

    if (!validateCsvBooks(pendingBooks)) {
      setCsvStatus('Please fix missing CSV details and file matches before importing.')
      return
    }

    try {
      setCsvUploading(true)
      const token = localStorage.getItem('authToken')
      if (!token) throw new Error('Please login first')

      let uploadedCount = csvBooks.filter((book) => csvProgress[book.id]?.status === 'done').length
      let failedCount = 0
      let attemptedCount = 0

      for (const book of pendingBooks) {
        attemptedCount += 1
        setCsvStatus(`Uploading ${attemptedCount} of ${pendingBooks.length}...`)
        setCsvProgress((prev) => ({ ...prev, [book.id]: { status: 'uploading', error: '' } }))

        try {
          await uploadBook({ book, token })
          uploadedCount += 1
          setCsvProgress((prev) => ({ ...prev, [book.id]: { status: 'done', error: '' } }))
        } catch (uploadError) {
          failedCount += 1
          const message = uploadError.response?.data?.message || uploadError.message || 'Failed to upload this book.'
          setCsvProgress((prev) => ({ ...prev, [book.id]: { status: 'failed', error: message } }))
        }
      }

      setCsvStatus('')
      setCsvSummary(`${uploadedCount} uploaded, ${failedCount} failed`)
      if (failedCount === 0) {
        setToast('All CSV books uploaded successfully.')
        setTimeout(() => setToast(''), 2600)
      }
    } catch (csvError) {
      setCsvStatus(csvError.message || 'Failed to start CSV import.')
    } finally {
      setCsvUploading(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('')
    setToast('')

    if (!validate()) {
      setStatus('Please fix the highlighted fields.')
      return
    }

    try {
      setSubmitting(true)
      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error('Please login first')
      }

      await uploadBook({ book: { ...form, bookFile, thumbnailFile }, token })

      setStatus('')
      setToast('Book uploaded successfully.')
      setForm(initialForm)
      setMediaMode(initialMediaMode)
      setThumbnailFile(null)
      setBookFile(null)
      setErrors({})
      setTimeout(() => setToast(''), 2600)
    } catch (submitError) {
      setStatus(submitError.response?.data?.message || submitError.message || 'Failed to upload book.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setForm(initialForm)
    setMediaMode(initialMediaMode)
    setThumbnailFile(null)
    setBookFile(null)
    setErrors({})
    setStatus('')
  }

  const updateBulkSlot = (id, key, value) => {
    setBulkSlots((prev) => prev.map((slot) => (slot.id === id ? { ...slot, [key]: value } : slot)))
    setBulkErrors((prev) => ({ ...prev, [id]: { ...prev[id], [key]: '' } }))
    setBulkProgress((prev) => {
      if (prev[id]?.status !== 'failed') return prev
      return { ...prev, [id]: { status: 'pending', error: '' } }
    })
  }

  const addBulkSlot = () => {
    setBulkSlots((prev) => (prev.length >= maxBulkSlots ? prev : [...prev, createBulkSlot()]))
    setBulkSummary('')
    setBulkStatus('')
  }

  const removeBulkSlot = (id) => {
    setBulkSlots((prev) => (prev.length === 1 ? prev : prev.filter((slot) => slot.id !== id)))
    setBulkErrors((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setBulkProgress((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const validateBulkSlots = (slotsToValidate) => {
    const nextErrors = {}

    slotsToValidate.forEach((slot) => {
      const slotErrors = validateBookFields({ book: slot, requireFiles: true })
      if (Object.keys(slotErrors).length) nextErrors[slot.id] = slotErrors
    })

    setBulkErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleBulkUpload = async (event) => {
    event.preventDefault()
    setBulkStatus('')
    setBulkSummary('')

    const pendingSlots = bulkSlots.filter((slot) => bulkProgress[slot.id]?.status !== 'done')
    if (!pendingSlots.length) {
      setBulkSummary(`${bulkSlots.length} uploaded, 0 failed`)
      return
    }

    if (!validateBulkSlots(pendingSlots)) {
      setBulkStatus('Please fix the highlighted fields before uploading.')
      return
    }

    try {
      setBulkUploading(true)
      const token = localStorage.getItem('authToken')
      if (!token) throw new Error('Please login first')

      let uploadedCount = bulkSlots.filter((slot) => bulkProgress[slot.id]?.status === 'done').length
      let failedCount = 0
      let attemptedCount = 0

      for (const slot of pendingSlots) {
        attemptedCount += 1
        setBulkStatus(`Uploading ${attemptedCount} of ${pendingSlots.length}...`)
        setBulkProgress((prev) => ({ ...prev, [slot.id]: { status: 'uploading', error: '' } }))

        try {
          await uploadBook({ book: slot, token })
          uploadedCount += 1
          setBulkProgress((prev) => ({ ...prev, [slot.id]: { status: 'done', error: '' } }))
        } catch (uploadError) {
          failedCount += 1
          const message = uploadError.response?.data?.message || uploadError.message || 'Failed to upload this book.'
          setBulkProgress((prev) => ({ ...prev, [slot.id]: { status: 'failed', error: message } }))
        }
      }

      setBulkStatus('')
      setBulkSummary(`${uploadedCount} uploaded, ${failedCount} failed`)
      if (failedCount === 0) {
        setToast('All books uploaded successfully.')
        setTimeout(() => setToast(''), 2600)
      }
    } catch (bulkError) {
      setBulkStatus(bulkError.message || 'Failed to start bulk upload.')
    } finally {
      setBulkUploading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#050914] text-slate-100">
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-blue-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-violet-500/20 blur-[130px]" />

      {toast ? (
        <div className="fixed right-4 top-4 z-[80] rounded-xl border border-emerald-300/40 bg-emerald-500/20 px-4 py-3 text-sm font-semibold text-emerald-100 shadow-[0_12px_30px_rgba(16,185,129,0.25)] backdrop-blur-xl">
          {toast}
        </div>
      ) : null}

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 gap-4 p-4 lg:grid-cols-[280px_1fr] lg:gap-6 lg:p-6">
        <AdminSidebar />

        <main className="rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.08] to-white/[0.03] p-5 backdrop-blur-2xl lg:p-8">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100/80">Admin Tools</p>
            <h2 className="mt-1 text-3xl font-black text-white sm:text-4xl">Add New Book</h2>
            <p className="mt-2 text-sm text-slate-300">Publish new reading content with complete metadata and premium catalog quality.</p>
          </div>

          <div className="mb-5 inline-flex rounded-xl border border-white/15 bg-white/[0.04] p-1">
            {[
              ['single', 'Single Book'],
              ['bulk', 'Bulk Upload'],
              ['csv', 'CSV Import'],
            ].map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-blue-500/40 to-violet-500/40 text-white shadow-[0_8px_24px_rgba(87,104,255,0.18)]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'single' ? (
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-2xl border border-white/15 bg-white/[0.05] p-5 shadow-[0_18px_55px_rgba(7,10,32,0.35)] backdrop-blur-xl"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Title" error={errors.title}>
                  <input type="text" value={form.title} onChange={(e) => onChange('title', e.target.value)} placeholder="The Pragmatic Programmer" className={inputClass} />
                </Field>

                <Field label="Author" error={errors.author}>
                  <input type="text" value={form.author} onChange={(e) => onChange('author', e.target.value)} placeholder="Andrew Hunt" className={inputClass} />
                </Field>

                <Field label="Category" error={errors.category}>
                  <CategoryCombobox value={form.category} onChange={(val) => onChange('category', val)} placeholder="e.g. Programming, Finance, Fiction" />
                </Field>

                <Field label="Difficulty" error={errors.difficulty}>
                  <select value={form.difficulty} onChange={(e) => onChange('difficulty', e.target.value)} className={inputClass}>
                    {difficulties.map((difficulty) => (
                      <option key={difficulty} value={difficulty} className="bg-slate-900">
                        {difficulty}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Book File (PDF/EPUB)" error={errors.fileUrl}>
                  <div className="rounded-xl border border-white/15 bg-slate-950/35 p-3">
                    <div className="mb-3 inline-flex rounded-lg border border-white/15 bg-white/[0.04] p-1">
                      <button type="button" onClick={() => onMediaModeChange('file', 'url')} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${mediaMode.file === 'url' ? 'bg-gradient-to-r from-blue-500/40 to-violet-500/40 text-white' : 'text-slate-300 hover:text-white'}`}>
                        Use URL
                      </button>
                      <button type="button" onClick={() => onMediaModeChange('file', 'file')} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${mediaMode.file === 'file' ? 'bg-gradient-to-r from-blue-500/40 to-violet-500/40 text-white' : 'text-slate-300 hover:text-white'}`}>
                        Upload File
                      </button>
                    </div>

                    {mediaMode.file === 'url' ? (
                      <input type="url" value={form.fileUrl} onChange={(e) => onChange('fileUrl', e.target.value)} placeholder="https://example.com/book.epub" className={inputClass} />
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept=".pdf,.epub,application/pdf,application/epub+zip"
                          onChange={(e) => {
                            setBookFile(e.target.files?.[0] || null)
                            setErrors((prev) => ({ ...prev, fileUrl: '' }))
                          }}
                          className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-blue-500/30 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-100`}
                        />
                        <p className="mt-2 text-xs text-slate-300">{bookFile ? `Selected: ${bookFile.name}` : 'No file selected'}</p>
                      </div>
                    )}
                  </div>
                </Field>

                <Field label="Thumbnail Source" error={errors.thumbnailUrl}>
                  <div className="rounded-xl border border-white/15 bg-slate-950/35 p-3">
                    <div className="mb-3 inline-flex rounded-lg border border-white/15 bg-white/[0.04] p-1">
                      <button type="button" onClick={() => onMediaModeChange('thumbnail', 'url')} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${mediaMode.thumbnail === 'url' ? 'bg-gradient-to-r from-blue-500/40 to-violet-500/40 text-white' : 'text-slate-300 hover:text-white'}`}>
                        Use URL
                      </button>
                      <button type="button" onClick={() => onMediaModeChange('thumbnail', 'file')} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${mediaMode.thumbnail === 'file' ? 'bg-gradient-to-r from-blue-500/40 to-violet-500/40 text-white' : 'text-slate-300 hover:text-white'}`}>
                        Upload File
                      </button>
                    </div>

                    {mediaMode.thumbnail === 'url' ? (
                      <input type="url" value={form.thumbnailUrl} onChange={(e) => onChange('thumbnailUrl', e.target.value)} placeholder="https://example.com/thumb.jpg" className={inputClass} />
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            setThumbnailFile(e.target.files?.[0] || null)
                            setErrors((prev) => ({ ...prev, thumbnailUrl: '' }))
                          }}
                          className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-blue-500/30 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-100`}
                        />
                        <p className="mt-2 text-xs text-slate-300">{thumbnailFile ? `Selected: ${thumbnailFile.name}` : 'No file selected'}</p>
                      </div>
                    )}

                    {thumbnailPreview ? (
                      <div className="mt-3 overflow-hidden rounded-xl border border-white/15 bg-slate-900/40">
                        <img loading="lazy" src={thumbnailPreview} alt="Thumbnail preview" className="h-32 w-full object-cover" />
                      </div>
                    ) : null}
                  </div>
                </Field>

                <Field label="Tags" error={errors.tags}>
                  <input type="text" value={form.tags} onChange={(e) => onChange('tags', e.target.value)} placeholder="programming, software, clean-code" className={inputClass} />
                </Field>

                <Field label="Language" error={errors.language}>
                  <input type="text" value={form.language} onChange={(e) => onChange('language', e.target.value)} placeholder="English" className={inputClass} />
                </Field>
              </div>

              <div className="mt-5">
                <Field label="Description" error={errors.description}>
                  <textarea value={form.description} onChange={(e) => onChange('description', e.target.value)} rows={5} placeholder="Write a clear and engaging description of this book..." className={`${inputClass} resize-none`} />
                </Field>
              </div>

              {status ? <p className="mt-4 text-sm text-rose-300">{status}</p> : null}

              <div className="mt-6 flex flex-wrap gap-3">
                <motion.button whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={submitting} className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_34px_rgba(87,104,255,0.45)] transition hover:shadow-[0_0_30px_rgba(112,105,255,0.55)] disabled:cursor-not-allowed disabled:opacity-60">
                  {submitting ? 'Uploading...' : 'Upload Book'}
                </motion.button>

                <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} type="button" onClick={handleReset} className="rounded-xl border border-white/20 bg-white/[0.07] px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-blue-300/35 hover:bg-white/[0.12]">
                  Reset
                </motion.button>
              </div>
            </motion.form>
          ) : activeTab === 'bulk' ? (
            <motion.form
              onSubmit={handleBulkUpload}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-5"
            >
              {bulkSlots.map((slot, index) => {
                const slotErrors = bulkErrors[slot.id] || {}
                const progress = bulkProgress[slot.id] || { status: 'pending' }
                const isDone = progress.status === 'done'

                return (
                  <section key={slot.id} className="rounded-2xl border border-white/15 bg-white/[0.05] p-5 shadow-[0_18px_55px_rgba(7,10,32,0.28)] backdrop-blur-xl">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/70">Book Slot {index + 1}</p>
                        <h3 className="mt-1 text-xl font-black text-white">{slot.title.trim() || 'Untitled book'}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <ProgressBadge state={progress} />
                        <button
                          type="button"
                          onClick={() => removeBulkSlot(slot.id)}
                          disabled={bulkSlots.length === 1 || bulkUploading}
                          aria-label={`Remove book slot ${index + 1}`}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-slate-200 transition hover:border-rose-300/40 hover:bg-rose-500/15 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <MdClose className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    <div className={`grid gap-5 md:grid-cols-2 ${isDone ? 'opacity-70' : ''}`}>
                      <Field label="Title" error={slotErrors.title}>
                        <input type="text" value={slot.title} onChange={(e) => updateBulkSlot(slot.id, 'title', e.target.value)} disabled={bulkUploading || isDone} placeholder="Clean Architecture" className={inputClass} />
                      </Field>

                      <Field label="Author" error={slotErrors.author}>
                        <input type="text" value={slot.author} onChange={(e) => updateBulkSlot(slot.id, 'author', e.target.value)} disabled={bulkUploading || isDone} placeholder="Robert C. Martin" className={inputClass} />
                      </Field>

                      <Field label="Category" error={slotErrors.category}>
                        <CategoryCombobox value={slot.category} onChange={(val) => updateBulkSlot(slot.id, 'category', val)} placeholder="e.g. Programming, Finance, Fiction" />
                      </Field>

                      <Field label="Difficulty" error={slotErrors.difficulty}>
                        <select value={slot.difficulty} onChange={(e) => updateBulkSlot(slot.id, 'difficulty', e.target.value)} disabled={bulkUploading || isDone} className={inputClass}>
                          {difficulties.map((difficulty) => (
                            <option key={difficulty} value={difficulty} className="bg-slate-900">
                              {difficulty}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Book File (PDF/EPUB)" error={slotErrors.bookFile}>
                        <div className="rounded-xl border border-white/15 bg-slate-950/35 p-3">
                          <input
                            type="file"
                            accept=".pdf,.epub,application/pdf,application/epub+zip"
                            disabled={bulkUploading || isDone}
                            onChange={(e) => updateBulkSlot(slot.id, 'bookFile', e.target.files?.[0] || null)}
                            className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-blue-500/30 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-100`}
                          />
                          <p className="mt-2 text-xs text-slate-300">{slot.bookFile ? `Selected: ${slot.bookFile.name}` : 'No file selected'}</p>
                        </div>
                      </Field>

                      <Field label="Thumbnail File" error={slotErrors.thumbnailFile}>
                        <div className="rounded-xl border border-white/15 bg-slate-950/35 p-3">
                          <input
                            type="file"
                            accept="image/*"
                            disabled={bulkUploading || isDone}
                            onChange={(e) => updateBulkSlot(slot.id, 'thumbnailFile', e.target.files?.[0] || null)}
                            className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-blue-500/30 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-100`}
                          />
                          <p className="mt-2 text-xs text-slate-300">{slot.thumbnailFile ? `Selected: ${slot.thumbnailFile.name}` : 'No file selected'}</p>
                        </div>
                      </Field>

                      <Field label="Tags" error={slotErrors.tags}>
                        <input type="text" value={slot.tags} onChange={(e) => updateBulkSlot(slot.id, 'tags', e.target.value)} disabled={bulkUploading || isDone} placeholder="software, engineering, systems" className={inputClass} />
                      </Field>

                      <Field label="Language" error={slotErrors.language}>
                        <input type="text" value={slot.language} onChange={(e) => updateBulkSlot(slot.id, 'language', e.target.value)} disabled={bulkUploading || isDone} placeholder="English" className={inputClass} />
                      </Field>
                    </div>

                    <div className={`mt-5 ${isDone ? 'opacity-70' : ''}`}>
                      <Field label="Description" error={slotErrors.description}>
                        <textarea value={slot.description} onChange={(e) => updateBulkSlot(slot.id, 'description', e.target.value)} disabled={bulkUploading || isDone} rows={4} placeholder="Write a clear and engaging description of this book..." className={`${inputClass} resize-none`} />
                      </Field>
                    </div>

                    {progress.status === 'failed' && progress.error ? (
                      <p className="mt-4 rounded-xl border border-rose-300/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{progress.error}</p>
                    ) : null}
                  </section>
                )
              })}

              {bulkStatus ? <p className="text-sm text-rose-300">{bulkStatus}</p> : null}
              {bulkSummary ? <p className="text-sm font-semibold text-emerald-300">{bulkSummary}</p> : null}

              <div className="flex flex-wrap gap-3">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={addBulkSlot}
                  disabled={bulkSlots.length >= maxBulkSlots || bulkUploading}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.07] px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-blue-300/35 hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <MdAdd className="h-5 w-5" />
                  Add Another Book
                </motion.button>

                <motion.button
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={bulkUploading}
                  className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_34px_rgba(87,104,255,0.45)] transition hover:shadow-[0_0_30px_rgba(112,105,255,0.55)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {bulkUploading ? 'Uploading Books...' : 'Upload All Books'}
                </motion.button>
              </div>
            </motion.form>
          ) : (
            <motion.form
              onSubmit={handleCsvImport}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-5"
            >
              <section className="rounded-2xl border border-white/15 bg-white/[0.05] p-5 shadow-[0_18px_55px_rgba(7,10,32,0.28)] backdrop-blur-xl">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                  <Field label="CSV File" error={csvStatus && !csvBooks.length ? csvStatus : ''}>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      disabled={csvUploading}
                      onChange={handleCsvUpload}
                      className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-blue-500/30 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-100`}
                    />
                  </Field>

                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={downloadCsvTemplate}
                    disabled={csvUploading}
                    className="rounded-xl border border-white/20 bg-white/[0.07] px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-blue-300/35 hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Download CSV Template
                  </motion.button>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <input
                    ref={epubInputRef}
                    type="file"
                    accept=".epub,application/epub+zip"
                    multiple
                    disabled={csvUploading || !csvBooks.length}
                    onChange={(e) => matchCsvFiles({ files: e.target.files || [], key: 'bookFile' })}
                    className="hidden"
                  />
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={csvUploading || !csvBooks.length}
                    onChange={(e) => matchCsvFiles({ files: e.target.files || [], key: 'thumbnailFile' })}
                    className="hidden"
                  />

                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => epubInputRef.current?.click()}
                    disabled={csvUploading || !csvBooks.length}
                    className="rounded-xl border border-white/20 bg-white/[0.07] px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-blue-300/35 hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Select EPUB Files
                  </motion.button>

                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => thumbnailInputRef.current?.click()}
                    disabled={csvUploading || !csvBooks.length}
                    className="rounded-xl border border-white/20 bg-white/[0.07] px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-blue-300/35 hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Select Thumbnail Files
                  </motion.button>
                </div>
              </section>

              {csvBooks.length ? (
                <section className="rounded-2xl border border-white/15 bg-white/[0.05] p-5 shadow-[0_18px_55px_rgba(7,10,32,0.28)] backdrop-blur-xl">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/70">CSV Preview</p>
                      <h3 className="mt-1 text-xl font-black text-white">{csvBooks.length} books ready to review</h3>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1180px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-400">
                          <th className="px-3 py-3 font-semibold uppercase tracking-wider">Book</th>
                          <th className="px-3 py-3 font-semibold uppercase tracking-wider">Category</th>
                          <th className="px-3 py-3 font-semibold uppercase tracking-wider">Difficulty</th>
                          <th className="px-3 py-3 font-semibold uppercase tracking-wider">Language</th>
                          <th className="px-3 py-3 font-semibold uppercase tracking-wider">Tags</th>
                          <th className="px-3 py-3 font-semibold uppercase tracking-wider">Description</th>
                          <th className="px-3 py-3 font-semibold uppercase tracking-wider">Expected File</th>
                          <th className="px-3 py-3 font-semibold uppercase tracking-wider">EPUB</th>
                          <th className="px-3 py-3 font-semibold uppercase tracking-wider">Thumbnail</th>
                          <th className="px-3 py-3 font-semibold uppercase tracking-wider">Progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvBooks.map((book) => {
                          const bookErrors = csvErrors[book.id] || {}
                          const progress = csvProgress[book.id] || { status: 'pending' }
                          const expectedName = `${slugifyFilename(book.title)}.epub`

                          return (
                            <tr key={book.id} className="border-b border-white/5 align-top">
                              <td className="px-3 py-4">
                                <p className="font-bold text-white">{book.title || 'Missing title'}</p>
                                <p className="mt-1 text-slate-400">{book.author || 'Missing author'}</p>
                                {bookErrors.title || bookErrors.author ? (
                                  <p className="mt-1 text-rose-300">{bookErrors.title || bookErrors.author}</p>
                                ) : null}
                              </td>
                              <td className="px-3 py-4 text-slate-200">
                                {book.category || 'Missing'}
                                {bookErrors.category ? <p className="mt-1 text-rose-300">{bookErrors.category}</p> : null}
                              </td>
                              <td className="px-3 py-4 text-slate-200">
                                {book.difficulty || 'Missing'}
                                {bookErrors.difficulty ? <p className="mt-1 text-rose-300">{bookErrors.difficulty}</p> : null}
                              </td>
                              <td className="px-3 py-4 text-slate-200">
                                {book.language || 'Missing'}
                                {bookErrors.language ? <p className="mt-1 text-rose-300">{bookErrors.language}</p> : null}
                              </td>
                              <td className="px-3 py-4 text-slate-300">{book.tags || 'Missing'}</td>
                              <td className="max-w-[260px] px-3 py-4 text-slate-300">
                                <p className="line-clamp-3">{book.description || 'Missing description'}</p>
                                {bookErrors.description ? <p className="mt-1 text-rose-300">{bookErrors.description}</p> : null}
                              </td>
                              <td className="px-3 py-4 font-mono text-slate-300">{expectedName}</td>
                              <td className="px-3 py-4">
                                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-semibold ${book.bookFile ? 'border-emerald-300/30 bg-emerald-500/15 text-emerald-100' : 'border-rose-300/30 bg-rose-500/15 text-rose-100'}`}>
                                  {book.bookFile ? <MdCheckCircle className="h-4 w-4" /> : <MdCancel className="h-4 w-4" />}
                                  {book.bookFile ? book.bookFile.name : 'Not matched'}
                                </span>
                              </td>
                              <td className="px-3 py-4">
                                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-semibold ${book.thumbnailFile ? 'border-emerald-300/30 bg-emerald-500/15 text-emerald-100' : 'border-rose-300/30 bg-rose-500/15 text-rose-100'}`}>
                                  {book.thumbnailFile ? <MdCheckCircle className="h-4 w-4" /> : <MdCancel className="h-4 w-4" />}
                                  {book.thumbnailFile ? book.thumbnailFile.name : 'Not matched'}
                                </span>
                              </td>
                              <td className="px-3 py-4">
                                <ProgressBadge state={progress} />
                                {progress.status === 'failed' && progress.error ? (
                                  <p className="mt-2 text-rose-300">{progress.error}</p>
                                ) : null}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              {csvStatus && csvBooks.length ? <p className="text-sm text-rose-300">{csvStatus}</p> : null}
              {csvSummary ? <p className="text-sm font-semibold text-emerald-300">{csvSummary}</p> : null}

              <div className="flex flex-wrap gap-3">
                <motion.button
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={csvUploading || !csvBooks.length}
                  className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_34px_rgba(87,104,255,0.45)] transition hover:shadow-[0_0_30px_rgba(112,105,255,0.55)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {csvUploading ? 'Importing Books...' : 'Import All Books'}
                </motion.button>
              </div>
            </motion.form>
          )}
        </main>
      </div>
    </div>
  )
}
