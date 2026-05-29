import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import AdminSidebar from '../components/AdminSidebar'
import apiClient from '../lib/apiClient'

const isDev = import.meta.env.DEV

function AnalyticsCard({ title, value, hint, loading }) {
  return (
    <motion.article
      whileHover={{ y: -3, scale: 1.01 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#111827]/75 to-[#0b0f19]/80 p-5 shadow-lg backdrop-blur-xl"
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition duration-500 group-hover:opacity-100 [background:radial-gradient(circle_at_top_right,rgba(99,102,241,0.04),transparent_50%)]" />
      
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      {loading ? (
        <div className="mt-3 h-8 w-24 animate-pulse rounded bg-white/10" />
      ) : (
        <p className="mt-2.5 text-3xl font-extrabold text-white tracking-tight">{value}</p>
      )}
      {loading ? (
        <div className="mt-2 h-4 w-32 animate-pulse rounded bg-white/5" />
      ) : (
        <p className="mt-2 text-xs text-indigo-300 font-medium">{hint}</p>
      )}
    </motion.article>
  )
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [timeFrame, setTimeFrame] = useState('day') // 'day' | 'month' | 'year'
  const [hoveredPoint, setHoveredPoint] = useState(null)

  useEffect(() => {
    const fetchAnalyticsDetails = async () => {
      try {
        setLoading(true)
        const response = await apiClient.get('/api/analytics/admin/details')
        if (response.data?.success) {
          setData(response.data)
        } else {
          setError('Failed to fetch analytics detail.')
        }
      } catch (err) {
        if (isDev) console.error('Error fetching analytics details:', err)
        setError(err.response?.data?.message || 'Error communicating with analytics service.')
      } finally {
        setLoading(false)
      }
    }
    fetchAnalyticsDetails()
  }, [])

  const chartData = data?.charts?.[timeFrame] || []

  // Custom SVG Chart Math
  const maxVisits = chartData.length > 0 ? Math.max(...chartData.map(d => d.visits), 10) : 100
  const yMax = maxVisits * 1.15 // 15% top margin padding

  const svgWidth = 1000
  const svgHeight = 320
  const paddingLeft = 60
  const paddingRight = 20
  const paddingTop = 30
  const paddingBottom = 40

  const chartWidth = svgWidth - paddingLeft - paddingRight
  const chartHeight = svgHeight - paddingTop - paddingBottom

  const points = chartData.map((d, i) => {
    const x = paddingLeft + (i / (chartData.length - 1 || 1)) * chartWidth
    const y = paddingTop + chartHeight - (d.visits / yMax) * chartHeight
    return { x, y, label: d.label, visits: d.visits }
  })

  const linePath = points.length > 0 
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : ''

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
    : ''

  const gridTicks = [0, 0.25, 0.5, 0.75, 1]
  const gridLines = gridTicks.map(t => {
    const y = paddingTop + chartHeight - t * chartHeight
    const value = Math.round(t * maxVisits)
    return { y, value }
  })

  // Filter labels to prevent overlap
  const labelInterval = Math.max(1, Math.floor(chartData.length / 8))
  const xLabels = points.filter((_, i) => i % labelInterval === 0 || i === points.length - 1)

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#050914] text-slate-100">
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-blue-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-violet-500/20 blur-[130px]" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 gap-4 p-4 lg:grid-cols-[280px_1fr] lg:gap-6 lg:p-6">
        <AdminSidebar />

        <main className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 backdrop-blur-2xl lg:p-8">
          
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-400">Insights & Metrics</p>
            <h2 className="mt-1 text-3xl font-black text-white sm:text-4xl tracking-tight">System Analytics</h2>
            <p className="mt-2 text-sm text-slate-300">Track platform performance, user completions, and page traffic.</p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          {/* Real Metrics Cards */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AnalyticsCard 
              title="Monthly Reads" 
              value={data?.overview?.monthlyReads?.value ?? '0'} 
              hint={data?.overview?.monthlyReads?.hint ?? 'No pages read'} 
              loading={loading}
            />
            <AnalyticsCard 
              title="Completion Rate" 
              value={data?.overview?.completionRate?.value ?? '0%'} 
              hint={data?.overview?.completionRate?.hint ?? 'Completions'} 
              loading={loading}
            />
            <AnalyticsCard 
              title="Avg Session" 
              value={data?.overview?.avgSession?.value ?? '0m'} 
              hint={data?.overview?.avgSession?.hint ?? 'Sessions tracked'} 
              loading={loading}
            />
            <AnalyticsCard 
              title="Returning Readers" 
              value={data?.overview?.returningReaders?.value ?? '0%'} 
              hint={data?.overview?.returningReaders?.hint ?? 'Retention rate'} 
              loading={loading}
            />
          </section>

          {/* Visits Chart Section */}
          <section className="mt-8 rounded-2xl border border-white/10 bg-gradient-to-b from-[#111827]/75 to-[#0b0f19]/80 p-5 shadow-xl backdrop-blur-xl">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Website Traffic Profile</h3>
                <p className="text-xs text-slate-400">Visitor count tracked dynamically across time periods</p>
              </div>

              {/* Time toggle controls */}
              <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
                {[
                  { key: 'day', label: 'Daily (30D)' },
                  { key: 'month', label: 'Monthly (12M)' },
                  { key: 'year', label: 'Yearly (5Y)' }
                ].map((tf) => (
                  <button
                    key={tf.key}
                    type="button"
                    onClick={() => {
                      setTimeFrame(tf.key)
                      setHoveredPoint(null)
                    }}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold tracking-wide transition cursor-pointer ${
                      timeFrame === tf.key
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-full overflow-hidden">
              {loading ? (
                <div className="flex h-[320px] w-full items-center justify-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                </div>
              ) : chartData.length > 0 ? (
                <div className="relative">
                  <svg 
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
                    className="w-full h-auto overflow-visible select-none"
                  >
                    <defs>
                      <linearGradient id="colorVisitsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.0} />
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
                          stroke="rgba(255,255,255,0.05)" 
                          strokeDasharray="4 4" 
                        />
                        <text 
                          x={paddingLeft - 12} 
                          y={gl.y + 4} 
                          fill="#94a3b8" 
                          fontSize={11} 
                          textAnchor="end"
                          className="font-medium"
                        >
                          {gl.value.toLocaleString()}
                        </text>
                      </g>
                    ))}

                    {/* Gradient Area Fill */}
                    {areaPath && (
                      <path 
                        d={areaPath} 
                        fill="url(#colorVisitsGrad)" 
                      />
                    )}

                    {/* Spline Path */}
                    {linePath && (
                      <path 
                        d={linePath} 
                        fill="none" 
                        stroke="#6366f1" 
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
                        fill="#94a3b8"
                        fontSize={10}
                        textAnchor="middle"
                        className="font-medium"
                      >
                        {p.label}
                      </text>
                    ))}

                    {/* Hover Interactive Zones */}
                    {points.map((p, i) => (
                      <g key={i}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={16}
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredPoint({ ...p, index: i })}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                        {hoveredPoint?.index === i && (
                          <>
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={6}
                              fill="#6366f1"
                              stroke="#fff"
                              strokeWidth={2}
                              className="pointer-events-none"
                            />
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={12}
                              fill="transparent"
                              stroke="#6366f1"
                              strokeWidth={1.5}
                              className="pointer-events-none animate-ping"
                            />
                          </>
                        )}
                      </g>
                    ))}
                  </svg>

                  {/* Absolute HTML Tooltip */}
                  {hoveredPoint && (
                    <div
                      className="absolute z-50 rounded-xl border border-white/12 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-xl pointer-events-none transition-all duration-150"
                      style={{
                        left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                        top: `${(hoveredPoint.y / svgHeight) * 100 - 10}%`,
                        transform: 'translate(-50%, -100%)',
                      }}
                    >
                      <p className="text-[10px] font-semibold text-slate-400">{hoveredPoint.label}</p>
                      <p className="mt-1 text-xs font-black text-indigo-400 whitespace-nowrap">
                        📈 {hoveredPoint.visits.toLocaleString()} visits
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-[320px] w-full items-center justify-center text-slate-500 text-sm">
                  No traffic information recorded yet.
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
