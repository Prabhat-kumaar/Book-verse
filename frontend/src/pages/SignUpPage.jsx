import { motion } from 'framer-motion'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaGoogle, FaGithub } from 'react-icons/fa'
import apiClient from '../lib/apiClient'
import SEO from '../components/SEO'

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
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#070913] px-4 py-12 text-slate-100 sm:px-6">
      <SEO
        title="Create Account - LuminaBooks"
        description="Sign up for a free LuminaBooks account to track your reading progress and books."
        path="/signup"
      />

      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full bg-violet-600/15 blur-[130px]" />
      <div className="pointer-events-none absolute -right-32 bottom-10 h-96 w-96 rounded-full bg-blue-600/15 blur-[130px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md rounded-[2.5rem] border border-white/[0.08] bg-[#0c101d]/90 p-8 sm:p-10 shadow-2xl shadow-black/80 backdrop-blur-2xl text-center space-y-6"
      >
        {/* Brand & Heading */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black font-serif tracking-tight text-white">
            Lumina<span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">Books</span>
          </h1>
          <h2 className="text-xl sm:text-2xl font-bold text-white pt-1">
            Create an Account
          </h2>
          <p className="text-xs text-slate-400">
            Start your digital reading journey in seconds.
          </p>
        </div>

        {/* Social Authentication Buttons */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 rounded-2xl border border-white/[0.08] bg-[#141828]/90 hover:bg-[#191e32] py-3 px-4 text-xs font-semibold text-slate-200 transition active:scale-[0.98]"
          >
            <FaGoogle className="h-3.5 w-3.5 text-slate-300" />
            <span>Sign up with Google</span>
          </button>

          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 rounded-2xl border border-white/[0.08] bg-[#141828]/90 hover:bg-[#191e32] py-3 px-4 text-xs font-semibold text-slate-200 transition active:scale-[0.98]"
          >
            <FaGithub className="h-4 w-4 text-slate-300" />
            <span>Sign up with GitHub</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/[0.06]" />
          </div>
          <span className="relative bg-[#0c101d] px-3 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
            OR CREATE WITH EMAIL
          </span>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Sterling"
              className="h-12 w-full rounded-2xl border border-white/10 bg-[#070a14] px-4 text-xs text-white placeholder:text-slate-600 outline-none transition focus:border-violet-400 focus:bg-[#090d1a]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="reader@luminabooks.com"
              className="h-12 w-full rounded-2xl border border-white/10 bg-[#070a14] px-4 text-xs text-white placeholder:text-slate-600 outline-none transition focus:border-violet-400 focus:bg-[#090d1a]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              className="h-12 w-full rounded-2xl border border-white/10 bg-[#070a14] px-4 text-xs text-white placeholder:text-slate-600 outline-none transition focus:border-violet-400 focus:bg-[#090d1a]"
            />
          </div>

          {error && <p className="text-xs text-rose-400 pt-1 font-medium">{error}</p>}

          {/* Submit CTA Button */}
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 py-3.5 px-4 text-xs font-bold text-white shadow-xl shadow-indigo-950/60 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {/* Footer Link */}
        <p className="text-xs text-slate-400 pt-2">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-white hover:text-violet-300 transition">
            Sign In.
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
