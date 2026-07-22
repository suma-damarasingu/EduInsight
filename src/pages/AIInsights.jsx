import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RadialBarChart, RadialBar, ResponsiveContainer, Cell, PolarAngleAxis
} from 'recharts'
import { FiCpu, FiZap, FiClock, FiAlertTriangle, FiCheckCircle, FiTarget, FiTrendingUp, FiSun } from 'react-icons/fi'
import Card from '../components/ui/Card'
import Skeleton from '../components/ui/Skeleton'
import Spinner from '../components/ui/Spinner'
import { fetchSessions } from '../lib/sessions'
import { analyzeLearning } from '../lib/ai'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { totalStudyTime, totalBreakTime, totalDistractionTime, avgFocus, avgEfficiency, topSubject } from '../lib/stats'
import { formatTime } from '../lib/utils'

export default function AIInsights() {
  const { profile } = useAuth()
  const toast = useToast()
  const [sessions, setSessions] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => { fetchSessions().then(setSessions).catch(() => setSessions([])) }, [])

  const analyze = async () => {
    if (!sessions || sessions.length === 0) {
      toast.error('Log some study sessions first to analyze.')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await analyzeLearning({
        profile: { full_name: profile?.full_name, learning_goal: profile?.learning_goal },
        sessions,
        mode: 'insights'
      })
      setResult(res)
    } catch (e) {
      toast.error(e.message || 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const focus = avgFocus(sessions || [])
  const focusData = [{ name: 'focus', value: focus, fill: '#0F766E' }]

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <Card className="p-6 sm:p-8 bg-gradient-to-br from-primary-700 to-secondary text-white relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute right-20 top-16 w-24 h-24 rounded-full bg-white/10" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="badge bg-white/15 text-white"><FiCpu /> Powered by AI</span>
            <h1 className="text-2xl sm:text-3xl font-bold mt-3">Your Learning Insights</h1>
            <p className="text-white/85 mt-1 max-w-lg">
              We analyze your study sessions to detect learning waste and surface personalized recommendations.
            </p>
          </div>
          <button onClick={analyze} disabled={loading} className="btn bg-white text-primary-600 hover:bg-white/90 self-start sm:self-auto">
            {loading ? <><Spinner size={16} /> Analyzing…</> : <><FiZap /> Analyze My Learning</>}
          </button>
        </div>
      </Card>

      {/* Loading skeleton */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid lg:grid-cols-3 gap-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-48 lg:col-span-3" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {result && !loading && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InsightStat icon={<FiClock />} label="Focus Time" value={formatTime(totalStudyTime(sessions || []))} color="from-primary-700 to-primary-500" />
            <InsightStat icon={<FiCheckCircle />} label="Break Time" value={formatTime(totalBreakTime(sessions || []))} color="from-secondary to-primary-600" />
            <InsightStat icon={<FiAlertTriangle />} label="Distraction Time" value={formatTime(totalDistractionTime(sessions || []))} color="from-stone-700 to-stone-500" />
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="p-5">
              <h3 className="font-semibold text-ink">Focus Score</h3>
              <div className="relative mt-2">
                <ResponsiveContainer width="100%" height={180}>
                  <RadialBarChart innerRadius="70%" outerRadius="100%" data={focusData} startAngle={90} endAngle={-270}>
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar background dataKey="value" cornerRadius={20}>
                      <Cell fill="#0F766E" />
                    </RadialBar>
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="text-3xl font-bold text-ink">{focus}%</div>
                  <div className="text-xs text-ink-muted">Avg Focus</div>
                </div>
              </div>
            </Card>

            <Card className="lg:col-span-2 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="grid place-items-center w-9 h-9 rounded-xl bg-primary-50 text-primary-600"><FiCpu size={18} /></div>
                <h3 className="font-semibold text-ink">AI Summary</h3>
              </div>
              <div className="prose-chat text-sm text-ink-soft bg-bg-soft rounded-xl p-4 border border-line" dangerouslySetInnerHTML={{ __html: result.summary || result.analysis || '' }} />
            </Card>
          </div>

          {result.recommendation && (
            <Card className="p-5 bg-gradient-to-br from-primary-50 to-secondary/20 border-primary-200">
              <div className="flex items-start gap-3">
                <div className="grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-700 to-secondary text-white shrink-0"><FiSun size={20} /></div>
                <div>
                  <h3 className="font-semibold text-ink">Personalized Recommendation</h3>
                  <div className="prose-chat text-sm text-ink-soft mt-1" dangerouslySetInnerHTML={{ __html: result.recommendation }} />
                </div>
              </div>
            </Card>
          )}

          {result.waste && (
            <Card className="p-5">
              <h3 className="font-semibold text-ink flex items-center gap-2"><FiAlertTriangle className="text-stone-500" /> Learning Waste Detected</h3>
              <div className="prose-chat text-sm text-ink-soft mt-1" dangerouslySetInnerHTML={{ __html: result.waste }} />
            </Card>
          )}
        </motion.div>
      )}

      {!result && !loading && (
        <Card className="p-10 text-center">
          <div className="grid place-items-center w-14 h-14 rounded-2xl bg-primary-50 text-primary-600 mx-auto mb-4">
            <FiTarget size={26} />
          </div>
          <h3 className="font-semibold text-ink text-lg">Ready to detect your learning waste?</h3>
          <p className="text-ink-muted text-sm mt-1 max-w-md mx-auto">
            Click <b>Analyze My Learning</b> above. We'll review your {sessions?.length || 0} sessions and generate a personalized breakdown of focus, distractions, and recommendations.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-5 text-xs">
            <span className="badge bg-primary-50 text-primary-600"><FiTrendingUp /> Efficiency {avgEfficiency(sessions || [])}%</span>
            <span className="badge bg-emerald-50 text-emerald-600"><FiCheckCircle /> Top: {topSubject(sessions || []) || '—'}</span>
          </div>
        </Card>
      )}
    </div>
  )
}

function InsightStat({ icon, label, value, color }) {
  return (
    <Card className="p-5">
      <div className={`grid place-items-center w-10 h-10 rounded-xl text-white bg-gradient-to-br ${color} shadow-soft`}>{icon}</div>
      <div className="mt-3 text-2xl font-bold text-ink">{value}</div>
      <div className="text-sm text-ink-soft">{label}</div>
    </Card>
  )
}
