import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import AdminSidebar from '../components/AdminSidebar'
import apiClient from '../lib/apiClient'

const inputClass =
  'w-full rounded-xl border border-white/15 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition duration-300 placeholder:text-slate-400 focus:border-blue-300/55 focus:bg-slate-900/70 focus:shadow-[0_0_0_4px_rgba(98,108,255,0.2)]'

const normalizeText = (value) => (value || '').toString().trim().toLowerCase()

function formatDate(value) {
  if (!value) return 'N/A'
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getInitial(user) {
  return (user?.username || user?.email || '?').trim().charAt(0).toUpperCase()
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState('')
  const [toast, setToast] = useState('')

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await apiClient.get('/api/users/admin/all')
      setUsers(Array.isArray(response.data?.data) ? response.data.data : [])
    } catch (fetchError) {
      setError(fetchError.response?.data?.message || fetchError.message || 'Unable to load users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const filteredUsers = useMemo(() => {
    const term = normalizeText(search)
    if (!term) return users
    return users.filter((user) => (
      normalizeText(user.username).includes(term) ||
      normalizeText(user.email).includes(term)
    ))
  }, [search, users])

  const updateBanState = async (user, shouldBan) => {
    if (!user?._id) return

    try {
      setUpdatingId(user._id)
      setError('')
      const endpoint = shouldBan
        ? `/api/users/admin/${user._id}/ban`
        : `/api/users/admin/${user._id}/unban`
      await apiClient.patch(endpoint)
      setUsers((prev) => prev.map((item) => (
        item._id === user._id ? { ...item, isBanned: shouldBan } : item
      )))
      setToast(`${user.username || 'User'} ${shouldBan ? 'banned' : 'unbanned'} successfully.`)
      setTimeout(() => setToast(''), 2200)
    } catch (updateError) {
      setError(updateError.response?.data?.message || updateError.message || 'Unable to update user.')
    } finally {
      setUpdatingId('')
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
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100/80">User Control</p>
            <h2 className="mt-1 text-3xl font-black text-white sm:text-4xl">Manage Users</h2>
            <p className="mt-2 text-sm text-slate-300">Review reader accounts, progress, and access status.</p>
          </div>

          <div className="mb-5 grid gap-4 md:grid-cols-[1fr_auto]">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by username or email..."
              className={inputClass}
            />
            <button
              type="button"
              onClick={fetchUsers}
              className="rounded-xl border border-white/20 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-blue-300/35 hover:bg-white/[0.12]"
            >
              Refresh
            </button>
          </div>

          {error ? <p className="mb-4 text-sm text-rose-300">{error}</p> : null}

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#111827]/75 to-[#0b0f19]/80 shadow-xl backdrop-blur-xl"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-4">Avatar</th>
                    <th className="px-4 py-4">Username</th>
                    <th className="px-4 py-4">Email</th>
                    <th className="px-4 py-4">Role</th>
                    <th className="px-4 py-4">Joined</th>
                    <th className="px-4 py-4">Books Started</th>
                    <th className="px-4 py-4">Books Completed</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(6)].map((_, index) => (
                      <tr key={index} className="border-b border-white/5">
                        {[...Array(9)].map((__, cellIndex) => (
                          <td key={cellIndex} className="px-4 py-4">
                            <div className="h-4 w-20 animate-pulse rounded bg-white/10" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-10 text-center text-slate-400">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user._id} className="border-b border-white/5 transition hover:bg-white/[0.03]">
                        <td className="px-4 py-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-300/30 bg-blue-500/15 text-sm font-black text-blue-100">
                            {getInitial(user)}
                          </div>
                        </td>
                        <td className="px-4 py-4 font-bold text-white">{user.username || 'N/A'}</td>
                        <td className="px-4 py-4 text-slate-300">{user.email || 'N/A'}</td>
                        <td className="px-4 py-4">
                          <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-bold capitalize text-slate-200">
                            {user.role || 'user'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-300">{formatDate(user.createdAt)}</td>
                        <td className="px-4 py-4 font-bold text-indigo-200">{user.booksStarted || 0}</td>
                        <td className="px-4 py-4 font-bold text-emerald-200">{user.booksCompleted || 0}</td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${
                            user.isBanned
                              ? 'border-rose-300/30 bg-rose-500/15 text-rose-200'
                              : 'border-emerald-300/30 bg-emerald-500/15 text-emerald-200'
                          }`}
                          >
                            {user.isBanned ? 'banned' : 'active'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          {user.isBanned ? (
                            <button
                              type="button"
                              onClick={() => updateBanState(user, false)}
                              disabled={updatingId === user._id}
                              className="rounded-xl border border-emerald-300/35 bg-emerald-500/15 px-4 py-2 text-xs font-bold text-emerald-100 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Unban
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => updateBanState(user, true)}
                              disabled={updatingId === user._id}
                              className="rounded-xl border border-rose-300/35 bg-rose-500/15 px-4 py-2 text-xs font-bold text-rose-100 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Ban
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.section>
        </main>
      </div>
    </div>
  )
}
