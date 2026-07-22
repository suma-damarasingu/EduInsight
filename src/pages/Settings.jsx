import { useState } from 'react'
import { motion } from 'framer-motion'
import { FiUser, FiTarget, FiMail, FiCheck, FiLogOut } from 'react-icons/fi'
import Card from '../components/ui/Card'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function Settings() {
  const { profile, refreshProfile, signOut } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [goal, setGoal] = useState(profile?.learning_goal || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, learning_goal: goal })
        .eq('id', profile.id)
      if (error) throw error
      await refreshProfile()
      toast.success('Profile updated')
    } catch (e) {
      toast.error(e.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const logout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-ink">Settings</h1>
        <p className="text-ink-muted mt-1">Manage your profile and learning goal.</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="grid place-items-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-700 to-secondary text-white text-xl font-bold shadow-soft">
            {(profile?.full_name || 'S').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-ink text-lg">{profile?.full_name}</div>
            <div className="text-sm text-ink-muted">{profile?.email}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label"><FiUser className="inline mr-1.5 -mt-0.5" />Full Name</label>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <label className="label"><FiMail className="inline mr-1.5 -mt-0.5" />Email</label>
            <input className="input bg-bg-soft" value={profile?.email || ''} disabled />
          </div>
          <div>
            <label className="label"><FiTarget className="inline mr-1.5 -mt-0.5" />Learning Goal</label>
            <textarea rows={3} className="input resize-none" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Crack SDE interviews in 3 months" />
            <p className="text-xs text-ink-muted mt-1">This personalizes your AI Insights and Coach responses.</p>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : <><FiCheck /> Save Changes</>}
            </button>
          </div>
        </div>
      </Card>

      <Card className="p-6 border-stone-300 dark:border-stone-700">
        <h3 className="font-semibold text-ink">Danger Zone</h3>
        <p className="text-sm text-ink-muted mt-1">Sign out of your EduInsight account on this device.</p>
        <button onClick={logout} className="mt-4 btn bg-stone-700 text-white hover:bg-stone-800 dark:bg-stone-600 dark:hover:bg-stone-500">
          <FiLogOut /> Logout
        </button>
      </Card>
    </div>
  )
}
