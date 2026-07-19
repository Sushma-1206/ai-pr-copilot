import { useEffect, useState, useCallback } from 'react'
import { supabase, AUTH_STORAGE_KEY } from '../lib/supabaseClient'

export function useAuth() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!isMounted) return
      if (sessionError) setError(sessionError.message)
      setSession(data.session)
      setLoading(false)
    })

    // Fires within the context (popup/content script/background) that
    // actually performed the sign-in/sign-out.
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return
      setSession(newSession)
    })

    // Fires in OTHER contexts when chrome.storage.local changes, so that
    // e.g. signing in from the popup updates an already-open content
    // script panel without a page reload.
    const handleStorageChange = (changes, areaName) => {
      if (areaName !== 'local') return
      if (!changes[AUTH_STORAGE_KEY]) return
      supabase.auth.getSession().then(({ data }) => {
        if (isMounted) setSession(data.session)
      })
    }
    chrome.storage.onChanged.addListener(handleStorageChange)

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  const signInWithPassword = useCallback(async (email, password) => {
    setError(null)
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError(signInError.message)
      return { success: false, error: signInError.message }
    }
    setSession(data.session)
    return { success: true }
  }, [])

  const signUp = useCallback(async (email, password) => {
    setError(null)
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) {
      setError(signUpError.message)
      return { success: false, error: signUpError.message }
    }
    return { success: true, needsEmailConfirmation: !data.session }
  }, [])

  const signOut = useCallback(async () => {
    setError(null)
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      setError(signOutError.message)
      return { success: false, error: signOutError.message }
    }
    setSession(null)
    return { success: true }
  }, [])

  return {
    session,
    user: session?.user ?? null,
    isAuthenticated: !!session,
    loading,
    error,
    signInWithPassword,
    signUp,
    signOut
  }
}
