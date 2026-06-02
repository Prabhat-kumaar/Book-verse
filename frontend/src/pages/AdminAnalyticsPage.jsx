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

function TodayStatCard({ icon, title, value, label, loading }) {
  return (
    <motion.article
      whileHover={{ y: -3, scale: 1.01 }}
      className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#111827]/80 to-[#0b0f19]/85 p-5 shadow-lg backdrop-blur-xl"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-300/25 bg-blue-500/15 text-2xl">
          {icon}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          {loading ? (
            <div className="mt-2 h-8 w-20 animate-pulse rounded bg-white/10" />
          ) : (
            <p className="mt-1 text-3xl font-extrabold text-white tracking-tight">{value}</p>
          )}
          <p className="mt-1 text-xs font-medium text-indigo-300">{label}</p>
        </div>
      </div>
    </motion.article>
  )
}

function RadialMetric({ label, pct, color }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const strokeDashoffset = circ - (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <svg className="h-full w-full -rotate-90">
          <circle cx="48" cy="48" r={r} fill="transparent" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
          <circle 
            cx="48" cy="48" r={r} fill="transparent" stroke={color} strokeWidth="8" 
            strokeDasharray={circ} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <span className="absolute text-sm font-extrabold text-white">{pct}%</span>
      </div>
      <span className="text-xs font-semibold text-slate-400">{label}</span>
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
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
      link.download = 'analytics-export.csv'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      if (isDev) console.error('Error exporting analytics CSV:', err)
      setError(err.response?.data?.message || 'Error exporting analytics CSV.')
    } finally {
      setExporting(false)
    }
  }

  // Custom SVG Chart Math
  const maxVisits = chartData.length > 0 ? Math.max(...chartData.map(d => Math.max(d.visits || 0, d.unique || 0)), 10) : 100
  const yMax = maxVisits * 1.15 // 15% top margin padding

  const svgWidth = 1000
  const svgHeight = 320
  const paddingLeft = 60
  const paddingRight = 20
  const paddingTop = 30
  const paddingBottom = 40

  const chartWidth = svgWidth - paddingLeft - paddingRight
  const chartHeight = svgHeight - paddingTop - paddingBottom

  const pointsVisits = chartData.map((d, i) => {
    const x = paddingLeft + (i / (chartData.length - 1 || 1)) * chartWidth
    const y = paddingTop + chartHeight - ((d.visits || 0) / yMax) * chartHeight
    return { x, y, label: d.label, visits: d.visits, unique: d.unique || 0 }
  })

  const pointsUnique = chartData.map((d, i) => {
    const x = paddingLeft + (i / (chartData.length - 1 || 1)) * chartWidth
    const y = paddingTop + chartHeight - ((d.unique || 0) / yMax) * chartHeight
    return { x, y, label: d.label, visits: d.visits, unique: d.unique || 0 }
  })

  const linePathVisits = pointsVisits.length > 0 
    ? pointsVisits.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : ''

  const areaPathVisits = pointsVisits.length > 0
    ? `${linePathVisits} L ${pointsVisits[pointsVisits.length - 1].x} ${paddingTop + chartHeight} L ${pointsVisits[0].x} ${paddingTop + chartHeight} Z`
    : ''

  const linePathUnique = pointsUnique.length > 0 
    ? pointsUnique.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : ''

  const areaPathUnique = pointsUnique.length > 0
    ? `${linePathUnique} L ${pointsUnique[pointsUnique.length - 1].x} ${paddingTop + chartHeight} L ${pointsUnique[0].x} ${paddingTop + chartHeight} Z`
    : ''

  const gridTicks = [0, 0.25, 0.5, 0.75, 1]
  const gridLines = gridTicks.map(t => {
    const y = paddingTop + chartHeight - t * chartHeight
    const value = Math.round(t * maxVisits)
    return { y, value }
  })

  // Filter labels to prevent overlap
  const labelInterval = Math.max(1, Math.floor(chartData.length / 8))
  const xLabels = pointsVisits.filter((_, i) => i % labelInterval === 0 || i === pointsVisits.length - 1)

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#050914] text-slate-100">
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-blue-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-violet-500/20 blur-[130px]" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 gap-4 p-4 lg:grid-cols-[280px_1fr] lg:gap-6 lg:p-6">
        <AdminSidebar />

        <main className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 backdrop-blur-2xl lg:p-8">
          
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-400">Insights & Metrics</p>
              <h2 className="mt-1 text-3xl font-black text-white sm:text-4xl tracking-tight">System Analytics</h2>
              <p className="mt-2 text-sm text-slate-300">Track platform performance, user completions, and page traffic.</p>
            </div>
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={exporting}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-bold text-white transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          <section className="mb-5 grid gap-4 md:grid-cols-2">
            <TodayStatCard
              icon="👁️"
              title="Today's Visits"
              value={data?.todayVisits ?? 0}
              label="Pageviews today"
              loading={loading}
            />
            <TodayStatCard
              icon="👤"
              title="Today's Unique Visitors"
              value={data?.todayUniqueVisitors ?? 0}
              label="Distinct IPs today"
              loading={loading}
            />
          </section>

          {/* Real Metrics Cards */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <AnalyticsCard 
              title="Total Visits" 
              value={data?.websiteVisits ?? 0} 
              hint="Cumulative pageviews" 
              loading={loading}
            />
            <AnalyticsCard 
              title="Unique Visitors" 
              value={data?.uniqueVisitors ?? 0} 
              hint="Distinct IP entries" 
              loading={loading}
            />
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
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">Website Traffic Profile</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-4 text-xs">
                    <span className="flex items-center gap-1.5 text-indigo-300 font-medium">
                      <span className="h-2 w-2 rounded-full bg-[#6366f1]" />
                      Total Visits
                    </span>
                    <span className="flex items-center gap-1.5 text-cyan-300 font-medium">
                      <span className="h-2 w-2 rounded-full bg-[#06b6d4]" />
                      Unique Visitors
                    </span>
                  </div>
                </div>
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
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorUniqueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.25} />
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

                    {/* Gradient Area Fills */}
                    {areaPathVisits && (
                      <path 
                        d={areaPathVisits} 
                        fill="url(#colorVisitsGrad)" 
                      />
                    )}
                    {areaPathUnique && (
                      <path 
                        d={areaPathUnique} 
                        fill="url(#colorUniqueGrad)" 
                      />
                    )}

                    {/* Line Paths */}
                    {linePathVisits && (
                      <path 
                        d={linePathVisits} 
                        fill="none" 
                        stroke="#6366f1" 
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
                        fill="#94a3b8"
                        fontSize={10}
                        textAnchor="middle"
                        className="font-medium"
                      >
                        {p.label}
                      </text>
                    ))}

                    {/* Hover Interactive Zones */}
                    {pointsVisits.map((p, i) => {
                      const uPoint = pointsUnique[i]
                      return (
                        <g key={i}>
                          {hoveredPoint?.index === i && (
                            <line
                              x1={p.x}
                              y1={paddingTop}
                              x2={p.x}
                              y2={paddingTop + chartHeight}
                              stroke="rgba(255,255,255,0.15)"
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
                            onMouseEnter={() => setHoveredPoint({ 
                              x: p.x, 
                              y: (p.y + uPoint.y) / 2, 
                              label: p.label, 
                              visits: p.visits, 
                              unique: p.unique, 
                              index: i 
                            })}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                          {hoveredPoint?.index === i && (
                            <>
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r={5}
                                fill="#6366f1"
                                stroke="#fff"
                                strokeWidth={1.5}
                                className="pointer-events-none"
                              />
                              <circle
                                cx={uPoint.x}
                                cy={uPoint.y}
                                r={5}
                                fill="#06b6d4"
                                stroke="#fff"
                                strokeWidth={1.5}
                                className="pointer-events-none"
                              />
                            </>
                          )}
                        </g>
                      )
                    })}
                  </svg>

                  {/* Absolute HTML Tooltip */}
                  {hoveredPoint && (() => {
                    const isNearRight = (hoveredPoint.x / svgWidth) > 0.8;
                    const isNearLeft = (hoveredPoint.x / svgWidth) < 0.15;
                    let transformStr = 'translate(-50%, -120%)';
                    if (isNearRight) transformStr = 'translate(-100%, -120%)';
                    else if (isNearLeft) transformStr = 'translate(0%, -120%)';
                    
                    return (
                      <div
                        className="absolute z-50 rounded-xl border border-white/12 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-xl pointer-events-none transition-all duration-150 min-w-[180px]"
                        style={{
                          left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                          top: `${(hoveredPoint.y / svgHeight) * 100 - 10}%`,
                          transform: transformStr,
                        }}
                      >
                        <p className="text-[10px] font-semibold text-slate-400">{hoveredPoint.label}</p>
                        <div className="mt-1.5 space-y-1 text-xs font-bold">
                          <p className="text-indigo-400 whitespace-nowrap flex items-center gap-1.5">
                            <span>●</span>
                            <span>Total Visits: {hoveredPoint.visits.toLocaleString()}</span>
                          </p>
                          <p className="text-cyan-400 whitespace-nowrap flex items-center gap-1.5">
                            <span>●</span>
                            <span>Unique Visitors: {hoveredPoint.unique.toLocaleString()}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="flex h-[320px] w-full items-center justify-center text-slate-500 text-sm">
                  No traffic information recorded yet.
                </div>
              )}
            </div>
          </section>

          {/* New Advanced Insights Grid 1 */}
          <section className="mt-8 grid gap-6 xl:grid-cols-2">
            
            {/* Geographic Origins */}
            <motion.article 
              whileHover={{ y: -3 }}
              className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#111827]/75 to-[#0b0f19]/80 p-6 shadow-lg backdrop-blur-xl"
            >
              <h3 className="text-lg font-bold text-white tracking-tight">Geographic Distribution</h3>
              <p className="text-xs text-slate-400">Top 5 visitor locations resolved by offline country logs</p>

              <div className="mt-6 space-y-4">
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-xs"><div className="h-4 w-16 rounded bg-white/10" /><div className="h-4 w-8 rounded bg-white/10" /></div>
                      <div className="h-2 rounded bg-white/5" />
                    </div>
                  ))
                ) : (data?.advanced?.geographicData && data.advanced.geographicData.length > 0) ? (
                  (() => {
                    const geoData = data.advanced.geographicData
                    const maxCount = Math.max(...geoData.map(g => g.count), 1)
                    return geoData.map((g) => {
                      const pct = Math.round((g.count / maxCount) * 100)
                      return (
                        <div key={g.country} className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                              🌐 {g.country}
                            </span>
                            <span className="font-extrabold text-white">{g.count} views</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-white/[0.04] overflow-hidden border border-white/5">
                            <div 
                              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600" 
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                  })()
                ) : (
                  <div className="text-center text-slate-500 py-6 text-xs">No geographic statistics recorded yet.</div>
                )}
              </div>
            </motion.article>

            {/* Devices & Engagement */}
            <motion.article 
              whileHover={{ y: -3 }}
              className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#111827]/75 to-[#0b0f19]/80 p-6 shadow-lg backdrop-blur-xl flex flex-col justify-between"
            >
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Devices & Engagement</h3>
                <p className="text-xs text-slate-400">Classification of access platforms and session metrics</p>
                
                <div className="mt-6 flex justify-around gap-4">
                  {loading ? (
                    [...Array(3)].map((_, i) => (
                      <div key={i} className="h-24 w-24 animate-pulse rounded-full bg-white/5 border border-white/10" />
                    ))
                  ) : (
                    (() => {
                      const devStats = data?.advanced?.deviceBreakdown || { Desktop: 0, Mobile: 0, Tablet: 0, Unknown: 0 }
                      const totalDev = Object.values(devStats).reduce((a, b) => a + b, 0) || 1
                      const desktopPct = Math.round((devStats.Desktop / totalDev) * 100)
                      const mobilePct = Math.round((devStats.Mobile / totalDev) * 100)
                      const tabletPct = Math.round((devStats.Tablet / totalDev) * 100)
                      return (
                        <>
                          <RadialMetric label="Desktop" pct={desktopPct} color="#6366f1" />
                          <RadialMetric label="Mobile" pct={mobilePct} color="#06b6d4" />
                          <RadialMetric label="Tablet" pct={tabletPct} color="#a855f7" />
                        </>
                      )
                    })()
                  )}
                </div>
              </div>

              <div className="mt-6 border-t border-white/5 pt-6 grid grid-cols-2 gap-4 text-center">
                <div className="rounded-xl bg-white/[0.02] p-3 border border-white/5">
                  <p className="text-2xl font-black text-rose-400">
                    {loading ? '...' : `${data?.advanced?.bounceRate ?? 0}%`}
                  </p>
                  <p className="mt-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">Bounce Rate</p>
                </div>
                <div className="rounded-xl bg-white/[0.02] p-3 border border-white/5">
                  <div className="flex items-center justify-center gap-1.5 text-2xl font-black text-emerald-400">
                    {loading ? (
                      <span>...</span>
                    ) : (
                      (() => {
                         const n = data?.advanced?.newvsReturning?.newCount || 0
                         const r = data?.advanced?.newvsReturning?.returningCount || 0
                         const tot = (n + r) || 1
                         const nPct = Math.round((n / tot) * 100)
                         const rPct = Math.round((r / tot) * 100)
                         return (
                           <>
                             <span>{nPct}%</span>
                             <span className="text-slate-500 text-xs">/</span>
                             <span className="text-cyan-400 text-sm font-bold">{rPct}%</span>
                           </>
                         )
                      })()
                    )}
                  </div>
                  <p className="mt-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">New vs Returning</p>
                </div>
              </div>
            </motion.article>
          </section>

          {/* New Advanced Insights Grid 2 */}
          <section className="mt-8 grid gap-6 xl:grid-cols-2">
            
            {/* Popular Pages */}
            <motion.article 
              whileHover={{ y: -3 }}
              className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#111827]/75 to-[#0b0f19]/80 p-6 shadow-lg backdrop-blur-xl"
            >
              <h3 className="text-lg font-bold text-white tracking-tight">Most Visited Pages</h3>
              <p className="text-xs text-slate-400">Top 5 routes and views tracked across the frontend app</p>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="pb-3">Rank</th>
                      <th className="pb-3">Path</th>
                      <th className="pb-3 text-right">Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      [...Array(3)].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="py-3"><div className="h-4 w-6 rounded bg-white/10" /></td>
                          <td className="py-3"><div className="h-4 w-28 rounded bg-white/10" /></td>
                          <td className="py-3 text-right"><div className="h-4 w-12 ml-auto rounded bg-white/10" /></td>
                        </tr>
                      ))
                    ) : (data?.advanced?.popularPages && data.advanced.popularPages.length > 0) ? (
                      data.advanced.popularPages.map((page, idx) => (
                        <tr key={page.path} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                          <td className="py-3 font-bold text-indigo-300">#{idx + 1}</td>
                          <td className="py-3 font-mono text-slate-200 font-medium truncate max-w-[200px]" title={page.path}>
                            {page.path}
                          </td>
                          <td className="py-3 text-right font-extrabold text-white">
                            {page.count.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="py-8 text-center text-slate-500">No page views recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.article>

            {/* Peak Activity Hours */}
            <motion.article 
              whileHover={{ y: -3 }}
              className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#111827]/75 to-[#0b0f19]/80 p-6 shadow-lg backdrop-blur-xl"
            >
              <h3 className="text-lg font-bold text-white tracking-tight">Active Hours Breakdown</h3>
              <p className="text-xs text-slate-400">Visits count grouped by the hour of day (0 to 23)</p>

              <div className="mt-6 w-full overflow-hidden">
                {loading ? (
                  <div className="flex h-[180px] w-full items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                  </div>
                ) : (
                  (() => {
                    const peakHours = data?.advanced?.peakHours || Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }))
                    const maxHourCount = Math.max(...peakHours.map(p => p.count), 5)
                    return (
                      <svg viewBox="0 0 800 200" className="w-full h-auto overflow-visible select-none">
                        <defs>
                          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#06b6d4" />
                            <stop offset="100%" stopColor="#6366f1" />
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
                                 x={x} y={y} width={barWidth} height={barHeight} rx="3"
                                 fill="rgba(6, 182, 212, 0.15)"
                                 className="opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none filter blur-sm"
                               />
                               <rect 
                                 x={x} y={y} width={barWidth} height={barHeight} rx="3" 
                                 fill="url(#barGradient)"
                                 className="transition-all duration-500 ease-out hover:opacity-80"
                               />
                               {idx % 4 === 0 && (
                                 <text x={x + barWidth / 2} y="192" fill="#94a3b8" fontSize="10" textAnchor="middle" className="font-semibold">
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
             </motion.article>

            </section>
 
          </main>
        </div>
      </div>
    )
  }
