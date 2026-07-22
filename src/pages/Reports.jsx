import { useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'
import { FiBarChart2, FiTarget, FiBookOpen, FiCpu } from 'react-icons/fi'
import Card from '../components/ui/Card'
import Skeleton from '../components/ui/Skeleton'
import { fetchSessions } from '../lib/sessions'
import { filterByRange, avgStudyTime, avgEfficiency, topSubject, subjectBreakdown, weeklySeries, efficiencyTrend, distribution, totalStudyTime } from '../lib/stats'
import { formatTime } from '../lib/utils'
import { analyzeLearning } from '../lib/ai'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Spinner from '../components/ui/Spinner'

const RANGES = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' }
]

const PIE_COLORS = ['#0F766E', '#166534', '#15803D', '#36544B', '#4B5A57', '#6B7471', '#8A948F']

export default function Reports() {
  const { profile } = useAuth()
  const toast = useToast()
  const [sessions, setSessions] = useState(null)
  const [range, setRange] = useState('week')
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  useEffect(() => { fetchSessions().then(setSessions).catch(() => setSessions([])) }, [])

  const ranged = useMemo(() => (sessions ? filterByRange(sessions, range) : []), [sessions, range])
  const breakdown = useMemo(() => (ranged ? subjectBreakdown(ranged) : []), [ranged])
  const weekly = useMemo(() => (sessions ? weeklySeries(sessions, 6) : []), [sessions])
  const trend = useMemo(() => (sessions ? efficiencyTrend(sessions, 14) : []), [sessions])
  const dist = useMemo(() => (ranged ? distribution(ranged) : []), [ranged])

  const dailyAvg = useMemo(() => avgStudyTime(ranged), [ranged])
  const efficiencyVal = useMemo(() => avgEfficiency(ranged), [ranged])
  const top = useMemo(() => topSubject(ranged), [ranged])

  const generateSummary = async () => {
    setSummaryLoading(true)
    setSummary(null)
    try {
      const res = await analyzeLearning({
        profile: { full_name: profile?.full_name, learning_goal: profile?.learning_goal },
        sessions: ranged,
        mode: 'report'
      })
      setSummary(res.summary || res.analysis || 'No summary returned.')
    } catch (e) {
      toast.error(e.message || 'AI summary failed')
    } finally {
      setSummaryLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink">Reports</h1>
          <p className="text-ink-muted mt-1">Analytics across your study activity.</p>
        </div>
        <div className="inline-flex rounded-xl border border-line bg-white p-1 self-start">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${range === r.key ? 'bg-gradient-to-r from-primary-700 to-secondary text-white shadow-soft' : 'text-ink-soft hover:bg-bg-soft'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {sessions ? (
          <>
            <KPI icon={<FiBarChart2 />} label="Daily Average" value={formatTime(dailyAvg)} color="from-primary-700 to-primary-500" />
            <KPI icon={<FiTarget />} label="Learning Efficiency" value={`${efficiencyVal}%`} color="from-secondary to-primary-600" />
            <KPI icon={<FiBookOpen />} label="Top Subject" value={top || '—'} color="from-stone-700 to-stone-500" />
          </>
        ) : (
          [0,1,2].map((i) => <Skeleton key={i} className="h-28" />)
        )}
      </div>

      {/* Charts grid */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold text-ink">Subject-wise Study Time</h3>
          <p className="text-xs text-ink-muted mb-3">Minutes per subject in selected range</p>
          {!sessions ? <Skeleton className="h-64" /> : breakdown.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={breakdown} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#D7DDDA" />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#6B7471' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#43504D' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #D7DDDA', fontSize: 12 }} />
                <Bar dataKey="value" name="Minutes" radius={[0, 6, 6, 0]}>
                  {breakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-ink">Weekly Study Chart</h3>
          <p className="text-xs text-ink-muted mb-3">Last 6 weeks of study minutes</p>
          {!sessions ? <Skeleton className="h-64" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D7DDDA" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6B7471' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#6B7471' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #D7DDDA', fontSize: 12 }} />
                <Bar dataKey="study" name="Study" fill="#0F766E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-ink">Learning Efficiency Trend</h3>
          <p className="text-xs text-ink-muted mb-3">Daily efficiency & focus (14 days)</p>
          {!sessions ? <Skeleton className="h-64" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D7DDDA" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7471' }} axisLine={false} tickLine={false} interval={1} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#6B7471' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #D7DDDA', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="efficiency" name="Efficiency" stroke="#0F766E" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="focus" name="Focus" stroke="#15803D" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-ink">Study Distribution</h3>
          <p className="text-xs text-ink-muted mb-3">Study vs Break vs Distraction</p>
          {!sessions ? <Skeleton className="h-64" /> : dist.every((d) => d.value === 0) ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={dist} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {dist.map((_, i) => <Cell key={i} fill={['#0F766E', '#6B7471', '#36544B'][i]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #D7DDDA', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* AI summary */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary-700 to-secondary text-white">
              <FiCpu size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-ink">AI Learning Summary</h3>
              <p className="text-xs text-ink-muted">Generated from your {RANGES.find((r) => r.key === range)?.label.toLowerCase()} data</p>
            </div>
          </div>
          <button onClick={generateSummary} disabled={summaryLoading} className="btn-primary">
            {summaryLoading ? <><Spinner size={16} /> Generating…</> : 'Generate Summary'}
          </button>
        </div>
        {summaryLoading ? (
          <div className="space-y-2">{[0,1,2,3].map((i) => <Skeleton key={i} className="h-4" style={{ width: `${90 - i * 10}%` }} />)}</div>
        ) : summary ? (
          <div className="prose-chat text-sm text-ink-soft bg-bg-soft rounded-xl p-4 border border-line" dangerouslySetInnerHTML={{ __html: summary }} />
        ) : (
          <p className="text-sm text-ink-muted">Click <b>Generate Summary</b> to get an AI analysis of your learning patterns.</p>
        )}
      </Card>
    </div>
  )
}

function KPI({ icon, label, value, color }) {
  return (
    <Card className="p-5">
      <div className={`grid place-items-center w-10 h-10 rounded-xl text-white bg-gradient-to-br ${color} shadow-soft`}>{icon}</div>
      <div className="mt-3 text-xl font-bold text-ink truncate">{value}</div>
      <div className="text-sm text-ink-soft">{label}</div>
    </Card>
  )
}

function Empty() {
  return <div className="grid place-items-center h-64 text-sm text-ink-muted">No data for this range yet.</div>
}
