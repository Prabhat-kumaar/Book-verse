import React, { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

const isDev = import.meta.env.DEV

export default function AdminAnalyticsPage() {
  const [detailsData, setDetailsData] = useState(null)
  const [adminOverview, setAdminOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [timeFrame, setTimeFrame] = useState('day') // 'day' | 'month' | 'year'
  const [hoveredPoint, setHoveredPoint] = useState(null)
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
        setError('Unable to reach telemetry service. Showing cached metrics.')
      }
    } catch (err) {
      if (isDev) console.error('Error fetching analytics details:', err)
      setError('Telemetry service temporarily unavailable.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllAnalytics()
  }, [])

  const chartData = useMemo(() => {
    const raw = detailsData?.charts?.[timeFrame]
    return Array.isArray(raw) ? raw : []
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

  // Device Breakdown calculations
  const deviceStats = useMemo(() => {
    const raw = detailsData?.advanced?.deviceBreakdown || { Desktop: 0, Mobile: 0, Tablet: 0 }
    const total = (raw.Desktop || 0) + (raw.Mobile || 0) + (raw.Tablet || 0) || 1
    return [
      { name: 'Desktop', value: raw.Desktop || 0, color: '#818cf8', pct: Math.round(((raw.Desktop || 0) / total) * 100) },
      { name: 'Mobile', value: raw.Mobile || 0, color: '#22d3ee', pct: Math.round(((raw.Mobile || 0) / total) * 100) },
      { name: 'Tablet', value: raw.Tablet || 0, color: '#c084fc', pct: Math.round(((raw.Tablet || 0) / total) * 100) },
    ]
  }, [detailsData])

  // Custom SVG Traffic Chart Math
  const maxVisits = chartData.length > 0 ? Math.max(...chartData.map((d) => Math.max(d?.visits || 0, d?.unique || 0)), 10) : 100
  const yMax = maxVisits * 1.15

  const svgWidth = 1000
  const svgHeight = 320
  const paddingLeft = 55
  const paddingRight = 20
  const paddingTop = 30
  const paddingBottom = 40

  const chartWidth = svgWidth - paddingLeft - paddingRight
  const chartHeight = svgHeight - paddingTop - paddingBottom

  const pointsVisits = chartData.map((d, i) => {
    const denom = Math.max(1, chartData.length - 1)
    const x = paddingLeft + (i / denom) * chartWidth
    const y = paddingTop + chartHeight - ((d?.visits || 0) / yMax) * chartHeight
    return { x, y, label: d?.label || '', visits: d?.visits || 0, unique: d?.unique || 0 }
  })

  const pointsUnique = chartData.map((d, i) => {
    const denom = Math.max(1, chartData.length - 1)
    const x = paddingLeft + (i / denom) * chartWidth
    const y = paddingTop + chartHeight - ((d?.unique || 0) / yMax) * chartHeight
    return { x, y, label: d?.label || '', visits: d?.visits || 0, unique: d?.unique || 0 }
  })

  const linePathVisits = pointsVisits.length > 0
    ? pointsVisits.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
    : ''

  const areaPathVisits = pointsVisits.length > 0
    ? `${linePathVisits} L ${pointsVisits[pointsVisits.length - 1].x.toFixed(1)} ${paddingTop + chartHeight} L ${pointsVisits[0].x.toFixed(1)} ${paddingTop + chartHeight} Z`
    : ''

  const linePathUnique = pointsUnique.length > 0
    ? pointsUnique.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
    : ''

  const areaPathUnique = pointsUnique.length > 0
    ? `${linePathUnique} L ${pointsUnique[pointsUnique.length - 1].x.toFixed(1)} ${paddingTop + chartHeight} L ${pointsUnique[0].x.toFixed(1)} ${paddingTop + chartHeight} Z`
    : ''

  const gridTicks = [0, 0.25, 0.5, 0.75, 1]
  const gridLines = gridTicks.map((t) => {
    const y = paddingTop + chartHeight - t * chartHeight
    const value = Math.round(t * maxVisits)
    return { y, value }
  })

  const labelInterval = Math.max(1, Math.floor(chartData.length / 8))
  const xLabels = pointsVisits.filter((_, i) => i % labelInterval === 0 || i === pointsVisits.length - 1)

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
            className="fixed right-6 top-6 z-[120] flex items-center gap-3 rounded-2xl border border-white/15 bg-[#0f172a]/95 px-5 py-3.5 text-sm font-medium text-white shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
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
              <MdInfoOutline className="text-xl text-rose-400 shrink-0" />
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

          {/* PRIMARY TRAFFIC OBSERVATORY CHART (High-Performance Native SVG) */}
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
                    onClick={() => {
                      setTimeFrame(tf.key)
                      setHoveredPoint(null)
                    }}
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

            {/* SVG Area Container */}
            <div className="relative w-full overflow-hidden">
              {loading ? (
                <div className="flex h-[320px] w-full items-center justify-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
                </div>
              ) : chartData.length > 0 ? (
                <div className="relative">
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="w-full h-auto overflow-visible select-none"
                  >
                    <defs>
                      <linearGradient id="purpleVisitsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#a855f7" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="cyanUniqueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Gridlines */}
                    {gridLines.map((gl, i) => (
                      <g key={i}>
                        <line
                          x1={paddingLeft}
                          y1={gl.y}
                          x2={svgWidth - paddingRight}
                          y2={gl.y}
                          stroke="rgba(255,255,255,0.06)"
                          strokeDasharray="4 4"
                        />
                        <text
                          x={paddingLeft - 10}
                          y={gl.y + 4}
                          fill="#64748b"
                          fontSize={10}
                          textAnchor="end"
                          className="font-medium"
                        >
                          {gl.value >= 1000 ? `${(gl.value / 1000).toFixed(1)}k` : gl.value}
                        </text>
                      </g>
                    ))}

                    {/* Gradient Area Fills */}
                    {areaPathVisits && (
                      <path d={areaPathVisits} fill="url(#purpleVisitsGrad)" />
                    )}
                    {areaPathUnique && (
                      <path d={areaPathUnique} fill="url(#cyanUniqueGrad)" />
                    )}

                    {/* Line Paths */}
                    {linePathVisits && (
                      <path
                        d={linePathVisits}
                        fill="none"
                        stroke="#a855f7"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                      />
                    )}
                    {linePathUnique && (
                      <path
                        d={linePathUnique}
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                      />
                    )}

                    {/* X-Axis labels */}
                    {xLabels.map((p, i) => (
                      <text
                        key={i}
                        x={p.x}
                        y={svgHeight - 12}
                        fill="#64748b"
                        fontSize={10}
                        textAnchor="middle"
                        className="font-medium"
                      >
                        {p.label}
                      </text>
                    ))}

                    {/* Hover Interactive Zones */}
                    {pointsVisits.map((p, i) => {
                      const uPoint = pointsUnique[i] || p
                      return (
                        <g key={i}>
                          {hoveredPoint?.index === i && (
                            <line
                              x1={p.x}
                              y1={paddingTop}
                              x2={p.x}
                              y2={paddingTop + chartHeight}
                              stroke="rgba(255,255,255,0.2)"
                              strokeWidth={1.5}
                              strokeDasharray="3 3"
                              className="pointer-events-none"
                            />
                          )}
                          <rect
                            x={p.x - chartWidth / (chartData.length * 2)}
                            y={paddingTop}
                            width={chartWidth / (chartData.length || 1)}
                            height={chartHeight}
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() =>
                              setHoveredPoint({
                                x: p.x,
                                y: (p.y + uPoint.y) / 2,
                                label: p.label,
                                visits: p.visits,
                                unique: uPoint.unique,
                                index: i,
                              })
                            }
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                          {hoveredPoint?.index === i && (
                            <>
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r={5}
                                fill="#a855f7"
                                stroke="#fff"
                                strokeWidth={2}
                                className="pointer-events-none"
                              />
                              <circle
                                cx={uPoint.x}
                                cy={uPoint.y}
                                r={5}
                                fill="#06b6d4"
                                stroke="#fff"
                                strokeWidth={2}
                                className="pointer-events-none"
                              />
                            </>
                          )}
                        </g>
                      )
                    })}
                  </svg>

                  {/* Absolute HTML Glass Tooltip */}
                  {hoveredPoint && (
                    <div
                      className="absolute z-50 rounded-2xl border border-white/15 bg-[#090d18]/95 p-3.5 shadow-2xl backdrop-blur-2xl pointer-events-none transition-all duration-150 min-w-[180px]"
                      style={{
                        left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                        top: `${(hoveredPoint.y / svgHeight) * 100 - 15}%`,
                        transform:
                          hoveredPoint.x / svgWidth > 0.8
                            ? 'translate(-100%, -120%)'
                            : hoveredPoint.x / svgWidth < 0.2
                            ? 'translate(0%, -120%)'
                            : 'translate(-50%, -120%)',
                      }}
                    >
                      <p className="text-[11px] font-bold text-slate-300 border-b border-white/10 pb-1 mb-1.5">
                        {hoveredPoint.label}
                      </p>
                      <div className="space-y-1 text-xs font-semibold">
                        <div className="flex items-center justify-between gap-4 text-purple-300">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-purple-500" />
                            Total Visits:
                          </span>
                          <span className="font-black text-white">{hoveredPoint.visits.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-cyan-300">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-cyan-400" />
                            Unique Visitors:
                          </span>
                          <span className="font-black text-white">{hoveredPoint.unique.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-[320px] w-full items-center justify-center text-slate-500 text-sm">
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

                {/* Device distribution bars */}
                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  {deviceStats.map((d) => (
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

              <div className="mt-4 w-full overflow-hidden">
                {loading ? (
                  <div className="flex h-[180px] w-full items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
                  </div>
                ) : (
                  (() => {
                    const peakHours = detailsData?.advanced?.peakHours || Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }))
                    const maxHourCount = Math.max(...peakHours.map((p) => p.count), 5)
                    return (
                      <svg viewBox="0 0 800 200" className="w-full h-auto overflow-visible select-none">
                        <defs>
                          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#a855f7" />
                            <stop offset="100%" stopColor="#06b6d4" />
                          </linearGradient>
                        </defs>
                        {peakHours.map((ph, idx) => {
                          const barWidth = 20
                          const gap = 11
                          const x = 30 + idx * (barWidth + gap)
                          const barHeight = (ph.count / maxHourCount) * 140
                          const y = 170 - barHeight
                          return (
                            <g key={idx} className="group cursor-pointer">
                              <rect x={x - 2} y={10} width={barWidth + 4} height={160} fill="transparent" />
                              <rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                rx="3"
                                fill="url(#barGradient)"
                                className="transition-all duration-300 hover:opacity-80"
                              />
                              {idx % 4 === 0 && (
                                <text
                                  x={x + barWidth / 2}
                                  y="192"
                                  fill="#64748b"
                                  fontSize="10"
                                  textAnchor="middle"
                                  className="font-semibold"
                                >
                                  {ph.hour}h
                                </text>
                              )}
                              <title>{`${ph.hour}:00 - ${ph.count} visits`}</title>
                            </g>
                          )
                        })}
                      </svg>
                    )
                  })()
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
