import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiHome, FiBook, FiBarChart2, FiCpu, FiMessageSquare, FiSettings,
  FiLogOut, FiX, FiZap, FiMoon, FiSun
} from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { initials } from '../../lib/utils'

const nav = [
  { to: '/app', label: 'Overview', icon: FiHome, end: true },
  { to: '/app/sessions', label: 'Study Sessions', icon: FiBook, end: false },
  { to: '/app/reports', label: 'Reports', icon: FiBarChart2, end: false },
  { to: '/app/insights', label: 'AI Insights', icon: FiCpu, end: false },
  { to: '/app/coach', label: 'AI Coach', icon: FiMessageSquare, end: false },
  { to: '/app/settings', label: 'Settings', icon: FiSettings, end: false }
]

const labels = {
  '/app': 'Overview',
  '/app/sessions': 'Study Sessions',
  '/app/reports': 'Reports',
  '/app/insights': 'AI Insights',
  '/app/coach': 'AI Coach',
  '/app/settings': 'Settings'
}

export default function DashboardLayout({ children, sidebarOpen, setSidebarOpen }) {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    return localStorage.getItem('eduinsight-theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  })
  const path = location.pathname
  const crumb = labels[path] || 'Overview'

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('eduinsight-theme', theme)
  }, [theme])

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const SidebarInner = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-line dark:border-darkbg-line">
        <div className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-secondary text-white shadow-soft">
          <FiZap size={18} />
        </div>
        <div className="font-bold text-ink dark:text-slate-100 tracking-tight">
          Edu<span className="text-primary-600">Insight</span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-primary-500 via-secondary to-accent text-white shadow-soft'
                    : 'text-ink-soft dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-slate-800 hover:text-primary-600 dark:hover:text-white'
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
      <div className="p-3 border-t border-line dark:border-darkbg-line">
        <div className="flex items-center gap-3 px-2.5 py-2">
          <div className="grid place-items-center w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-indigo-200 font-semibold text-sm">
            {initials(profile?.full_name) || 'S'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-ink dark:text-slate-100 truncate">{profile?.full_name || 'Student'}</div>
            <div className="text-xs text-ink-muted dark:text-slate-400 truncate">{profile?.email}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-1 w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
        >
          <FiLogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-bg dark:bg-darkbg transition-colors duration-300">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-white/95 dark:bg-darkbg-surface border-r border-line dark:border-darkbg-line">
        {SidebarInner}
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              className="lg:hidden fixed inset-y-0 left-0 w-72 bg-white dark:bg-darkbg-surface z-50 shadow-2xl"
            >
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 text-ink-muted dark:text-slate-400 hover:text-ink dark:hover:text-white"
              >
                <FiX size={20} />
              </button>
              {SidebarInner}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        {/* Top nav */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-darkbg-surface/80 backdrop-blur border-b border-line dark:border-darkbg-line flex items-center gap-3 px-4 sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden grid place-items-center w-9 h-9 rounded-lg border border-line dark:border-darkbg-line text-ink-soft dark:text-slate-300 hover:bg-bg-soft dark:hover:bg-slate-800"
            aria-label="Open menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="text-sm text-ink-muted dark:text-slate-400 hidden sm:flex items-center gap-2">
            <span className="text-ink-muted/60">Dashboard</span>
            <span className="text-ink-muted/40">/</span>
            <span className="text-ink dark:text-slate-100 font-semibold">{crumb}</span>
          </div>
          <div className="flex-1" />
          <div className="hidden md:flex items-center gap-2 rounded-xl bg-bg-soft dark:bg-darkbg-card border border-line dark:border-darkbg-line px-3 py-2 w-64 focus-within:ring-2 focus-within:ring-primary-300 dark:focus-within:ring-primary-500/40 transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-muted">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3-3" strokeLinecap="round" />
            </svg>
            <input
              placeholder="Search…"
              className="bg-transparent text-sm outline-none w-full text-ink dark:text-slate-100 placeholder:text-ink-muted dark:placeholder:text-slate-400"
            />
          </div>
          <button
            type="button"
            onClick={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}
            className="grid place-items-center w-9 h-9 rounded-lg border border-line dark:border-darkbg-line text-ink-soft dark:text-slate-300 hover:bg-bg-soft dark:hover:bg-slate-800 transition"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <FiSun size={17} /> : <FiMoon size={17} />}
          </button>
          <button className="relative grid place-items-center w-9 h-9 rounded-lg border border-line dark:border-darkbg-line text-ink-soft dark:text-slate-300 hover:bg-bg-soft dark:hover:bg-slate-800 transition" aria-label="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" strokeLinecap="round" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
          </button>
          <NavLink to="/app/settings" className="grid place-items-center w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-indigo-200 font-semibold text-sm hover:bg-primary-200 dark:hover:bg-primary-500/30 transition" aria-label="Open settings">
            {initials(profile?.full_name) || 'S'}
          </NavLink>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  )
}
