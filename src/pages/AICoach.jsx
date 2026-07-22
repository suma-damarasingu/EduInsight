import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  FiPlus, FiTrash2, FiSend, FiMessageSquare, FiZap, FiCpu, FiMenu, FiX,
  FiCopy, FiRefreshCw, FiSquare
} from 'react-icons/fi'
import Card from '../components/ui/Card'
import Skeleton from '../components/ui/Skeleton'
import Spinner from '../components/ui/Spinner'
import { listChats, newChat, saveMessages, deleteChat, getChat } from '../lib/chat'
import { fetchSessions } from '../lib/sessions'
import { coachReply } from '../lib/ai'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { totalStudyTime, totalDistractionTime, avgFocus, avgEfficiency, topSubject } from '../lib/stats'
import { formatTime } from '../lib/utils'

const SUGGESTIONS = [
  { title: 'Explain Java', prompt: 'Explain the core concepts of Java for a beginner with a simple example.' },
  { title: 'Generate Quiz', prompt: 'Generate a 5-question quiz on DBMS with answers.' },
  { title: 'Create Study Plan', prompt: 'Create a 7-day study plan for DSA based on my recent sessions.' },
  { title: 'Explain DBMS', prompt: 'Explain normalization in DBMS with an example.' },
  { title: 'Revise DSA', prompt: 'Give me a quick revision sheet for DSA arrays and linked lists.' },
  { title: 'Improve Focus', prompt: 'Based on my distraction time, suggest 3 ways to improve my focus.' }
]

function buildContext(profile, sessions) {
  return {
    full_name: profile?.full_name || 'Student',
    learning_goal: profile?.learning_goal || 'Not set',
    session_count: sessions.length,
    total_study: formatTime(totalStudyTime(sessions)),
    total_distraction: formatTime(totalDistractionTime(sessions)),
    focus_score: avgFocus(sessions),
    efficiency: avgEfficiency(sessions),
    top_subject: topSubject(sessions) || 'None yet'
  }
}

function buildSystemPrompt(ctx) {
  return [
    'You are EduInsight AI Coach.',
    'You are an educational assistant and professional academic mentor.',
    'Only answer academic and educational questions.',
    'Subjects include programming, computer science, mathematics, physics, chemistry, biology, engineering, DSA, algorithms, DBMS, operating systems, computer networks, machine learning, artificial intelligence, cloud, cybersecurity, interview preparation, resume guidance, career advice, soft skills, study plans, time management, exam preparation, and competitive programming.',
    'If users ask unrelated questions like politics, medical diagnosis, adult content, illegal activities, gambling, hacking abuse, violence, or entertainment gossip, politely refuse and redirect them toward educational topics.',
    'Provide detailed, structured, beginner-friendly explanations.',
    'Use headings, bullet points, examples, analogies, and code blocks when programming questions are asked.',
    'Generate different answers depending on the user prompt and conversation history. Never repeat the same response.',
    '',
    `Student name: ${ctx.full_name}.`,
    `Learning goal: ${ctx.learning_goal}.`,
    `Study sessions logged: ${ctx.session_count}.`,
    `Total study time: ${ctx.total_study}.`,
    `Total distraction time: ${ctx.total_distraction}.`,
    `Average focus score: ${ctx.focus_score}%.`,
    `Average learning efficiency: ${ctx.efficiency}%.`,
    `Top subject: ${ctx.top_subject}.`
  ].join('\n')
}

export default function AICoach() {
  const { profile } = useAuth()
  const toast = useToast()
  const [chats, setChats] = useState(null)
  const [activeChat, setActiveChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sessions, setSessions] = useState([])
  const [lastFailedPrompt, setLastFailedPrompt] = useState('')
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    fetchSessions().then(setSessions).catch(() => setSessions([]))
    listChats().then((c) => {
      setChats(c)
      if (c.length > 0) selectChat(c[0])
    }).catch(() => setChats([]))
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingText])

  const selectChat = async (chat) => {
    if (activeChat?.id === chat.id) return
    const full = await getChat(chat.id)
    setActiveChat(full)
    setMessages(full?.messages || [])
    setSidebarOpen(false)
  }

  const startNewChat = async () => {
    try {
      const c = await newChat('New Chat')
      setChats((prev) => [c, ...(prev || [])])
      setActiveChat(c)
      setMessages([])
      setInput('')
      setLastFailedPrompt('')
      setSidebarOpen(false)
      inputRef.current?.focus()
    } catch (e) {
      toast.error(e.message || 'Could not create chat')
    }
  }

  const removeChat = async (id) => {
    try {
      await deleteChat(id)
      const remaining = (chats || []).filter((c) => c.id !== id)
      setChats(remaining)
      if (activeChat?.id === id) {
        setActiveChat(remaining[0] || null)
        setMessages(remaining[0]?.messages || [])
      }
      toast.success('Chat deleted')
    } catch (e) {
      toast.error(e.message || 'Delete failed')
    }
  }

  const send = async (text) => {
    const content = (text ?? input).trim()
    if (!content || sending) return
    if (!activeChat) {
      try {
        const c = await newChat('New Chat')
        setChats((prev) => [c, ...(prev || [])])
        setActiveChat(c)
        return sendToChat(c, content, [])
      } catch (e) {
        toast.error(e.message || 'Could not start chat')
        return
      }
    }
    sendToChat(activeChat, content, messages)
  }

  const sendToChat = async (chat, content, baseMessages = messages) => {
    setInput('')
    setSending(true)
    setStreamingText('')
    setLastFailedPrompt('')
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    const userMsg = { role: 'user', content, ts: Date.now() }
    const history = [...baseMessages, userMsg]
    const ctx = buildContext(profile, sessions)
    const systemPrompt = buildSystemPrompt(ctx)
    setMessages(history)

    let acc = ''
    try {
      const reply = await coachReply(
        { chatId: chat.id, systemPrompt, messages: history },
        (token) => {
          acc += token
          setStreamingText(acc)
        },
        { signal: abortRef.current.signal }
      )
      const next = [...history, { role: 'assistant', content: acc || reply, ts: Date.now() }]
      setMessages(next)
      setStreamingText('')
      await saveMessages(chat.id, next, content.slice(0, 40))
      setChats((prev) => (prev || [])
        .map((c) => (c.id === chat.id ? { ...c, title: content.slice(0, 40), updated_at: new Date().toISOString() } : c))
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)))
    } catch (e) {
      if (e.name === 'AbortError') {
        if (acc) {
          const stopped = [...history, { role: 'assistant', content: `${acc}\n\n_Stopped._`, ts: Date.now() }]
          setMessages(stopped)
          await saveMessages(chat.id, stopped, content.slice(0, 40))
        }
      } else {
        setLastFailedPrompt(content)
        toast.error(e.message || 'Coach failed')
      }
      setStreamingText('')
    } finally {
      setSending(false)
      abortRef.current = null
      inputRef.current?.focus()
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const stop = () => abortRef.current?.abort()

  const retry = () => {
    if (lastFailedPrompt) send(lastFailedPrompt)
  }

  const regenerate = () => {
    if (sending || !activeChat) return
    const lastUserIndex = [...messages].map((m) => m.role).lastIndexOf('user')
    if (lastUserIndex === -1) return
    const prompt = messages[lastUserIndex].content
    const trimmed = messages.slice(0, lastUserIndex)
    setMessages(trimmed)
    sendToChat(activeChat, prompt, trimmed)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink dark:text-slate-100 flex items-center gap-2">
            <FiCpu className="text-primary-600 dark:text-indigo-300" /> AI Coach
          </h1>
          <p className="text-ink-muted dark:text-slate-400 mt-1">Your personal learning mentor for academics, interviews, quizzes, and plans.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" aria-label="Toggle chat history" onClick={() => setSidebarOpen((s) => !s)} className="lg:hidden btn-ghost"><FiMenu /></button>
          <button type="button" onClick={startNewChat} className="btn-primary"><FiPlus /> New Chat</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[520px]">
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} className="lg:hidden fixed inset-0 bg-slate-900/40 z-30" />
          )}
        </AnimatePresence>
        <motion.aside className={`${sidebarOpen ? 'fixed lg:relative inset-y-0 left-0 z-40 lg:z-auto' : 'hidden lg:block'} w-[260px] lg:w-auto`}>
          <Card className="p-3 h-full flex flex-col">
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-xs font-semibold text-ink-muted dark:text-slate-400 uppercase tracking-wide">Chat History</span>
              <button type="button" aria-label="Close chat history" onClick={() => setSidebarOpen(false)} className="lg:hidden text-ink-muted dark:text-slate-400"><FiX /></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {!chats ? (
                [0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)
              ) : chats.length === 0 ? (
                <p className="text-xs text-ink-muted dark:text-slate-400 px-2 py-4 text-center">No chats yet. Start a new one.</p>
              ) : (
                chats.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => selectChat(c)}
                    className={`group flex items-center gap-2 rounded-xl px-3 py-2.5 cursor-pointer transition ${activeChat?.id === c.id ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/20 dark:text-indigo-100' : 'hover:bg-bg-soft dark:hover:bg-slate-800 text-ink-soft dark:text-slate-300'}`}
                  >
                    <FiMessageSquare size={15} className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.title || 'New Chat'}</div>
                      <div className="text-[10px] text-ink-muted dark:text-slate-400">{new Date(c.updated_at).toLocaleDateString()}</div>
                    </div>
                    <button type="button" aria-label={`Delete ${c.title || 'chat'}`} onClick={(e) => { e.stopPropagation(); removeChat(c.id) }} className="opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded p-1">
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </motion.aside>

        <Card className="flex flex-col h-full overflow-hidden">
          {!activeChat && messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="grid place-items-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary text-white mb-4">
                <FiZap size={28} />
              </div>
              <h3 className="font-semibold text-ink dark:text-slate-100 text-lg">Ask your AI Coach anything</h3>
              <p className="text-ink-muted dark:text-slate-400 text-sm mt-1 max-w-md">
                Personalized with your study history. Try a suggestion below to get started.
              </p>
              <div className="grid sm:grid-cols-2 gap-2 mt-6 max-w-lg w-full">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => send(s.prompt)}
                    className="text-left p-3 rounded-xl border border-line dark:border-darkbg-line hover:border-primary-300 hover:bg-primary-50/50 dark:hover:bg-primary-500/10 transition group"
                  >
                    <div className="text-sm font-semibold text-ink dark:text-slate-100 group-hover:text-primary-600 dark:group-hover:text-indigo-300">{s.title}</div>
                    <div className="text-xs text-ink-muted dark:text-slate-400 line-clamp-1">{s.prompt}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {messages.map((m, i) => (
                <ChatBubble
                  key={`${m.ts || i}-${i}`}
                  role={m.role}
                  content={m.content}
                  ts={m.ts}
                  onRegenerate={!sending && m.role === 'assistant' && i === messages.length - 1 ? regenerate : null}
                />
              ))}
              {streamingText && <ChatBubble role="assistant" content={streamingText} streaming />}
              {sending && !streamingText && (
                <div className="flex items-center gap-2 text-ink-muted dark:text-slate-400 text-sm">
                  <Spinner size={16} /> Coach is thinking...
                </div>
              )}
              {lastFailedPrompt && !sending && (
                <button type="button" onClick={retry} className="btn-soft">
                  <FiRefreshCw /> Retry last message
                </button>
              )}
            </div>
          )}

          <div className="border-t border-line dark:border-darkbg-line p-3 sm:p-4 bg-white dark:bg-darkbg-card">
            <div className="flex items-end gap-2 rounded-xl border border-line dark:border-darkbg-line bg-bg-soft dark:bg-darkbg-surface px-3 py-2 focus-within:border-primary-300 focus-within:ring-2 focus-within:ring-primary-200 dark:focus-within:ring-primary-500/30 transition">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask your AI Coach anything..."
                className="flex-1 bg-transparent resize-none outline-none text-sm text-ink dark:text-slate-100 placeholder:text-ink-muted dark:placeholder:text-slate-400 max-h-32 py-1.5"
                aria-label="Message AI Coach"
              />
              {sending ? (
                <button type="button" onClick={stop} className="btn-ghost !px-3 !py-2 self-end" aria-label="Stop generation">
                  <FiSquare size={16} />
                </button>
              ) : (
                <button type="button" onClick={() => send()} disabled={!input.trim()} className="btn-primary !px-3 !py-2 self-end" aria-label="Send message">
                  <FiSend size={16} />
                </button>
              )}
            </div>
            <p className="text-[10px] text-ink-muted dark:text-slate-400 mt-1.5 text-center">Enter to send - Shift + Enter for new line</p>
          </div>
        </Card>
      </div>
    </div>
  )
}

function ChatBubble({ role, content, streaming, ts, onRegenerate }) {
  const isUser = role === 'user'
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
    >
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-gradient-to-br from-primary-500 to-secondary text-white rounded-br-md'
            : 'bg-white dark:bg-darkbg-surface border border-line dark:border-darkbg-line text-ink dark:text-slate-100 rounded-bl-md shadow-card'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose-chat">
            <ReactMarkdown
              components={{
                code({ inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  if (!inline && match) {
                    return (
                      <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" customStyle={{ margin: 0, borderRadius: 12, fontSize: 13 }}>
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    )
                  }
                  return <code className={className} {...props}>{children}</code>
                }
              }}
            >
              {content}
            </ReactMarkdown>
            {streaming && <span className="inline-block w-1.5 h-4 bg-primary-500 ml-0.5 align-middle animate-pulse" />}
          </div>
        )}
      </div>
      <div className={`mt-1 flex items-center gap-1 text-[10px] text-ink-muted dark:text-slate-400 ${isUser ? 'mr-1' : 'ml-1'}`}>
        {ts && <span>{new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
        {!isUser && !streaming && (
          <>
            <button type="button" onClick={copy} className="rounded px-1.5 py-1 hover:bg-bg-soft dark:hover:bg-slate-800" aria-label="Copy response">
              <FiCopy size={12} />
            </button>
            {onRegenerate && (
              <button type="button" onClick={onRegenerate} className="rounded px-1.5 py-1 hover:bg-bg-soft dark:hover:bg-slate-800" aria-label="Regenerate response">
                <FiRefreshCw size={12} />
              </button>
            )}
            {copied && <span>Copied</span>}
          </>
        )}
      </div>
    </motion.div>
  )
}
