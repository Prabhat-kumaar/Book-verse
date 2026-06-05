import { motion } from 'framer-motion'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiClient from '../lib/apiClient'

const inputClass =
  'w-full rounded-xl border border-white/15 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none transition duration-300 placeholder:text-slate-400 focus:border-blue-300/55 focus:bg-slate-900/75 focus:shadow-[0_0_0_4px_rgba(98,108,255,0.2)]'

export default function SignUpPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Name, email, and password are required')
      return
    }

    try {
      setSubmitting(true)
      const response = await apiClient.post('/api/auth/register', {
        username: name.trim(),
        email: email.trim(),
        password,
        role: 'user',
      })

      const token = response.data?.token
      const user = response.data?.user

      if (!token || !user) {
        throw new Error('Sign up failed')
      }

      localStorage.setItem('authToken', token)
      localStorage.setItem('authUser', JSON.stringify(user))
      window.dispatchEvent(new Event('authChanged'))
      navigate('/', { replace: true })
    } catch (signupError) {
      setError(signupError.response?.data?.message || signupError.message || 'Sign up failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050914] px-4 py-10 text-slate-100 sm:px-6">
      <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-blue-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-24 h-80 w-80 rounded-full bg-violet-500/20 blur-[130px]" />

      <div className="relative mx-auto mt-8 w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.12] to-white/[0.05] p-6 shadow-[0_22px_70px_rgba(6,10,35,0.52)] backdrop-blur-2xl sm:p-8"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-100/80">Readify AI</p>
          <h1 className="mt-2 bg-gradient-to-r from-blue-300 to-violet-300 bg-clip-text text-3xl font-black text-transparent">
            Sign Up
          </h1>
          <p className="mt-2 text-sm text-slate-300">Create your reading account in seconds.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-200">Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-200">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-200">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className={inputClass}
              />
            </label>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}

            <motion.button
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_35px_rgba(88,103,255,0.45)] transition hover:shadow-[0_0_28px_rgba(111,108,255,0.52)] disabled:cursor-not-allowed disabled:opacity-65"
            >
              {submitting ? 'Creating account...' : 'Create Account'}
            </motion.button>
          </form>

          <p className="mt-5 text-sm text-slate-300">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-blue-200 transition hover:text-blue-100">
              Login
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
