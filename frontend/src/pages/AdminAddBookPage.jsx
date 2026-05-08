import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import apiClient from '../lib/apiClient'
import AdminSidebar from '../components/AdminSidebar'

const categories = ['Programming', 'AI', 'Business', 'Self-Help', 'Design', 'Productivity']
const difficulties = ['Beginner', 'Intermediate', 'Advanced']

const initialForm = {
  title: '',
  author: '',
  category: 'Programming',
  description: '',
  pdfUrl: '',
  thumbnailUrl: '',
  tags: '',
  language: '',
  difficulty: 'Beginner',
}

const initialMediaMode = {
  thumbnail: 'url',
  pdf: 'url',
}

const urlPattern = /^https?:\/\/.+/i

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

export default function AdminAddBookPage() {
  const [form, setForm] = useState(initialForm)
  const [mediaMode, setMediaMode] = useState(initialMediaMode)
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [pdfFile, setPdfFile] = useState(null)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('')
  const [toast, setToast] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [thumbnailObjectUrl, setThumbnailObjectUrl] = useState('')

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
    setErrors((prev) => ({ ...prev, [type === 'thumbnail' ? 'thumbnailUrl' : 'pdfUrl']: '' }))
  }

  const validate = () => {
    const nextErrors = {}
    const pdfUrl = form.pdfUrl.trim()
    const thumbnailUrl = form.thumbnailUrl.trim()
    const hasPdfUrl = Boolean(pdfUrl)
    const hasThumbnailUrl = Boolean(thumbnailUrl)
    const hasPdfFile = Boolean(pdfFile)
    const hasThumbnailFile = Boolean(thumbnailFile)

    if (!form.title.trim()) nextErrors.title = 'Title is required'
    if (!form.author.trim()) nextErrors.author = 'Author is required'
    if (!form.category.trim()) nextErrors.category = 'Category is required'
    if (!form.description.trim() || form.description.trim().length < 20) {
      nextErrors.description = 'Description should be at least 20 characters'
    }

    if (!hasPdfUrl && !hasPdfFile) {
      nextErrors.pdfUrl = 'Provide a PDF URL or upload a PDF file'
    } else if (hasPdfUrl && !urlPattern.test(pdfUrl)) {
      nextErrors.pdfUrl = 'Enter a valid PDF URL'
    } else if (hasPdfFile && pdfFile.type !== 'application/pdf') {
      nextErrors.pdfUrl = 'Only PDF files are allowed'
    }

    if (!hasThumbnailUrl && !hasThumbnailFile) {
      nextErrors.thumbnailUrl = 'Provide a thumbnail URL or upload an image file'
    } else if (hasThumbnailUrl && !urlPattern.test(thumbnailUrl)) {
      nextErrors.thumbnailUrl = 'Enter a valid thumbnail URL'
    } else if (hasThumbnailFile && !thumbnailFile.type.startsWith('image/')) {
      nextErrors.thumbnailUrl = 'Only image files are allowed'
    }

    if (!form.tags.trim()) nextErrors.tags = 'Add at least one tag'
    if (!form.language.trim()) nextErrors.language = 'Language is required'
    if (!form.difficulty.trim()) nextErrors.difficulty = 'Difficulty is required'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
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

      const formData = new FormData()
      formData.append('title', form.title.trim())
      formData.append('author', form.author.trim())
      formData.append('category', form.category.trim())

      if (form.thumbnailUrl.trim()) {
        formData.append('thumbnail', form.thumbnailUrl.trim())
      } else if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile)
      }

      if (form.pdfUrl.trim()) {
        formData.append('pdf', form.pdfUrl.trim())
      } else if (pdfFile) {
        formData.append('pdf', pdfFile)
      }

      await apiClient.post('/api/books', formData, {
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      setStatus('')
      setToast('Book uploaded successfully.')
      setForm(initialForm)
      setMediaMode(initialMediaMode)
      setThumbnailFile(null)
      setPdfFile(null)
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
    setPdfFile(null)
    setErrors({})
    setStatus('')
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

          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border border-white/15 bg-white/[0.05] p-5 shadow-[0_18px_55px_rgba(7,10,32,0.35)] backdrop-blur-xl"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Title" error={errors.title}>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => onChange('title', e.target.value)}
                  placeholder="The Pragmatic Programmer"
                  className={inputClass}
                />
              </Field>

              <Field label="Author" error={errors.author}>
                <input
                  type="text"
                  value={form.author}
                  onChange={(e) => onChange('author', e.target.value)}
                  placeholder="Andrew Hunt"
                  className={inputClass}
                />
              </Field>

              <Field label="Category" error={errors.category}>
                <select
                  value={form.category}
                  onChange={(e) => onChange('category', e.target.value)}
                  className={inputClass}
                >
                  {categories.map((category) => (
                    <option key={category} value={category} className="bg-slate-900">
                      {category}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Difficulty" error={errors.difficulty}>
                <select
                  value={form.difficulty}
                  onChange={(e) => onChange('difficulty', e.target.value)}
                  className={inputClass}
                >
                  {difficulties.map((difficulty) => (
                    <option key={difficulty} value={difficulty} className="bg-slate-900">
                      {difficulty}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="PDF Source" error={errors.pdfUrl}>
                <div className="rounded-xl border border-white/15 bg-slate-950/35 p-3">
                  <div className="mb-3 inline-flex rounded-lg border border-white/15 bg-white/[0.04] p-1">
                    <button
                      type="button"
                      onClick={() => onMediaModeChange('pdf', 'url')}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                        mediaMode.pdf === 'url'
                          ? 'bg-gradient-to-r from-blue-500/40 to-violet-500/40 text-white'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Use URL
                    </button>
                    <button
                      type="button"
                      onClick={() => onMediaModeChange('pdf', 'file')}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                        mediaMode.pdf === 'file'
                          ? 'bg-gradient-to-r from-blue-500/40 to-violet-500/40 text-white'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Upload File
                    </button>
                  </div>

                  {mediaMode.pdf === 'url' ? (
                    <input
                      type="url"
                      value={form.pdfUrl}
                      onChange={(e) => onChange('pdfUrl', e.target.value)}
                      placeholder="https://example.com/book.pdf"
                      className={inputClass}
                    />
                  ) : (
                    <div>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                        className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-blue-500/30 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-100`}
                      />
                      <p className="mt-2 text-xs text-slate-300">{pdfFile ? `Selected: ${pdfFile.name}` : 'No file selected'}</p>
                    </div>
                  )}
                </div>
              </Field>

              <Field label="Thumbnail Source" error={errors.thumbnailUrl}>
                <div className="rounded-xl border border-white/15 bg-slate-950/35 p-3">
                  <div className="mb-3 inline-flex rounded-lg border border-white/15 bg-white/[0.04] p-1">
                    <button
                      type="button"
                      onClick={() => onMediaModeChange('thumbnail', 'url')}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                        mediaMode.thumbnail === 'url'
                          ? 'bg-gradient-to-r from-blue-500/40 to-violet-500/40 text-white'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Use URL
                    </button>
                    <button
                      type="button"
                      onClick={() => onMediaModeChange('thumbnail', 'file')}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                        mediaMode.thumbnail === 'file'
                          ? 'bg-gradient-to-r from-blue-500/40 to-violet-500/40 text-white'
                          : 'text-slate-300 hover:text-white'
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
                      placeholder="https://example.com/thumb.jpg"
                      className={inputClass}
                    />
                  ) : (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                        className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-blue-500/30 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-100`}
                      />
                      <p className="mt-2 text-xs text-slate-300">
                        {thumbnailFile ? `Selected: ${thumbnailFile.name}` : 'No file selected'}
                      </p>
                    </div>
                  )}

                  {thumbnailPreview ? (
                    <div className="mt-3 overflow-hidden rounded-xl border border-white/15 bg-slate-900/40">
                      <img src={thumbnailPreview} alt="Thumbnail preview" className="h-32 w-full object-cover" />
                    </div>
                  ) : null}
                </div>
              </Field>

              <Field label="Tags" error={errors.tags}>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => onChange('tags', e.target.value)}
                  placeholder="programming, software, clean-code"
                  className={inputClass}
                />
              </Field>

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

            <div className="mt-5">
              <Field label="Description" error={errors.description}>
                <textarea
                  value={form.description}
                  onChange={(e) => onChange('description', e.target.value)}
                  rows={5}
                  placeholder="Write a clear and engaging description of this book..."
                  className={`${inputClass} resize-none`}
                />
              </Field>
            </div>

            {status ? (
              <p className={`mt-4 text-sm ${status.includes('ready') ? 'text-emerald-300' : 'text-rose-300'}`}>{status}</p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <motion.button
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_34px_rgba(87,104,255,0.45)] transition hover:shadow-[0_0_30px_rgba(112,105,255,0.55)]"
              >
                {submitting ? 'Uploading...' : 'Upload Book'}
              </motion.button>

              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleReset}
                className="rounded-xl border border-white/20 bg-white/[0.07] px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-blue-300/35 hover:bg-white/[0.12]"
              >
                Reset
              </motion.button>
            </div>
          </motion.form>
        </main>
      </div>
    </div>
  )
}
