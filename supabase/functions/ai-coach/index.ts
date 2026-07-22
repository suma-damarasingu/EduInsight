import { getCorsHeaders, generateCoachReply } from '../_ai/engine.js'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: getCorsHeaders() })
  }
  try {
    const body = await req.json().catch(() => ({}))
    const { systemPrompt, messages, message, history } = body
    const normalizedMessages = Array.isArray(messages)
      ? messages
      : [
          ...(Array.isArray(history) ? history : []),
          ...(message ? [{ role: 'user', content: message }] : [])
        ]

    if (!Array.isArray(normalizedMessages) || normalizedMessages.length === 0) {
      return new Response(JSON.stringify({ error: 'message or messages array required' }), {
        status: 400, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' }
      })
    }
    const result = await generateCoachReply({ systemPrompt, messages: normalizedMessages })
    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' }
    })
  }
})
