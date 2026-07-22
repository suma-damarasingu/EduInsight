import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { FiMail, FiLock, FiZap, FiArrowRight } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export default function Login() {
  const { signIn } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [submitting, setSubmitting] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    setSubmitting(true)
    try {
      await signIn(data)
      toast.success('Welcome back!')
      const dest = location.state?.from?.pathname || '/app'
      navigate(dest, { replace: true })
    } catch (e) {
      toast.error(e.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-bg">
      {/* Left brand panel */}
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-secondary text-white p-12 flex-col justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid place-items-center w-10 h-10 rounded-xl bg-white/15 backdrop-blur">
            <FiZap size={22} />
          </div>
          <div className="font-bold text-lg tracking-tight">EduInsight</div>
        </div>
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-bold leading-tight"
          >
            Detect learning waste.<br />Study smarter with AI.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-4 text-white/80 max-w-md"
          >
            Track sessions, visualize focus, and get personalized AI insights plus a ChatGPT-style mentor for academics, interviews, and revision.
          </motion.p>
          <div className="mt-8 flex gap-6 text-sm">
            <div><div className="text-2xl font-bold">4</div><div className="text-white/70">Analytics cards</div></div>
            <div><div className="text-2xl font-bold">AI</div><div className="text-white/70">Coach & Insights</div></div>
            <div><div className="text-2xl font-bold">∞</div><div className="text-white/70">Sessions</div></div>
          </div>
        </div>
        <div className="text-white/60 text-sm">© EduInsight — AI Learning Waste Detector</div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary text-white">
              <FiZap size={22} />
            </div>
            <div className="font-bold text-lg text-ink">EduInsight</div>
          </div>
          <h2 className="text-2xl font-bold text-ink">Welcome back</h2>
          <p className="text-ink-muted mt-1">Sign in to continue your learning journey.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  type="email"
                  className="input pl-10"
                  placeholder="you@example.com"
                  {...register('email', { required: 'Email is required', pattern: { value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/, message: 'Invalid email' } })}
                />
              </div>
              {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  type="password"
                  className="input pl-10"
                  placeholder="••••••••"
                  {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })}
                />
              </div>
              {errors.password && <p className="text-xs text-rose-500 mt-1">{errors.password.message}</p>}
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Signing in…' : 'Sign In'}
              {!submitting && <FiArrowRight />}
            </button>
          </form>

          <p className="text-sm text-ink-muted text-center mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 font-semibold hover:underline">Create one</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
