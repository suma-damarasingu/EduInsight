import { supabase } from './supabaseClient'

export async function listChats() {
  const { data, error } = await supabase
    .from('chat_history')
    .select('id, title, created_at, updated_at, messages')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getChat(id) {
  const { data, error } = await supabase
    .from('chat_history')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function newChat(title = 'New Chat') {
  const { data, error } = await supabase
    .from('chat_history')
    .insert({ title })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function saveMessages(id, messages, title) {
  const patch = { messages }
  if (title) patch.title = title
  const { data, error } = await supabase
    .from('chat_history')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteChat(id) {
  const { error } = await supabase.from('chat_history').delete().eq('id', id)
  if (error) throw error
  return true
}
