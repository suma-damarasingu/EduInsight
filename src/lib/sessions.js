import { supabase } from './supabaseClient'

export async function fetchSessions({ from, to } = {}) {
  let q = supabase.from('study_sessions').select('*').order('study_date', { ascending: false }).order('created_at', { ascending: false })
  if (from) q = q.gte('study_date', from)
  if (to) q = q.lte('study_date', to)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function createSession(payload) {
  const { data, error } = await supabase
    .from('study_sessions')
    .insert({
      subject: payload.subject,
      study_date: payload.study_date,
      study_time: Number(payload.study_time),
      break_time: Number(payload.break_time || 0),
      distraction_time: Number(payload.distraction_time || 0),
      notes: payload.notes || ''
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSession(id, payload) {
  const { data, error } = await supabase
    .from('study_sessions')
    .update({
      subject: payload.subject,
      study_date: payload.study_date,
      study_time: Number(payload.study_time),
      break_time: Number(payload.break_time || 0),
      distraction_time: Number(payload.distraction_time || 0),
      notes: payload.notes || ''
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSession(id) {
  const { error } = await supabase.from('study_sessions').delete().eq('id', id)
  if (error) throw error
  return true
}
