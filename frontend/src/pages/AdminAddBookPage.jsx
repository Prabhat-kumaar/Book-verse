import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Papa from 'papaparse'
import {
  MdAdd,
  MdCancel,
  MdCheckCircle,
  MdClose,
  MdHourglassEmpty,
  MdRefresh,
  MdCloudUpload,
  MdStorage,
  MdSensors,
  MdDns,
  MdAutoAwesome,
  MdInfoOutline,
  MdFileDownload,
  MdDeleteOutline,
  MdCheck,
} from 'react-icons/md'
import apiClient from '../lib/apiClient'
import AdminSidebar from '../components/AdminSidebar'
import CategoryCombobox from '../components/CategoryCombobox'
import SEO from '../components/SEO'

const isDev = import.meta.env.DEV
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
  language: 'English',
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

const slugifyFilename = (value) =>
  value
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
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">{label}</span>
      {children}
      {error ? <span className="mt-1.5 block text-xs font-medium text-rose-400">{error}</span> : null}
    </label>
  )
}

const inputClass =
  'w-full rounded-xl border border-white/10 bg-[#080c18]/90 px-4 py-3 text-sm text-white outline-none transition duration-200 placeholder:text-slate-500 focus:border-purple-500/50 focus:bg-[#0c1224] focus:shadow-[0_0_15px_rgba(168,85,247,0.15)]'

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
  if (!book.description.trim() || book.description.trim().length < 15) {
    nextErrors.description = 'Description should be at least 15 characters'
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
      <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-300">
        <MdRefresh className="h-3.5 w-3.5 animate-spin" />
        Uploading
      </span>
    )
  }

  if (status === 'done') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
        <MdCheckCircle className="h-3.5 w-3.5" />
        Done
      </span>
    )
  }

  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-300">
        <MdCancel className="h-3.5 w-3.5" />
        Failed
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-500/20 bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-400">
      <MdHourglassEmpty className="h-3.5 w-3.5" />
      Pending
    </span>
  )
}

export default function AdminAddBookPage() {
  const [activeTab, setActiveTab] = useState('single') // 'single' | 'bulk' | 'csv'
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
    formData.append(
      'tags',
      JSON.stringify(
        book.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    )
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

  const uploadBook = async ({ book, token }) =>
    apiClient.post('/api/books', buildBookFormData(book), {
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
            title: (() => {
              const rawTitle = String(row.title ?? '').trim()
              if (rawTitle.includes('-') && !rawTitle.includes(' ')) {
                return rawTitle.replace(/-/g, ' ')
              }
              return rawTitle
            })(),
            author: String(row.author ?? '').trim(),
            category: String(row.category ?? '').trim(),
            difficulty: String(row.difficulty ?? '').trim(),
            language: String(row.language ?? '').trim() || 'English',
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

    setCsvBooks((prev) =>
      prev.map((book) => ({
        ...book,
        [key]: fileMap.get(slugifyFilename(book.title)) || book[key],
      })),
    )
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
      setToast('Book published to library catalog successfully.')
      setForm(initialForm)
      setMediaMode(initialMediaMode)
      setThumbnailFile(null)
      setBookFile(null)
      setErrors({})
      setTimeout(() => setToast(''), 3000)
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
    <div className="relative min-h-screen overflow-x-clip bg-[#060811] text-slate-100 font-sans selection:bg-purple-500/30 selection:text-purple-200">
      <SEO title="Add New Book & Storage | Admin Suite" />

      {/* Atmospheric Glow Highlights */}
      <div className="pointer-events-none absolute -left-40 top-10 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-purple-600/15 to-indigo-600/10 blur-[140px]" />
      <div className="pointer-events-none absolute right-0 top-32 h-[450px] w-[450px] rounded-full bg-gradient-to-br from-cyan-600/10 to-teal-600/10 blur-[140px]" />

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="fixed right-6 top-6 z-[120] flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-[#0c1626]/95 px-5 py-3.5 text-sm font-medium text-white shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <MdCheck className="text-base font-black" />
            </div>
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1600px] grid-cols-1 gap-4 p-3 sm:p-5 lg:grid-cols-[280px_1fr] lg:gap-6 lg:p-6">
        <AdminSidebar />

        <main className="flex flex-col gap-6 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0c101c]/85 p-4 shadow-2xl backdrop-blur-3xl sm:p-6 lg:p-8">
          {/* Header Area (Matching Google Stitch Screen) */}
          <div className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-0.5 text-[10px] font-bold tracking-[0.2em] text-purple-300 uppercase">
                ADMIN TOOLS
              </span>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
                Add New Book
              </h1>
              <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                Publish new reading content with complete metadata and premium catalog quality.
              </p>
            </div>

            {/* Ingestion Mode Pill Tabs */}
            <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1 w-fit">
              {[
                ['single', 'Single Book'],
                ['bulk', 'Bulk Upload'],
                ['csv', 'CSV Import'],
              ].map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab)
                    setStatus('')
                  }}
                  className={`rounded-lg px-4 py-2 text-xs font-bold transition duration-150 ${
                    activeTab === tab
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_12px_rgba(147,51,234,0.4)]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Cluster Storage & Health Strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/[0.06] bg-[#0a0e1a]/80 p-3.5 backdrop-blur-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MdCloudUpload className="text-purple-400" /> Cloudinary CDN
                </span>
                <span className="text-emerald-400 font-bold text-[10px]">18.4%</span>
              </div>
              <p className="mt-1 text-lg font-black text-white">1.84 GB <span className="text-xs text-slate-400 font-normal">/ 10 GB</span></p>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-[#0a0e1a]/80 p-3.5 backdrop-blur-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MdStorage className="text-cyan-400" /> Atlas Cluster
                </span>
                <span className="text-emerald-400 font-bold text-[10px]">Active</span>
              </div>
              <p className="mt-1 text-lg font-black text-white">7.00 MB <span className="text-xs text-slate-400 font-normal">/ 512 MB</span></p>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-[#0a0e1a]/80 p-3.5 backdrop-blur-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MdDns className="text-indigo-400" /> EPUB Worker
                </span>
                <span className="text-emerald-400 font-bold text-[10px]">Ready</span>
              </div>
              <p className="mt-1 text-lg font-black text-white">EPUB 3.3 <span className="text-xs text-slate-400 font-normal">+ PDF.js</span></p>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-[#0a0e1a]/80 p-3.5 backdrop-blur-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MdSensors className="text-emerald-400" /> Node API
                </span>
                <span className="text-emerald-400 font-bold text-[10px]">99.9%</span>
              </div>
              <p className="mt-1 text-lg font-black text-white">12ms <span className="text-xs text-slate-400 font-normal">Latency</span></p>
            </div>
          </div>

          {/* Status Message */}
          {status && (
            <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              <MdInfoOutline className="text-xl text-rose-400 shrink-0" />
              <span>{status}</span>
            </div>
          )}

          {/* TAB 1: SINGLE BOOK INGESTION (Matches Google Stitch Screen Exactly) */}
          {activeTab === 'single' && (
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl border border-white/[0.08] bg-[#0a0e1a]/90 p-6 shadow-2xl backdrop-blur-xl space-y-6"
            >
              <div className="grid gap-5 md:grid-cols-2">
                {/* Title */}
                <Field label="Title" error={errors.title}>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => onChange('title', e.target.value)}
                    placeholder="The Pragmatic Programmer"
                    className={inputClass}
                  />
                </Field>

                {/* Author */}
                <Field label="Author" error={errors.author}>
                  <input
                    type="text"
                    value={form.author}
                    onChange={(e) => onChange('author', e.target.value)}
                    placeholder="Andrew Hunt"
                    className={inputClass}
                  />
                </Field>

                {/* Category */}
                <Field label="Category" error={errors.category}>
                  <CategoryCombobox
                    value={form.category}
                    onChange={(val) => onChange('category', val)}
                    placeholder="e.g. Programming, Finance, Fiction"
                  />
                </Field>

                {/* Difficulty */}
                <Field label="Difficulty" error={errors.difficulty}>
                  <select
                    value={form.difficulty}
                    onChange={(e) => onChange('difficulty', e.target.value)}
                    className={`${inputClass} cursor-pointer`}
                  >
                    {difficulties.map((difficulty) => (
                      <option key={difficulty} value={difficulty} className="bg-[#090d18] text-white">
                        {difficulty}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* Book File (PDF/EPUB) */}
                <Field label="Book File (PDF/EPUB)" error={errors.fileUrl}>
                  <div className="rounded-xl border border-white/10 bg-[#080c18]/80 p-3.5 space-y-3">
                    <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.04] p-1">
                      <button
                        type="button"
                        onClick={() => onMediaModeChange('file', 'url')}
                        className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                          mediaMode.file === 'url'
                            ? 'bg-purple-600 text-white shadow-[0_0_8px_rgba(147,51,234,0.4)]'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Use URL
                      </button>
                      <button
                        type="button"
                        onClick={() => onMediaModeChange('file', 'file')}
                        className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                          mediaMode.file === 'file'
                            ? 'bg-purple-600 text-white shadow-[0_0_8px_rgba(147,51,234,0.4)]'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Upload File
                      </button>
                    </div>

                    {mediaMode.file === 'url' ? (
                      <input
                        type="url"
                        value={form.fileUrl}
                        onChange={(e) => onChange('fileUrl', e.target.value)}
                        placeholder="https://example.com/book.epub"
                        className={inputClass}
                      />
                    ) : (
                      <div className="space-y-1.5">
                        <input
                          type="file"
                          accept=".pdf,.epub,application/pdf,application/epub+zip"
                          onChange={(e) => {
                            setBookFile(e.target.files?.[0] || null)
                            setErrors((prev) => ({ ...prev, fileUrl: '' }))
                          }}
                          className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-purple-500/20 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-purple-300 file:hover:bg-purple-500/30 cursor-pointer`}
                        />
                        <p className="text-xs text-slate-400">
                          {bookFile ? `Selected: ${bookFile.name} (${(bookFile.size / 1024 / 1024).toFixed(2)} MB)` : 'Accepts .epub or .pdf files'}
                        </p>
                      </div>
                    )}
                  </div>
                </Field>

                {/* Thumbnail Source */}
                <Field label="Thumbnail Source" error={errors.thumbnailUrl}>
                  <div className="rounded-xl border border-white/10 bg-[#080c18]/80 p-3.5 space-y-3">
                    <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.04] p-1">
                      <button
                        type="button"
                        onClick={() => onMediaModeChange('thumbnail', 'url')}
                        className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                          mediaMode.thumbnail === 'url'
                            ? 'bg-purple-600 text-white shadow-[0_0_8px_rgba(147,51,234,0.4)]'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Use URL
                      </button>
                      <button
                        type="button"
                        onClick={() => onMediaModeChange('thumbnail', 'file')}
                        className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                          mediaMode.thumbnail === 'file'
                            ? 'bg-purple-600 text-white shadow-[0_0_8px_rgba(147,51,234,0.4)]'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Upload File
                      </button>
                    </div>

                    {mediaMode.thumbnail === 'url' ? (
                      <input
                        type="url"
                        value={form.thumbnailUrl}
                        onChange={(e) => onChange('thumbnailUrl', e.target.value)}
                        placeholder="https://example.com/thumbnail.jpg"
                        className={inputClass}
                      />
                    ) : (
                      <div className="space-y-1.5">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            setThumbnailFile(e.target.files?.[0] || null)
                            setErrors((prev) => ({ ...prev, thumbnailUrl: '' }))
                          }}
                          className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-500/20 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-cyan-300 file:hover:bg-cyan-500/30 cursor-pointer`}
                        />
                        <p className="text-xs text-slate-400">
                          {thumbnailFile ? `Selected: ${thumbnailFile.name}` : 'Accepts JPG, PNG, WebP'}
                        </p>
                      </div>
                    )}
                  </div>
                </Field>

                {/* Tags */}
                <Field label="Tags" error={errors.tags}>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={(e) => onChange('tags', e.target.value)}
                    placeholder="programming, software, clean-code"
                    className={inputClass}
                  />
                </Field>

                {/* Language */}
                <Field label="Language" error={errors.language}>
                  <input
                    type="text"
                    value={form.language}
                    onChange={(e) => onChange('language', e.target.value)}
                    placeholder="English"
                    className={inputClass}
                  />
                </Field>
              </div>

              {/* Description */}
              <Field label="Description" error={errors.description}>
                <textarea
                  value={form.description}
                  onChange={(e) => onChange('description', e.target.value)}
                  rows={4}
                  placeholder="Write a clear and engaging description of this book..."
                  className={`${inputClass} resize-none`}
                />
              </Field>

              {/* Thumbnail Live Preview Badge */}
              {thumbnailPreview && (
                <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <img
                    src={thumbnailPreview}
                    alt="Cover preview"
                    className="h-16 w-12 rounded-lg object-cover border border-white/10 shadow-md"
                  />
                  <div>
                    <p className="text-xs font-bold text-white">Cover Image Attached</p>
                    <p className="text-[11px] text-slate-400">Preview of thumbnail rendered across catalog surfaces</p>
                  </div>
                </div>
              )}

              {/* Action Buttons (Matches Google Stitch Layout) */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-[0_0_20px_rgba(147,51,234,0.4)] transition hover:shadow-[0_0_30px_rgba(147,51,234,0.6)] disabled:opacity-50"
                >
                  <MdCloudUpload className="text-base" />
                  <span>{submitting ? 'Uploading to Catalog...' : 'Upload Book'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={submitting}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-bold text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                >
                  Reset
                </button>
              </div>
            </motion.form>
          )}

          {/* TAB 2: MULTI-SLOT BULK UPLOAD */}
          {activeTab === 'bulk' && (
            <motion.form
              onSubmit={handleBulkUpload}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              {bulkSlots.map((slot, index) => {
                const slotErrors = bulkErrors[slot.id] || {}
                const progress = bulkProgress[slot.id] || { status: 'pending' }
                const isDone = progress.status === 'done'

                return (
                  <section
                    key={slot.id}
                    className={`rounded-2xl border p-5 shadow-xl backdrop-blur-xl transition ${
                      isDone
                        ? 'border-emerald-500/30 bg-emerald-950/10'
                        : 'border-white/[0.08] bg-[#0a0e1a]/90'
                    }`}
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-xs font-black text-purple-300">
                          #{index + 1}
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-white">{slot.title || `Book Slot ${index + 1}`}</h3>
                          <p className="text-[11px] text-slate-400">{slot.author || 'Specify author and format'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <ProgressBadge state={progress} />
                        {bulkSlots.length > 1 && !bulkUploading && !isDone && (
                          <button
                            type="button"
                            onClick={() => removeBulkSlot(slot.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-rose-400 hover:bg-rose-500/20"
                            title="Remove Slot"
                          >
                            <MdDeleteOutline className="text-base" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Title" error={slotErrors.title}>
                        <input
                          type="text"
                          value={slot.title}
                          onChange={(e) => updateBulkSlot(slot.id, 'title', e.target.value)}
                          disabled={bulkUploading || isDone}
                          placeholder="Book title"
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Author" error={slotErrors.author}>
                        <input
                          type="text"
                          value={slot.author}
                          onChange={(e) => updateBulkSlot(slot.id, 'author', e.target.value)}
                          disabled={bulkUploading || isDone}
                          placeholder="Author name"
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Category" error={slotErrors.category}>
                        <CategoryCombobox
                          value={slot.category}
                          onChange={(val) => updateBulkSlot(slot.id, 'category', val)}
                          placeholder="e.g. Programming, Business"
                        />
                      </Field>

                      <Field label="Difficulty" error={slotErrors.difficulty}>
                        <select
                          value={slot.difficulty}
                          onChange={(e) => updateBulkSlot(slot.id, 'difficulty', e.target.value)}
                          disabled={bulkUploading || isDone}
                          className={`${inputClass} cursor-pointer`}
                        >
                          {difficulties.map((difficulty) => (
                            <option key={difficulty} value={difficulty} className="bg-[#090d18] text-white">
                              {difficulty}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Book File (PDF/EPUB)" error={slotErrors.bookFile}>
                        <input
                          type="file"
                          accept=".pdf,.epub,application/pdf,application/epub+zip"
                          disabled={bulkUploading || isDone}
                          onChange={(e) => updateBulkSlot(slot.id, 'bookFile', e.target.files?.[0] || null)}
                          className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-purple-500/20 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-purple-300 file:hover:bg-purple-500/30 cursor-pointer`}
                        />
                      </Field>

                      <Field label="Thumbnail Image" error={slotErrors.thumbnailFile}>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={bulkUploading || isDone}
                          onChange={(e) => updateBulkSlot(slot.id, 'thumbnailFile', e.target.files?.[0] || null)}
                          className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-500/20 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-cyan-300 file:hover:bg-cyan-500/30 cursor-pointer`}
                        />
                      </Field>
                    </div>

                    <div className="mt-4">
                      <Field label="Description" error={slotErrors.description}>
                        <textarea
                          value={slot.description}
                          onChange={(e) => updateBulkSlot(slot.id, 'description', e.target.value)}
                          disabled={bulkUploading || isDone}
                          rows={3}
                          placeholder="Short book description..."
                          className={`${inputClass} resize-none`}
                        />
                      </Field>
                    </div>
                  </section>
                )
              })}

              {bulkStatus && <p className="text-xs text-rose-400 font-semibold">{bulkStatus}</p>}
              {bulkSummary && <p className="text-xs text-emerald-400 font-semibold">{bulkSummary}</p>}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={addBulkSlot}
                  disabled={bulkSlots.length >= maxBulkSlots || bulkUploading}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
                >
                  <MdAdd className="text-base" />
                  <span>Add Another Slot ({bulkSlots.length}/{maxBulkSlots})</span>
                </button>

                <button
                  type="submit"
                  disabled={bulkUploading}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-[0_0_15px_rgba(147,51,234,0.4)] transition hover:shadow-[0_0_25px_rgba(147,51,234,0.6)] disabled:opacity-50"
                >
                  <MdCloudUpload className="text-base" />
                  <span>{bulkUploading ? 'Uploading All Slots...' : 'Upload All Books'}</span>
                </button>
              </div>
            </motion.form>
          )}

          {/* TAB 3: CSV IMPORT */}
          {activeTab === 'csv' && (
            <motion.form
              onSubmit={handleCsvImport}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              <section className="rounded-2xl border border-white/[0.08] bg-[#0a0e1a]/90 p-5 shadow-xl backdrop-blur-xl">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                  <Field label="Select CSV Manifest" error={csvStatus && !csvBooks.length ? csvStatus : ''}>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      disabled={csvUploading}
                      onChange={handleCsvUpload}
                      className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-purple-500/20 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-purple-300 file:hover:bg-purple-500/30 cursor-pointer`}
                    />
                  </Field>

                  <button
                    type="button"
                    onClick={downloadCsvTemplate}
                    disabled={csvUploading}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-bold text-slate-200 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    <MdFileDownload className="text-base text-purple-400" />
                    <span>Download CSV Template</span>
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap gap-3 border-t border-white/[0.06] pt-4">
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

                  <button
                    type="button"
                    onClick={() => epubInputRef.current?.click()}
                    disabled={csvUploading || !csvBooks.length}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08] disabled:opacity-40"
                  >
                    <span>Match EPUB Files</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => thumbnailInputRef.current?.click()}
                    disabled={csvUploading || !csvBooks.length}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08] disabled:opacity-40"
                  >
                    <span>Match Thumbnail Files</span>
                  </button>
                </div>
              </section>

              {csvBooks.length > 0 && (
                <section className="rounded-2xl border border-white/[0.08] bg-[#0a0e1a]/90 p-5 shadow-xl backdrop-blur-xl">
                  <div className="mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">CSV Manifest Preview</span>
                    <h3 className="text-base font-black text-white">{csvBooks.length} books parsed & ready</h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.08] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <th className="pb-2.5">Title & Author</th>
                          <th className="pb-2.5">Category</th>
                          <th className="pb-2.5">EPUB Match</th>
                          <th className="pb-2.5">Cover Match</th>
                          <th className="pb-2.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {csvBooks.map((book) => {
                          const progress = csvProgress[book.id] || { status: 'pending' }
                          return (
                            <tr key={book.id} className="hover:bg-white/[0.02]">
                              <td className="py-3">
                                <p className="font-bold text-white">{book.title || 'Untitled'}</p>
                                <p className="text-[10px] text-slate-400">{book.author || 'Unknown'}</p>
                              </td>
                              <td className="py-3 text-slate-300">{book.category}</td>
                              <td className="py-3">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${book.bookFile ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                                  {book.bookFile ? book.bookFile.name : 'Missing'}
                                </span>
                              </td>
                              <td className="py-3">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${book.thumbnailFile ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                                  {book.thumbnailFile ? book.thumbnailFile.name : 'Missing'}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                <ProgressBadge state={progress} />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {csvStatus && csvBooks.length > 0 && <p className="text-xs text-rose-400 font-semibold">{csvStatus}</p>}
              {csvSummary && <p className="text-xs text-emerald-400 font-semibold">{csvSummary}</p>}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={csvUploading || !csvBooks.length}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-[0_0_15px_rgba(147,51,234,0.4)] transition hover:shadow-[0_0_25px_rgba(147,51,234,0.6)] disabled:opacity-50"
                >
                  <MdCloudUpload className="text-base" />
                  <span>{csvUploading ? 'Importing Books...' : 'Import All Books'}</span>
                </button>
              </div>
            </motion.form>
          )}
        </main>
      </div>
    </div>
  )
}
