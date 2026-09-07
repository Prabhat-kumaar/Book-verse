import React, { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import {
  MdInsights,
  MdRefresh,
  MdFileDownload,
  MdAutoAwesome,
  MdVisibility,
  MdPeopleAlt,
  MdTimer,
  MdBookmarkAdded,
  MdTrendingUp,
  MdDevices,
  MdPublic,
  MdAccessTime,
  MdLibraryBooks,
  MdMenuBook,
  MdPersonAdd,
  MdCheckCircle,
  MdArrowUpward,
  MdArrowDownward,
  MdInfoOutline,
} from 'react-icons/md'
import AdminSidebar from '../components/AdminSidebar'
import apiClient from '../lib/apiClient'
import SEO from '../components/SEO'
import { getBookThumbnailUrl } from '../lib/mediaUrls'

const isDev = import.meta.env.DEV

// Custom Recharts Dark Tooltip
function CustomChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-2xl border border-white/15 bg-[#090d18]/95 p-3.5 shadow-2xl backdrop-blur-2xl text-xs">
        <p className="font-bold text-slate-300 border-b border-white/10 pb-1.5 mb-2">{label}</p>
        <div className="space-y-1.5 font-semibold">
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}:</span>
              </span>
              <span className="font-black text-white">{Number(entry.value).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

export default function AdminAnalyticsPage() {
  const [detailsData, setDetailsData] = useState(null)
  const [adminOverview, setAdminOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [timeFrame, setTimeFrame] = useState('day') // 'day' | 'month' | 'year'
  const [toastMessage, setToastMessage] = useState('')

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  const fetchAllAnalytics = async () => {
    try {
      setLoading(true)
      setError('')
      const [detailsRes, overviewRes] = await Promise.all([
        apiClient.get('/api/analytics/admin/details').catch(() => null),
        apiClient.get('/api/analytics/admin').catch(() => null),
      ])

      if (detailsRes?.data?.success) {
        setDetailsData(detailsRes.data)
      }
      if (overviewRes?.data?.success) {
        setAdminOverview(overviewRes.data)
      }

      if (!detailsRes?.data?.success && !overviewRes?.data?.success) {
        setError('Failed to fetch analytics data from telemetry cluster.')
      }
    } catch (err) {
      if (isDev) console.error('Error fetching analytics details:', err)
      setError(err.response?.data?.message || 'Error communicating with analytics telemetry service.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllAnalytics()
  }, [])

  const chartData = useMemo(() => {
    return detailsData?.charts?.[timeFrame] || []
  }, [detailsData, timeFrame])

  const handleExportCSV = async () => {
    try {
      setExporting(true)
      const response = await apiClient.get('/api/analytics/admin/export', {
        responseType: 'blob',
        dedupe: false,
      })
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }))
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `readify-analytics-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(blobUrl)
      showToast('Analytics CSV exported successfully.')
    } catch (err) {
      if (isDev) console.error('Error exporting analytics CSV:', err)
      showToast('Error exporting analytics CSV.')
    } finally {
      setExporting(false)
    }
  }

  const handleExportJSON = () => {
    if (!detailsData && !adminOverview) {
      showToast('No data to export.')
      return
    }
    const combinedData = {
      exportedAt: new Date().toISOString(),
      details: detailsData,
      overview: adminOverview,
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(combinedData, null, 2))
    const link = document.createElement('a')
    link.setAttribute('href', dataStr)
    link.setAttribute('download', `readify-analytics-telemetry-${new Date().toISOString().slice(0, 10)}.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Analytics JSON telemetry exported.')
  }

  // Device Breakdown calculations for Pie Chart
  const devicePieData = useMemo(() => {
    const raw = detailsData?.advanced?.deviceBreakdown || { Desktop: 0, Mobile: 0, Tablet: 0 }
    const total = Object.values(raw).reduce((a, b) => a + b, 0) || 1
    return [
      { name: 'Desktop', value: raw.Desktop || 0, color: '#818cf8', pct: Math.round(((raw.Desktop || 0) / total) * 100) },
      { name: 'Mobile', value: raw.Mobile || 0, color: '#22d3ee', pct: Math.round(((raw.Mobile || 0) / total) * 100) },
      { name: 'Tablet', value: raw.Tablet || 0, color: '#c084fc', pct: Math.round(((raw.Tablet || 0) / total) * 100) },
    ]
  }, [detailsData])

  // 24h Peak hours data
  const peakHoursData = useMemo(() => {
    const raw = detailsData?.advanced?.peakHours || []
    return Array.from({ length: 24 }, (_, i) => {
      const match = raw.find((h) => h.hour === i)
      return {
        hour: `${i}:00`,
        hourNum: i,
        visits: match ? match.count : 0,
      }
    })
  }, [detailsData])

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#060811] text-slate-100 font-sans selection:bg-purple-500/30 selection:text-purple-200">
      <SEO title="Analytics & Insights | Admin Suite" />

      {/* Atmospheric Glow Highlights */}
      <div className="pointer-events-none absolute -left-40 top-10 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-purple-600/15 to-indigo-600/10 blur-[140px]" />
      <div className="pointer-events-none absolute right-0 top-32 h-[450px] w-[450px] rounded-full bg-gradient-to-br from-cyan-600/10 to-teal-600/10 blur-[140px]" />
      <div className="pointer-events-none absolute left-1/3 bottom-10 h-[350px] w-[350px] rounded-full bg-blue-600/10 blur-[130px]" />

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="fixed right-6 top-6 z-[100] flex items-center gap-3 rounded-2xl border border-white/15 bg-[#0f172a]/95 px-5 py-3.5 text-sm font-medium text-white shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300">
              <MdAutoAwesome className="text-base" />
            </div>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1600px] grid-cols-1 gap-4 p-3 sm:p-5 lg:grid-cols-[280px_1fr] lg:gap-6 lg:p-6">
        <AdminSidebar />

        <main className="flex flex-col gap-6 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0c101c]/85 p-4 shadow-2xl backdrop-blur-3xl sm:p-6 lg:p-8">
          {/* Header Area */}
          <div className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-0.5 text-[10px] font-bold tracking-[0.2em] text-purple-300 uppercase">
                  CLUSTER CONTROL / ANALYTICS & INSIGHTS / v4.19-re3
                </span>
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
              </div>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
                Cluster Intelligence & Telemetry
              </h1>
              <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                Real-time traffic profiling, reading retention velocity, geographic distribution, and AI recommendations.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={fetchAllAnalytics}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-200 transition duration-200 hover:border-purple-400/40 hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
                title="Refresh analytics data"
              >
                <MdRefresh className={`text-base ${loading ? 'animate-spin text-purple-400' : ''}`} />
                <span>Sync Metrics</span>
              </button>

              <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.03] p-1">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={exporting}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                  title="Export to CSV"
                >
                  <MdFileDownload className="text-sm text-purple-400" />
                  <span>{exporting ? 'Exporting...' : 'CSV'}</span>
                </button>
                <div className="h-4 w-px bg-white/10" />
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                  title="Export Telemetry to JSON"
                >
                  <MdFileDownload className="text-sm text-cyan-400" />
                  <span>JSON</span>
                </button>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              <MdInfoOutline className="text-xl text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* 4 Executive Realtime KPI Strip */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Today's Traffic Pulse */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-950/30 via-[#0e1424] to-[#0a0d18] p-4 shadow-lg backdrop-blur-xl"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300/90">Today's Pulse</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/15 text-purple-300">
                  <MdVisibility className="text-lg" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">
                  {loading ? '—' : Number(detailsData?.todayVisits ?? 0).toLocaleString()}
                </span>
                <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  Live Views
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-white/[0.06] pt-2">
                <span>Unique IPs Today:</span>
                <span className="text-purple-300 font-bold">{detailsData?.todayUniqueVisitors ?? 0}</span>
              </div>
            </motion.div>

            {/* Card 2: Catalog Reads & Velocity */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/30 via-[#0e1424] to-[#0a0d18] p-4 shadow-lg backdrop-blur-xl"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300/90">Monthly Reads</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
                  <MdMenuBook className="text-lg" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">
                  {loading ? '—' : detailsData?.overview?.monthlyReads?.value ?? '0'}
                </span>
                <span className="text-xs font-medium text-cyan-300">Pages Read</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-white/[0.06] pt-2">
                <span>Velocity delta:</span>
                <span className="text-cyan-300 font-bold">{detailsData?.overview?.monthlyReads?.hint ?? 'Stable'}</span>
              </div>
            </motion.div>

            {/* Card 3: Reader Retention & Sessions */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 via-[#0e1424] to-[#0a0d18] p-4 shadow-lg backdrop-blur-xl"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/90">Retention & Immersion</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                  <MdTimer className="text-lg" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">
                  {loading ? '—' : detailsData?.overview?.avgSession?.value ?? '0m'}
                </span>
                <span className="text-xs font-medium text-emerald-400">Avg Session</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-white/[0.06] pt-2">
                <span>Returning rate:</span>
                <span className="text-emerald-300 font-bold">{detailsData?.overview?.returningReaders?.value ?? '0%'}</span>
              </div>
            </motion.div>

            {/* Card 4: Active Readers & Completion */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/30 via-[#0e1424] to-[#0a0d18] p-4 shadow-lg backdrop-blur-xl"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300/90">Completion Rate</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
                  <MdBookmarkAdded className="text-lg" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">
                  {loading ? '—' : detailsData?.overview?.completionRate?.value ?? '0%'}
                </span>
                <span className="text-xs font-medium text-amber-400">Finished Books</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-white/[0.06] pt-2">
                <span>Active 24h Readers:</span>
                <span className="text-amber-300 font-bold">{adminOverview?.activeReadersTodayCount ?? 0}</span>
              </div>
            </motion.div>
          </div>

          {/* PRIMARY TRAFFIC OBSERVATORY CHART (Recharts) */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#101626]/90 to-[#090d18]/95 p-5 shadow-2xl backdrop-blur-2xl"
          >
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black tracking-tight text-white sm:text-xl">
                    Website Traffic Observatory
                  </h3>
                  <span className="rounded-md border border-purple-500/30 bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                    Dual Series AST
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5 font-semibold text-purple-300">
                    <span className="h-2.5 w-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]" />
                    Total Pageviews ({detailsData?.websiteVisits ?? 0})
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-cyan-300">
                    <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                    Unique Visitors ({detailsData?.uniqueVisitors ?? 0})
                  </span>
                </div>
              </div>

              {/* Time Range Selector */}
              <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
                {[
                  { key: 'day', label: 'Daily (30D)' },
                  { key: 'month', label: 'Monthly (12M)' },
                  { key: 'year', label: 'Yearly (5Y)' },
                ].map((tf) => (
                  <button
                    key={tf.key}
                    type="button"
                    onClick={() => setTimeFrame(tf.key)}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition duration-150 ${
                      timeFrame === tf.key
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_12px_rgba(147,51,234,0.4)]'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recharts Area Container */}
            <div className="h-[340px] w-full">
              {loading ? (
                <div className="flex h-full w-full items-center justify-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="purpleVisits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="cyanUnique" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val)}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="visits"
                      name="Total Pageviews"
                      stroke="#a855f7"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#purpleVisits)"
                    />
                    <Area
                      type="monotone"
                      dataKey="unique"
                      name="Unique Visitors"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#cyanUnique)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-500 text-sm">
                  No traffic information recorded for this period yet.
                </div>
              )}
            </div>
          </motion.section>

          {/* 2-COLUMN INTELLIGENCE GRID 1: GEOGRAPHIC & DEVICES */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Geographic Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/[0.08] bg-[#0a0e1a]/90 p-5 shadow-xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <MdPublic className="text-purple-400 text-lg" />
                    Geographic Reader Distribution
                  </h3>
                  <p className="text-xs text-slate-400">Top visitor origins resolved by GeoIP telemetry</p>
                </div>
              </div>

              <div className="mt-5 space-y-3.5">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <div key={i} className="animate-pulse space-y-1.5">
                      <div className="h-4 w-28 rounded bg-white/10" />
                      <div className="h-2 rounded bg-white/5" />
                    </div>
                  ))
                ) : detailsData?.advanced?.geographicData && detailsData.advanced.geographicData.length > 0 ? (
                  (() => {
                    const geo = detailsData.advanced.geographicData
                    const max = Math.max(...geo.map((g) => g.count), 1)
                    return geo.map((g, idx) => {
                      const pct = Math.round((g.count / max) * 100)
                      return (
                        <div key={g.country || idx} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-200 flex items-center gap-2">
                              <span className="text-purple-400 font-mono">#{idx + 1}</span>
                              <span>🌐 {g.country}</span>
                            </span>
                            <span className="font-extrabold text-white">{g.count.toLocaleString()} views</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.04] border border-white/5">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                  })()
                ) : (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No international traffic resolved yet.
                  </div>
                )}
              </div>
            </motion.div>

            {/* Devices & Ecosystem */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0a0e1a]/90 p-5 shadow-xl backdrop-blur-xl"
            >
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <MdDevices className="text-cyan-400 text-lg" />
                  Device Fleet & Bounce Dynamics
                </h3>
                <p className="text-xs text-slate-400">Platform breakdown and session interaction metrics</p>

                {/* Device distribution bars / radial */}
                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  {devicePieData.map((d) => (
                    <div
                      key={d.name}
                      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 transition hover:border-white/15"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{d.name}</span>
                      <p className="mt-1 text-2xl font-black" style={{ color: d.color }}>
                        {loading ? '—' : `${d.pct}%`}
                      </p>
                      <span className="text-[10px] text-slate-500">{d.value} hits</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sub metrics: Bounce Rate & New vs Returning */}
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-4">
                <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 text-center">
                  <p className="text-2xl font-black text-rose-400">
                    {loading ? '—' : `${detailsData?.advanced?.bounceRate ?? adminOverview?.bounceRate ?? 0}%`}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bounce Rate</p>
                </div>

                <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-2xl font-black text-emerald-400">
                    {loading ? (
                      '—'
                    ) : (
                      (() => {
                        const n = detailsData?.advanced?.newvsReturning?.newCount || 0
                        const r = detailsData?.advanced?.newvsReturning?.returningCount || 0
                        const total = n + r || 1
                        const nPct = Math.round((n / total) * 100)
                        const rPct = Math.round((r / total) * 100)
                        return (
                          <>
                            <span>{nPct}%</span>
                            <span className="text-slate-500 text-xs">/</span>
                            <span className="text-cyan-300 text-sm">{rPct}%</span>
                          </>
                        )
                      })()
                    )}
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">New / Returning</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* 2-COLUMN INTELLIGENCE GRID 2: TOP ROUTES & 24H HEATMAP */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top Visited Routes */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/[0.08] bg-[#0a0e1a]/90 p-5 shadow-xl backdrop-blur-xl"
            >
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <MdTrendingUp className="text-emerald-400 text-lg" />
                Most Traversed App Routes
              </h3>
              <p className="text-xs text-slate-400">Top 5 frontend routes accessed across the ecosystem</p>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="pb-2.5">Rank</th>
                      <th className="pb-2.5">App Path</th>
                      <th className="pb-2.5 text-right">Pageviews</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {loading ? (
                      [...Array(4)].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="py-2.5"><div className="h-4 w-6 rounded bg-white/10" /></td>
                          <td className="py-2.5"><div className="h-4 w-32 rounded bg-white/10" /></td>
                          <td className="py-2.5 text-right"><div className="ml-auto h-4 w-12 rounded bg-white/10" /></td>
                        </tr>
                      ))
                    ) : detailsData?.advanced?.popularPages && detailsData.advanced.popularPages.length > 0 ? (
                      detailsData.advanced.popularPages.map((page, idx) => (
                        <tr key={page.path || idx} className="hover:bg-white/[0.02] transition">
                          <td className="py-2.5 font-bold text-purple-400">#{idx + 1}</td>
                          <td className="py-2.5 font-mono text-slate-200 font-semibold truncate max-w-[240px]">
                            {page.path}
                          </td>
                          <td className="py-2.5 text-right font-black text-white">
                            {page.count.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="py-6 text-center text-slate-500">
                          No routes recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* 24-Hour Diurnal Activity Histogram */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/[0.08] bg-[#0a0e1a]/90 p-5 shadow-xl backdrop-blur-xl"
            >
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <MdAccessTime className="text-amber-400 text-lg" />
                Diurnal Peak Activity (24 Hours)
              </h3>
              <p className="text-xs text-slate-400">Traffic volume distributed across hours of the day (00:00 - 23:00)</p>

              <div className="mt-4 h-[200px] w-full">
                {loading ? (
                  <div className="flex h-full w-full items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={peakHoursData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis
                        dataKey="hourNum"
                        stroke="#64748b"
                        fontSize={10}
                        tickLine={false}
                        tickFormatter={(h) => (h % 3 === 0 ? `${h}h` : '')}
                      />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Bar dataKey="visits" name="Visits" fill="#38bdf8" radius={[4, 4, 0, 0]}>
                        {peakHoursData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.visits > 0 ? 'url(#barGradient)' : 'rgba(255,255,255,0.05)'}
                          />
                        ))}
                      </Bar>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </motion.div>
          </div>

          {/* AI CATALOG RECOMMENDATIONS & CLUSTER AUDIT */}
          {adminOverview && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#101728]/80 to-[#090e1a]/90 p-5 shadow-xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <MdAutoAwesome className="text-purple-400 text-lg" />
                    AI Reading Intelligence & Leaderboard
                  </h3>
                  <p className="text-xs text-slate-400">
                    Calculated reading affinities, top-ranked titles, and catalog engagement
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Popular Books Leaderboard */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Most Opened Titles in Catalog
                  </h4>
                  <div className="space-y-2.5">
                    {adminOverview.popularBooks && adminOverview.popularBooks.length > 0 ? (
                      adminOverview.popularBooks.map((b, idx) => (
                        <div
                          key={b.id || idx}
                          className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5 transition hover:border-purple-500/30 hover:bg-white/[0.04]"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/20 text-xs font-black text-purple-300">
                              #{idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="font-bold text-white text-xs truncate">{b.title}</p>
                              <p className="text-[10px] text-slate-400 truncate">{b.author || 'Unknown'}</p>
                            </div>
                          </div>
                          <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-xs font-bold text-purple-300 whitespace-nowrap">
                            {b.openCount || 0} opens
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">No popular books recorded yet.</p>
                    )}
                  </div>
                </div>

                {/* AI Genre Recommendations */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Top Genre Affinities & Suggested Additions
                  </h4>

                  {adminOverview.aiSuggestions?.topGenres && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {adminOverview.aiSuggestions.topGenres.map((g) => (
                        <span
                          key={g.category}
                          className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300 flex items-center gap-1.5"
                        >
                          <span>📚 {g.category}</span>
                          <span className="rounded-full bg-cyan-400/20 px-1.5 py-0.2 text-[10px]">
                            {g.count} reads
                          </span>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    {adminOverview.aiSuggestions?.books && adminOverview.aiSuggestions.books.length > 0 ? (
                      adminOverview.aiSuggestions.books.slice(0, 3).map((book) => (
                        <div
                          key={book.id}
                          className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] p-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-slate-200 truncate">{book.title}</p>
                            <p className="text-[10px] text-slate-400">{book.category} • {book.author}</p>
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-400">High Affinity</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">No suggestions available yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </main>
      </div>
    </div>
  )
}
