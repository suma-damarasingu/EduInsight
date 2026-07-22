import { getCorsHeaders, generateInsights } from '../_ai/engine.js'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: getCorsHeaders() })
  }
  try {
    const body = await req.json().catch(() => ({}))
    const { profile, sessions, mode } = body
    if (!Array.isArray(sessions)) {
      return new Response(JSON.stringify({ error: 'sessions array required' }), {
        status: 400, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' }
      })
    }
    const result = await generateInsights({ profile, sessions, mode })
    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' }
    })
  }
})
