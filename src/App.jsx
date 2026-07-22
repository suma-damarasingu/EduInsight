import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from './context/AuthContext'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import DashboardLayout from './components/layouts/DashboardLayout'
import Overview from './pages/Overview'
import StudySessions from './pages/StudySessions'
import Reports from './pages/Reports'
import AIInsights from './pages/AIInsights'
import AICoach from './pages/AICoach'
import Settings from './pages/Settings'
import { useState } from 'react'

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-bg">
        <div className="flex flex-col items-center gap-3 text-ink-muted">
          <div className="w-10 h-10 rounded-full border-4 border-primary-200 border-t-primary-500 animate-spin" />
          <div className="text-sm">Loading EduInsight…</div>
        </div>
      </div>
    )
  }
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

function PublicRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return null
  if (session) return <Navigate to="/app" replace />
  return children
}

function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

export default function App() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname.split('/').slice(0, 3).join('/')}>
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <DashboardLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                <PageTransition>
                  <Overview />
                </PageTransition>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/sessions"
          element={
            <ProtectedRoute>
              <DashboardLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                <PageTransition>
                  <StudySessions />
                </PageTransition>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/reports"
          element={
            <ProtectedRoute>
              <DashboardLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                <PageTransition>
                  <Reports />
                </PageTransition>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/insights"
          element={
            <ProtectedRoute>
              <DashboardLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                <PageTransition>
                  <AIInsights />
                </PageTransition>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/coach"
          element={
            <ProtectedRoute>
              <DashboardLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                <PageTransition>
                  <AICoach />
                </PageTransition>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/settings"
          element={
            <ProtectedRoute>
              <DashboardLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                <PageTransition>
                  <Settings />
                </PageTransition>
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </AnimatePresence>
  )
}
