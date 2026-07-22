import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  RadialBarChart, RadialBar, Cell, Area, AreaChart
} from 'recharts'
import { FiClock, FiTarget, FiBookOpen, FiZap, FiArrowRight, FiPlus, FiCpu, FiTrendingUp } from 'react-icons/fi'
import Card from '../components/ui/Card'
import AnimatedNumber from '../components/ui/AnimatedNumber'
import Skeleton from '../components/ui/Skeleton'
import { useAuth } from '../context/AuthContext'
import { fetchSessions } from '../lib/sessions'
import {
  totalStudyTime, avgFocus, learningStreak, weeklySeries, avgEfficiency
} from '../lib/stats'
import { formatTime, greeting, formatDate } from '../lib/utils'

const SUBJECT_COLORS = ['#0F766E', '#166534', '#15803D', '#36544B', '#4B5A57', '#6B7471', '#8A948F']

export default function Overview() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState(null)
  const [showLogModal, setShowLogModal] = useState(false)

  useEffect(() => {
    fetchSessions().then(setSessions).catch(() => setSessions([]))
  }, [])

  const stats = useMemo(() => {
    if (!sessions) return null
    return {
      studyTime: totalStudyTime(sessions),
      focus: avgFocus(sessions),
      count: sessions.length,
      streak: learningStreak(sessions),
      efficiency: avgEfficiency(sessions)
    }
  }, [sessions])

  const weekly = useMemo(() => (sessions ? weeklySeries(sessions, 6) : []), [sessions])
  const recent = useMemo(() => (sessions ? sessions.slice(0, 5) : []), [sessions])

  const focusData = [{ name: 'Focus', value: stats?.focus || 0, fill: '#0F766E' }]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink">
            {greeting()}, {profile?.full_name?.split(' ')[0] || 'Student'} 👋
          </h1>
          <p className="text-ink-muted mt-1">Here's your learning progress at a glance.</p>
        </div>
        <button onClick={() => navigate('/app/sessions')} className="btn-primary self-start sm:self-auto">
          <FiPlus /> Log Study Session
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats ? (
          <>
            <StatCard icon={<FiClock />} label="Study Time" value={`${Math.round(stats.studyTime)}m`} sub={formatTime(stats.studyTime)} color="from-primary-700 to-primary-500" />
            <StatCard icon={<FiTarget />} label="Focus Score" value={`${stats.focus}%`} sub="avg focus ratio" color="from-secondary to-primary-600" />
            <StatCard icon={<FiBookOpen />} label="Total Sessions" value={stats.count} sub="logged sessions" color="from-stone-700 to-stone-500" />
            <StatCard icon={<FiZap />} label="Learning Streak" value={`${stats.streak} day${stats.streak === 1 ? '' : 's'}`} sub="consecutive study days" color="from-teal-700 to-emerald-700" />
          </>
        ) : (
          [0,1,2,3].map((i) => <Skeleton key={i} className="h-32" />)
        )}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-ink">Study Activity</h3>
              <p className="text-xs text-ink-muted">Weekly study vs break vs distraction (minutes)</p>
            </div>
            <span className="badge bg-primary-50 text-primary-600"><FiTrendingUp /> 6 weeks</span>
          </div>
          {!sessions ? <Skeleton className="h-64" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weekly} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D7DDDA" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6B7471' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#6B7471' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #D7DDDA', fontSize: 12 }} />
                <Bar dataKey="study" name="Study" fill="#0F766E" radius={[6, 6, 0, 0]} />
                <Bar dataKey="break" name="Break" fill="#6B7471" radius={[6, 6, 0, 0]} />
                <Bar dataKey="distract" name="Distraction" fill="#36544B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-ink">Focus Score</h3>
          <p className="text-xs text-ink-muted">Average focus across sessions</p>
          {!sessions ? <Skeleton className="h-64" /> : (
            <div className="relative mt-2">
              <ResponsiveContainer width="100%" height={220}>
                <RadialBarChart innerRadius="70%" outerRadius="100%" data={focusData} startAngle={90} endAngle={-270}>
                  <RadialBar background dataKey="value" cornerRadius={20}>
                    <Cell fill="#0F766E" />
                  </RadialBar>
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-4xl font-bold text-ink">
                  <AnimatedNumber value={stats?.focus || 0} suffix="%" />
                </div>
                <div className="text-xs text-ink-muted">Focus</div>
              </div>
            </div>
          )}
          <div className="mt-2 text-sm text-ink-soft text-center">
            Efficiency: <span className="font-semibold text-ink">{stats?.efficiency || 0}%</span>
          </div>
        </Card>
      </div>

      {/* Recent + AI card */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-ink">Recent Sessions</h3>
            <button onClick={() => navigate('/app/sessions')} className="text-sm text-primary-600 font-medium hover:underline flex items-center gap-1">
              View all <FiArrowRight />
            </button>
          </div>
          {!sessions ? <div className="space-y-2">{[0,1,2,3].map((i) => <Skeleton key={i} className="h-14" />)}</div> : recent.length === 0 ? (
            <div className="text-center py-10 text-ink-muted text-sm">
              No sessions yet. Click <span className="text-primary-600 font-semibold">Log Study Session</span> to begin.
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-bg-soft transition border border-transparent hover:border-line"
                >
                  <div className="w-10 h-10 rounded-xl grid place-items-center text-white font-semibold" style={{ background: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }}>
                    {s.subject?.[0]?.toUpperCase() || 'S'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-ink truncate">{s.subject}</div>
                    <div className="text-xs text-ink-muted">{formatDate(s.study_date)} · {formatTime(s.study_time)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-ink">{Math.round((Number(s.study_time) / (Number(s.study_time) + Number(s.distraction_time) || 1)) * 100)}%</div>
                    <div className="text-xs text-ink-muted">focus</div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 bg-gradient-to-br from-primary-700 to-secondary text-white relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -right-4 top-10 w-20 h-20 rounded-full bg-white/10" />
          <div className="relative">
            <div className="grid place-items-center w-11 h-11 rounded-xl bg-white/15 backdrop-blur mb-4">
              <FiCpu size={22} />
            </div>
            <h3 className="font-semibold text-lg">AI Learning Coach</h3>
            <p className="text-white/85 text-sm mt-1">
              Ask anything — explanations, quizzes, study plans, interview prep, motivation. Your coach knows your study history.
            </p>
            <button onClick={() => navigate('/app/coach')} className="mt-5 btn bg-white text-primary-600 hover:bg-white/90">
              Open AI Coach <FiArrowRight />
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, color }) {
  return (
    <motion.div whileHover={{ y: -3 }} className="card p-5">
      <div className={`grid place-items-center w-10 h-10 rounded-xl text-white bg-gradient-to-br ${color} shadow-soft`}>
        {icon}
      </div>
      <div className="mt-3 text-2xl font-bold text-ink">{value}</div>
      <div className="text-sm text-ink-soft">{label}</div>
      <div className="text-xs text-ink-muted mt-0.5">{sub}</div>
    </motion.div>
  )
}
