const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
const headers = () => ({
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
})

export async function analyzeLearning(payload) {
  const res = await fetch(`${baseUrl}/ai-analyze`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Analyze failed (${res.status}) ${txt}`)
  }
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

export async function coachReply(payload, onToken, options = {}) {
  const res = await fetch(`${baseUrl}/ai-coach`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
    signal: options.signal
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Coach failed (${res.status}) ${txt}`)
  }
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  if (typeof data.reply !== 'string') throw new Error('Malformed coach reply')
  // Simulate streaming token-by-token for the typing animation.
  const reply = data.reply
  if (!onToken) return reply
  const tokens = reply.match(/\S+\s*|\s+/g) || [reply]
  for (const t of tokens) {
    if (options.signal?.aborted) throw new DOMException('Request aborted', 'AbortError')
    onToken(t)
    await new Promise((r) => setTimeout(r, 14))
  }
  return reply
}
