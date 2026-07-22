import { focusScore, efficiency, startOfDay, startOfWeek, startOfMonth, isoStart } from './utils'

export function withinRange(session, fromISO, toISO) {
  const d = new Date(session.study_date)
  const diso = new Date(d.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString()
  if (fromISO && diso < fromISO) return false
  if (toISO && session.study_date > toISO.slice(0, 10)) return false
  return true
}

export function filterByRange(sessions, range) {
  if (range === 'all') return sessions
  const start = range === 'today' ? startOfDay() : range === 'week' ? startOfWeek() : startOfMonth()
  const startISO = isoStart(start)
  return sessions.filter((s) => new Date(s.study_date) >= start)
}

export function totalStudyTime(sessions) {
  return sessions.reduce((a, s) => a + (Number(s.study_time) || 0), 0)
}
export function totalBreakTime(sessions) {
  return sessions.reduce((a, s) => a + (Number(s.break_time) || 0), 0)
}
export function totalDistractionTime(sessions) {
  return sessions.reduce((a, s) => a + (Number(s.distraction_time) || 0), 0)
}
export function avgStudyTime(sessions) {
  if (!sessions.length) return 0
  return totalStudyTime(sessions) / sessions.length
}
export function avgFocus(sessions) {
  if (!sessions.length) return 0
  return Math.round(sessions.reduce((a, s) => a + focusScore(s), 0) / sessions.length)
}
export function avgEfficiency(sessions) {
  if (!sessions.length) return 0
  return Math.round(sessions.reduce((a, s) => a + efficiency(s), 0) / sessions.length)
}
export function learningStreak(sessions) {
  if (!sessions.length) return 0
  const days = new Set(sessions.map((s) => s.study_date))
  let streak = 0
  const d = startOfDay()
  while (days.has(d.toISOString().slice(0, 10))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}
export function topSubject(sessions) {
  const map = {}
  sessions.forEach((s) => { map[s.subject] = (map[s.subject] || 0) + (Number(s.study_time) || 0) })
  let top = null, max = -1
  Object.entries(map).forEach(([k, v]) => { if (v > max) { max = v; top = k } })
  return top
}
export function subjectBreakdown(sessions) {
  const map = {}
  sessions.forEach((s) => {
    map[s.subject] = (map[s.subject] || 0) + (Number(s.study_time) || 0)
  })
  return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value)
}
export function weeklySeries(sessions, weeks = 6) {
  const out = []
  const now = startOfDay()
  for (let i = weeks - 1; i >= 0; i--) {
    const s = startOfWeek(new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000))
    const e = new Date(s.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)
    const label = s.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
    const study = sessions.filter((x) => {
      const d = new Date(x.study_date)
      return d >= s && d <= e
    })
    out.push({
      label,
      study: Math.round(totalStudyTime(study)),
      break: Math.round(totalBreakTime(study)),
      distract: Math.round(totalDistractionTime(study))
    })
  }
  return out
}
export function efficiencyTrend(sessions, days = 14) {
  const out = []
  const now = startOfDay()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const label = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
    const daySessions = sessions.filter((x) => x.study_date === d.toISOString().slice(0, 10))
    out.push({ label, efficiency: avgEfficiency(daySessions), focus: avgFocus(daySessions) })
  }
  return out
}
export function distribution(sessions) {
  return [
    { name: 'Study', value: Math.round(totalStudyTime(sessions)) },
    { name: 'Break', value: Math.round(totalBreakTime(sessions)) },
    { name: 'Distraction', value: Math.round(totalDistractionTime(sessions)) }
  ]
}
