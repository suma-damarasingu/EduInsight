import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { FiMail, FiLock, FiUser, FiZap, FiArrowRight } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export default function Register() {
  const { signUp } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const { register, handleSubmit, watch, formState: { errors } } = useForm()
  const password = watch('password')

  const onSubmit = async (data) => {
    setSubmitting(true)
    try {
      await signUp({ email: data.email, password: data.password, fullName: data.fullName })
      toast.success('Account created! Welcome to EduInsight.')
      navigate('/app', { replace: true })
    } catch (e) {
      toast.error(e.message || 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-bg">
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
            Start detecting learning waste today.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-4 text-white/80 max-w-md"
          >
            Create a free account to track sessions, visualize productivity, and unlock an AI mentor built for students.
          </motion.p>
          <ul className="mt-6 space-y-2 text-white/85 text-sm">
            <li>• Study session tracker with focus scoring</li>
            <li>• AI Insights that detect wasted study time</li>
            <li>• ChatGPT-style AI Coach for academics & interviews</li>
          </ul>
        </div>
        <div className="text-white/60 text-sm">© EduInsight — AI Learning Waste Detector</div>
      </div>

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
          <h2 className="text-2xl font-bold text-ink">Create your account</h2>
          <p className="text-ink-muted mt-1">It takes less than a minute.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
            <div>
              <label className="label">Full Name</label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  className="input pl-10"
                  placeholder="Your name"
                  {...register('fullName', { required: 'Name is required', minLength: { value: 2, message: 'Too short' } })}
                />
              </div>
              {errors.fullName && <p className="text-xs text-rose-500 mt-1">{errors.fullName.message}</p>}
            </div>
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
                  placeholder="Min 6 characters"
                  {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })}
                />
              </div>
              {errors.password && <p className="text-xs text-rose-500 mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  type="password"
                  className="input pl-10"
                  placeholder="Re-enter password"
                  {...register('confirm', { required: 'Please confirm', validate: (v) => v === password || 'Passwords do not match' })}
                />
              </div>
              {errors.confirm && <p className="text-xs text-rose-500 mt-1">{errors.confirm.message}</p>}
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Creating account…' : 'Create Account'}
              {!submitting && <FiArrowRight />}
            </button>
          </form>

          <p className="text-sm text-ink-muted text-center mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
