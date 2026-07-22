import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (uid) => {
    if (!uid) {
      setProfile(null)
      return
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, learning_goal, created_at')
      .eq('id', uid)
      .maybeSingle()
    if (error) {
      console.warn('profile load error', error.message)
      setProfile(null)
      return
    }
    if (!data) {
      // Create profile row from auth metadata if missing
      const { data: udata } = await supabase.auth.getUser()
      const u = udata?.user
      if (u) {
        const fullName = u.user_metadata?.full_name || u.email?.split('@')[0] || 'Student'
        const insert = await supabase
          .from('profiles')
          .insert({ id: u.id, full_name: fullName, email: u.email, learning_goal: '' })
          .select('id, full_name, email, learning_goal, created_at')
          .maybeSingle()
        setProfile(insert.data)
      }
      return
    }
    setProfile(data)
  }, [])

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      const uid = data.session?.user?.id
      if (uid) {
        loadProfile(uid).finally(() => mounted && setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
      const uid = sess?.user?.id
      if (uid) {
        ;(async () => {
          await loadProfile(uid)
        })()
      } else {
        setProfile(null)
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signUp = useCallback(async ({ email, password, fullName }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    })
    if (error) throw error
    if (data?.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        learning_goal: ''
      })
    }
    return data
  }, [])

  const signIn = useCallback(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setSession(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    const uid = session?.user?.id
    if (uid) await loadProfile(uid)
  }, [session, loadProfile])

  const value = {
    session,
    user: session?.user || null,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
