export function formatDate(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatTime(minutes) {
  if (minutes == null || Number.isNaN(minutes)) return '0m'
  const m = Number(minutes)
  if (m < 60) return `${Math.round(m)}m`
  const h = Math.floor(m / 60)
  const rem = Math.round(m % 60)
  return rem ? `${h}h ${rem}m` : `${h}h`
}

export function todayISO() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

export function startOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function startOfWeek(date = new Date()) {
  const d = startOfDay(date)
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return d
}

export function startOfMonth(date = new Date()) {
  const d = startOfDay(date)
  d.setDate(1)
  return d
}

export function isoStart(date) {
  return date.toISOString()
}

export function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 18) return 'Good Afternoon'
  return 'Good Evening'
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export function focusScore(session) {
  if (!session) return 0
  const study = Number(session.study_time) || 0
  const distract = Number(session.distraction_time) || 0
  if (study + distract === 0) return 0
  return Math.round((study / (study + distract)) * 100)
}

export function efficiency(session) {
  if (!session) return 0
  const study = Number(session.study_time) || 0
  const breakT = Number(session.break_time) || 0
  const distract = Number(session.distraction_time) || 0
  const total = study + breakT + distract
  if (total === 0) return 0
  return Math.round((study / total) * 100)
}
