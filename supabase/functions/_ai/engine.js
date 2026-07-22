const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-flash'
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini'
const OPENROUTER_MODEL = Deno.env.get('OPENROUTER_MODEL') || 'openai/gpt-4o-mini'

export function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey'
  }
}

function hasEnv(name, min = 10) {
  const value = Deno.env.get(name)
  return !!value && value.length > min
}

export function hasGemini() {
  return hasEnv('GEMINI_API_KEY')
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

function mdEscape(s) {
  return String(s || '').replace(/\|/g, '\\|')
}

function computeStats(sessions = []) {
  const bySubject = {}
  let study = 0
  let brk = 0
  let distract = 0

  sessions.forEach((s) => {
    const st = Number(s.study_time) || 0
    const b = Number(s.break_time) || 0
    const d = Number(s.distraction_time) || 0
    study += st
    brk += b
    distract += d
    if (s.subject) bySubject[s.subject] = (bySubject[s.subject] || 0) + st
  })

  const total = study + brk + distract
  const focus = study + distract > 0 ? Math.round((study / (study + distract)) * 100) : 0
  const efficiency = total > 0 ? Math.round((study / total) * 100) : 0
  const wastePct = total > 0 ? Math.round((distract / total) * 100) : 0
  const top = Object.entries(bySubject).sort((a, b) => b[1] - a[1])[0]

  return {
    n: sessions.length,
    study,
    brk,
    distract,
    total,
    focus: clamp(focus, 0, 100),
    efficiency: clamp(efficiency, 0, 100),
    wastePct: clamp(wastePct, 0, 100),
    topSubject: top ? top[0] : null,
    topSubjectTime: top ? top[1] : 0,
    subjects: Object.keys(bySubject),
    bySubject
  }
}

async function callOpenAI(systemPrompt, messages) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.75,
      max_tokens: 1600,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(sanitizeMessage)
      ]
    })
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const reply = data?.choices?.[0]?.message?.content
  if (!reply) throw new Error('OpenAI returned no text')
  return { reply, usage: data.usage || {}, source: 'openai' }
}

async function callOpenRouter(systemPrompt, messages) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': Deno.env.get('APP_URL') || 'https://eduinsight.local',
      'X-Title': 'EduInsight'
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      temperature: 0.75,
      max_tokens: 1600,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(sanitizeMessage)
      ]
    })
  })
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const reply = data?.choices?.[0]?.message?.content
  if (!reply) throw new Error('OpenRouter returned no text')
  return { reply, usage: data.usage || {}, source: 'openrouter' }
}

async function callGeminiText(systemPrompt, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
      generationConfig: { temperature: 0.75, maxOutputTokens: 1600 }
    })
  })
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!reply) throw new Error('Gemini returned no text')
  return reply
}

async function callGemini(systemPrompt, messages) {
  const prompt = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')
  const reply = await callGeminiText(systemPrompt, prompt)
  return { reply, usage: {}, source: 'gemini' }
}

function sanitizeMessage(m) {
  return {
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content || '').slice(0, 5000)
  }
}

function limitConversation(messages) {
  return (messages || []).slice(-12).map(sanitizeMessage)
}

function mdToSimpleHtml(md) {
  return String(md || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\> (.*)$/gm, '<blockquote class="border-l-4 border-primary-300 pl-3 italic text-ink-muted my-2">$1</blockquote>')
    .replace(/^\d+\. (.*)$/gm, '<li>$1</li>')
    .replace(/^- (.*)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
    .replace(/\n{2,}/g, '\n')
    .replace(/\n/g, '<br/>')
    .replace(/<\/ul><br\/><ul>/g, '')
}

function buildInsightsMarkdown(stats, profile = {}) {
  const name = profile.full_name || 'Student'
  const goal = profile.learning_goal || 'not set'
  const recs = []
  if (stats.wastePct >= 25) recs.push('Use 25/5 Pomodoro blocks and log every distraction honestly.')
  if (stats.focus < 60) recs.push('Put your phone away during the next 3 sessions and compare focus scores.')
  if (stats.brk > stats.study * 0.4) recs.push('Reduce break time to under 15% of study time.')
  if (stats.topSubject) recs.push(`Use active recall for **${mdEscape(stats.topSubject)}** instead of passive re-reading.`)
  recs.push(`Plan 5 focused sessions this week for your goal: "${mdEscape(goal)}".`)

  return [
    `### Hi ${mdEscape(name)}, here is your learning analysis`,
    '',
    '| Metric | Value |',
    '|---|---|',
    `| Study sessions | ${stats.n} |`,
    `| Total study time | ${stats.study} min |`,
    `| Break time | ${stats.brk} min |`,
    `| Distraction time | ${stats.distract} min |`,
    `| Focus score | ${stats.focus}% |`,
    `| Learning efficiency | ${stats.efficiency}% |`,
    stats.topSubject ? `| Top subject | ${mdEscape(stats.topSubject)} (${stats.topSubjectTime} min) |` : '',
    '',
    '### AI Summary',
    stats.focus >= 80
      ? 'Your focus is strong. Keep the same rhythm and increase difficulty gradually.'
      : 'Your biggest opportunity is reducing distractions and using shorter, more deliberate study blocks.',
    '',
    '### Learning Waste Detected',
    stats.distract === 0
      ? 'No distraction time is logged yet. Keep tracking honestly so insights stay accurate.'
      : `You logged **${stats.distract} minutes** of distraction, which is **${stats.wastePct}%** of your tracked time.`,
    '',
    '### Personalized Recommendation',
    recs.map((r, i) => `${i + 1}. ${r}`).join('\n')
  ].filter(Boolean).join('\n')
}

export async function generateInsights({ profile, sessions, mode }) {
  const stats = computeStats(sessions)
  const system = [
    'You are EduInsight AI. Analyze student study sessions and return concise markdown.',
    'Return sections: AI Summary, Learning Waste Detected, Personalized Recommendation.',
    `Mode: ${mode || 'insights'}.`
  ].join('\n')

  if (hasEnv('OPENAI_API_KEY', 20)) {
    const result = await callOpenAI(system, [{ role: 'user', content: JSON.stringify({ profile, stats, sessions: (sessions || []).slice(0, 50) }) }])
    return { summary: mdToSimpleHtml(result.reply), recommendation: '', waste: '', stats, raw: result.reply, source: result.source }
  }
  if (hasEnv('OPENROUTER_API_KEY', 20)) {
    const result = await callOpenRouter(system, [{ role: 'user', content: JSON.stringify({ profile, stats, sessions: (sessions || []).slice(0, 50) }) }])
    return { summary: mdToSimpleHtml(result.reply), recommendation: '', waste: '', stats, raw: result.reply, source: result.source }
  }
  if (hasGemini()) {
    const md = await callGeminiText(system, JSON.stringify({ profile, stats, sessions: (sessions || []).slice(0, 50) }))
    return { summary: mdToSimpleHtml(md), recommendation: '', waste: '', stats, raw: md, source: 'gemini' }
  }

  const md = buildInsightsMarkdown(stats, profile)
  return {
    summary: mdToSimpleHtml(md),
    recommendation: mdToSimpleHtml(md.split('### Personalized Recommendation')[1] || ''),
    waste: mdToSimpleHtml(md.split('### Learning Waste Detected')[1]?.split('### Personalized Recommendation')[0] || ''),
    stats,
    raw: md,
    source: 'local'
  }
}

export async function generateCoachReply({ systemPrompt, messages }) {
  const limitedMessages = limitConversation(messages)
  const fullSystemPrompt = [
    systemPrompt || '',
    '',
    'You are EduInsight AI Coach.',
    'Only answer academic and educational questions.',
    'Allowed subjects include programming, computer science, mathematics, physics, chemistry, biology, engineering, DSA, algorithms, DBMS, OS, networks, ML, AI, cloud, cybersecurity, interviews, resume guidance, career advice, soft skills, study plans, time management, exam preparation, and competitive programming.',
    'Politely refuse unrelated requests such as politics, medical diagnosis, adult content, illegal activity, gambling, hacking abuse, violence, or entertainment gossip.',
    'Provide detailed, structured, beginner-friendly explanations with headings, bullets, examples, analogies, and code blocks when useful.',
    'Use prior turns for context. Never return the same generic response for different prompts.'
  ].join('\n')

  if (hasEnv('OPENAI_API_KEY', 20)) return await callOpenAI(fullSystemPrompt, limitedMessages)
  if (hasEnv('OPENROUTER_API_KEY', 20)) return await callOpenRouter(fullSystemPrompt, limitedMessages)
  if (hasGemini()) return await callGemini(fullSystemPrompt, limitedMessages)
  return { reply: localCoachReply(fullSystemPrompt, limitedMessages), usage: {}, source: 'local' }
}

function localCoachReply(systemPrompt, messages) {
  const last = messages[messages.length - 1]
  const raw = String(last?.content || '').trim()
  const q = raw.toLowerCase()
  const ctx = parseContextFromSystem(systemPrompt)
  const name = ctx.name || 'there'

  if (!isEducationalPrompt(q)) {
    return [
      '### I can help with educational topics',
      '',
      'EduInsight AI Coach is limited to academic, learning, interview, resume, and career-development support.',
      '',
      'Try asking about programming, DSA, DBMS, math, science, exam prep, focus, or study planning.'
    ].join('\n')
  }

  if (/java/.test(q)) {
    return [
      '### Java core concepts',
      '',
      'Java is an object-oriented language where code is organized around classes and objects. The source code is compiled into bytecode, and the JVM runs that bytecode on different operating systems.',
      '',
      '#### Key ideas',
      '- **Class**: a blueprint, like `Student`.',
      '- **Object**: a real instance, like `new Student("Asha")`.',
      '- **Encapsulation**: keep data private and expose controlled methods.',
      '- **Inheritance**: reuse behavior from a parent class.',
      '- **Polymorphism**: use one interface with multiple implementations.',
      '',
      '```java',
      'class Student {',
      '  private String name;',
      '',
      '  Student(String name) {',
      '    this.name = name;',
      '  }',
      '',
      '  void introduce() {',
      '    System.out.println("Hi, I am " + name);',
      '  }',
      '}',
      '```'
    ].join('\n')
  }

  if (/dbms|normaliz/.test(q)) {
    return [
      '### Normalization in DBMS',
      '',
      'Normalization organizes database tables to reduce duplicate data and prevent update mistakes.',
      '',
      '#### Forms',
      '- **1NF**: values are atomic; no repeating groups.',
      '- **2NF**: every non-key column depends on the whole key.',
      '- **3NF**: non-key columns do not depend on other non-key columns.',
      '- **BCNF**: every determinant is a candidate key.',
      '',
      '#### Example',
      'Instead of storing `student_name`, `course1`, and `course2` in one row, split data into `students`, `courses`, and `enrollments` tables.'
    ].join('\n')
  }

  if (/dsa|algorithm|array|linked list|stack|queue/.test(q)) {
    return [
      '### DSA revision',
      '',
      '#### Arrays',
      '- O(1) random access.',
      '- O(n) insertion or deletion in the middle.',
      '',
      '#### Linked lists',
      '- O(1) insertion at head if you already have the pointer.',
      '- O(n) search because nodes are not contiguous.',
      '',
      '#### Practice path',
      '1. Solve 3 array traversal problems.',
      '2. Solve 2 two-pointer problems.',
      '3. Implement a linked list insertion and deletion.',
      '4. Compare time complexity after each solution.'
    ].join('\n')
  }

  if (/quiz/.test(q)) {
    const topic = extractTopic(raw)
    return [
      `### 5-question quiz: ${topic}`,
      '',
      '1. Define the main concept in one sentence.',
      '2. Give one real-world use case.',
      '3. Compare it with a related concept.',
      '4. Solve a small example or trace one step-by-step.',
      '5. Name one common beginner mistake.',
      '',
      'Reply with your answers and I will grade them with explanations.'
    ].join('\n')
  }

  if (/study plan|schedule|timetable/.test(q)) {
    return [
      `### 7-day study plan for ${name}`,
      '',
      `Your current focus score is **${ctx.focus || 0}%**, so this plan uses short focused blocks.`,
      '',
      '- **Day 1-2**: Learn the core theory and write short notes.',
      '- **Day 3**: Solve beginner examples without looking at solutions.',
      '- **Day 4**: Review mistakes and make flashcards.',
      '- **Day 5**: Attempt mixed practice questions.',
      '- **Day 6**: Take a timed quiz or mock test.',
      '- **Day 7**: Revise weak areas and summarize the topic in one page.'
    ].join('\n')
  }

  if (/focus|productiv|distraction|time management/.test(q)) {
    return [
      `### Focus plan for ${name}`,
      '',
      `You have logged **${ctx.sessions || 0} sessions** with **${ctx.distraction || '0 min'}** of distraction and a **${ctx.focus || 0}%** focus score.`,
      '',
      '#### Three changes to try',
      '1. Keep one task visible and close unrelated tabs.',
      '2. Use 25 minutes of study followed by 5 minutes of break.',
      '3. Write the next action before starting, such as "solve 5 normalization questions".'
    ].join('\n')
  }

  return [
    `### ${makeTitle(raw)}`,
    '',
    `Here is a beginner-friendly way to approach this, ${name}:`,
    '',
    '#### Core idea',
    `Break **${raw || 'this topic'}** into definition, mechanism, example, and practice.`,
    '',
    '#### Learning steps',
    '- Write the definition in your own words.',
    '- Work through one tiny example.',
    '- Identify the part that feels unclear.',
    '- Practice immediately with 3-5 questions.',
    '',
    '#### Next prompt you can ask',
    'Ask me for a worked example, a quiz, or an interview-style explanation.'
  ].join('\n')
}

function isEducationalPrompt(q) {
  const blocked = /(politics|gambling|adult|porn|celebrity gossip|medical diagnosis|diagnose me|weapon|violence|illegal|phishing|malware|steal password)/i
  if (blocked.test(q)) return false
  const allowed = /(program|code|java|python|react|node|dbms|database|sql|dsa|algorithm|data structure|math|physics|chemistry|biology|engineering|operating system|network|machine learning|artificial intelligence|cloud|cyber|security|interview|resume|career|soft skill|study|exam|quiz|revise|explain|learn|concept|time management|focus|productiv|competitive)/i
  return allowed.test(q) || q.split(/\s+/).length <= 8
}

function extractTopic(input) {
  return String(input || '')
    .replace(/generate|create|make|quiz|questions|with answers|for me|on/gi, '')
    .trim() || 'academic topic'
}

function makeTitle(input) {
  const value = String(input || 'Academic help').trim()
  return value.length > 70 ? `${value.slice(0, 67)}...` : value
}

function parseContextFromSystem(systemPrompt) {
  const get = (re) => {
    const m = String(systemPrompt).match(re)
    return m ? m[1] : ''
  }
  return {
    name: get(/Student name: (.+)\./),
    study: get(/Total study time: (.+)\./),
    distraction: get(/Total distraction time: (.+)\./),
    focus: get(/Average focus score: (\d+)%/),
    sessions: get(/Study sessions logged: (\d+)\./),
    top: get(/Top subject: (.+)\./)
  }
}
