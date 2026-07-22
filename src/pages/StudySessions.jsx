import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiClock, FiBookOpen, FiX } from 'react-icons/fi'
import Card from '../components/ui/Card'
import Skeleton from '../components/ui/Skeleton'
import { fetchSessions, createSession, updateSession, deleteSession } from '../lib/sessions'
import { totalStudyTime, avgStudyTime } from '../lib/stats'
import { formatTime, formatDate, todayISO, focusScore, efficiency } from '../lib/utils'
import { useToast } from '../context/ToastContext'

const SUBJECT_COLORS = ['#0F766E', '#166534', '#15803D', '#36544B', '#4B5A57', '#6B7471', '#8A948F']

const defaultForm = {
  subject: '',
  study_date: todayISO(),
  study_time: '',
  break_time: '',
  distraction_time: '',
  notes: ''
}

export default function StudySessions() {
  const toast = useToast()
  const [sessions, setSessions] = useState(null)
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({ defaultValues: defaultForm })

  const load = () => fetchSessions().then(setSessions).catch(() => setSessions([]))
  useEffect(() => { load() }, [])

  const subjects = useMemo(() => {
    if (!sessions) return []
    return Array.from(new Set(sessions.map((s) => s.subject)))
  }, [sessions])

  const filtered = useMemo(() => {
    if (!sessions) return []
    return sessions.filter((s) => {
      const matchSearch = !search || s.subject.toLowerCase().includes(search.toLowerCase()) || (s.notes || '').toLowerCase().includes(search.toLowerCase())
      const matchSubject = subjectFilter === 'all' || s.subject === subjectFilter
      return matchSearch && matchSubject
    })
  }, [sessions, search, subjectFilter])

  const stats = useMemo(() => ({
    total: totalStudyTime(filtered),
    avg: avgStudyTime(filtered),
    count: filtered.length
  }), [filtered])

  const onSubmit = async (data) => {
    setSubmitting(true)
    try {
      if (editingId) {
        await updateSession(editingId, data)
        toast.success('Session updated')
      } else {
        await createSession(data)
        toast.success('Session saved')
      }
      reset(defaultForm)
      setEditingId(null)
      load()
    } catch (e) {
      toast.error(e.message || 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  const onEdit = (s) => {
    setEditingId(s.id)
    setValue('subject', s.subject)
    setValue('study_date', s.study_date)
    setValue('study_time', s.study_time)
    setValue('break_time', s.break_time)
    setValue('distraction_time', s.distraction_time)
    setValue('notes', s.notes || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onCancelEdit = () => {
    setEditingId(null)
    reset(defaultForm)
  }

  const onDelete = async () => {
    if (!confirmDelete) return
    try {
      await deleteSession(confirmDelete.id)
      toast.success('Session deleted')
      setConfirmDelete(null)
      load()
    } catch (e) {
      toast.error(e.message || 'Delete failed')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-ink">Study Sessions</h1>
        <p className="text-ink-muted mt-1">Log sessions, track focus, and detect wasted time.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {sessions ? (
          <>
            <MiniStat icon={<FiClock />} label="Total Study Time" value={formatTime(stats.total)} />
            <MiniStat icon={<FiClock />} label="Average Study Time" value={formatTime(stats.avg)} />
            <MiniStat icon={<FiBookOpen />} label="Total Sessions" value={stats.count} />
          </>
        ) : (
          [0,1,2].map((i) => <Skeleton key={i} className="h-20" />)
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink">{editingId ? 'Edit Session' : 'New Study Session'}</h3>
            {editingId && (
              <button onClick={onCancelEdit} className="text-xs text-stone-600 dark:text-stone-300 font-medium hover:underline">Cancel edit</button>
            )}
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            <div className="grid sm:grid-cols-2 gap-3.5">
              <div>
                <label className="label">Subject</label>
                <input className="input" placeholder="e.g. DSA, DBMS" {...register('subject', { required: 'Subject is required' })} />
                {errors.subject && <p className="text-xs text-stone-600 dark:text-stone-300 mt-1">{errors.subject.message}</p>}
              </div>
              <div>
                <label className="label">Date</label>
                <input type="date" className="input" {...register('study_date', { required: 'Date is required' })} />
                {errors.study_date && <p className="text-xs text-stone-600 dark:text-stone-300 mt-1">{errors.study_date.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3.5">
              <div>
                <label className="label">Study (min)</label>
                <input type="number" min="0" className="input" placeholder="60" {...register('study_time', { required: 'Required', min: { value: 0, message: '≥ 0' } })} />
                {errors.study_time && <p className="text-xs text-stone-600 dark:text-stone-300 mt-1">{errors.study_time.message}</p>}
              </div>
              <div>
                <label className="label">Break (min)</label>
                <input type="number" min="0" className="input" placeholder="10" {...register('break_time', { min: { value: 0, message: '≥ 0' } })} />
              </div>
              <div>
                <label className="label">Distraction (min)</label>
                <input type="number" min="0" className="input" placeholder="15" {...register('distraction_time', { min: { value: 0, message: '≥ 0' } })} />
              </div>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea rows={3} className="input resize-none" placeholder="What did you study? Where did you lose focus?" {...register('notes')} />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => { reset(defaultForm); setEditingId(null) }} className="btn-ghost flex-1">Reset</button>
              <button type="submit" disabled={submitting} className="btn-primary flex-1">
                {submitting ? 'Saving…' : editingId ? 'Update Session' : 'Save Session'}
              </button>
            </div>
          </form>
        </Card>

        {/* List */}
        <Card className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input className="input pl-9" placeholder="Search subject or notes…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="input sm:w-44" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
              <option value="all">All subjects</option>
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {!sessions ? (
            <div className="space-y-2">{[0,1,2,3,4].map((i) => <Skeleton key={i} className="h-20" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-ink-muted text-sm">
              <FiBookOpen className="mx-auto mb-2 text-2xl text-ink-muted/60" />
              {sessions.length === 0 ? 'No sessions yet. Log your first one!' : 'No sessions match your filters.'}
            </div>
          ) : (
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {filtered.map((s, i) => {
                  const fs = focusScore(s)
                  const eff = efficiency(s)
                  return (
                    <motion.div
                      key={s.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="p-3.5 rounded-xl border border-line hover:border-primary-200 hover:shadow-card transition group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl grid place-items-center text-white font-semibold shrink-0" style={{ background: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }}>
                          {s.subject?.[0]?.toUpperCase() || 'S'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold text-ink truncate">{s.subject}</div>
                            <div className="text-xs text-ink-muted shrink-0">{formatDate(s.study_date)}</div>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-ink-soft">
                            <span>Study: <b className="text-ink">{formatTime(s.study_time)}</b></span>
                            <span>Break: <b className="text-ink">{formatTime(s.break_time)}</b></span>
                            <span>Distraction: <b className="text-ink">{formatTime(s.distraction_time)}</b></span>
                          </div>
                          {s.notes && <p className="text-xs text-ink-muted mt-1.5 line-clamp-2">{s.notes}</p>}
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-1.5 rounded-full bg-bg-soft overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-secondary" style={{ width: `${fs}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-ink">{fs}% focus</span>
                            <span className="badge bg-primary-50 text-primary-600">{eff}% eff</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => onEdit(s)} className="grid place-items-center w-8 h-8 rounded-lg text-primary-600 hover:bg-primary-50">
                            <FiEdit2 size={15} />
                          </button>
                          <button onClick={() => setConfirmDelete(s)} className="grid place-items-center w-8 h-8 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700/30">
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </Card>
      </div>

      {/* Delete confirm */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 backdrop-blur-sm p-4"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="card p-6 max-w-sm w-full"
            >
              <div className="grid place-items-center w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-700/30 text-stone-600 dark:text-stone-200 mb-3 mx-auto">
                <FiTrash2 size={22} />
              </div>
              <h3 className="font-semibold text-ink text-center">Delete this session?</h3>
              <p className="text-sm text-ink-muted text-center mt-1">
                "{confirmDelete.subject}" on {formatDate(confirmDelete.study_date)} will be permanently removed.
              </p>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setConfirmDelete(null)} className="btn-ghost flex-1">Cancel</button>
                <button onClick={onDelete} className="btn flex-1 bg-stone-700 text-white hover:bg-stone-800 dark:bg-stone-600 dark:hover:bg-stone-500">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MiniStat({ icon, label, value }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className="grid place-items-center w-10 h-10 rounded-xl bg-primary-50 text-primary-600">{icon}</div>
      <div>
        <div className="text-lg font-bold text-ink leading-tight">{value}</div>
        <div className="text-xs text-ink-muted">{label}</div>
      </div>
    </Card>
  )
}
