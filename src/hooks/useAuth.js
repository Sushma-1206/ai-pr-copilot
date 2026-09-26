import { useEffect, useState, useCallback } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth'
import { auth, isFirebaseConfigured, AUTH_STORAGE_KEY } from '../lib/firebaseClient'
import { completeGoogleSignIn } from '../lib/googleAuth'

export function useAuth() {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    // Check chrome.storage.local for saved session first
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get([AUTH_STORAGE_KEY], (res) => {
        if (!isMounted) return
        const savedUser = res[AUTH_STORAGE_KEY]
        if (savedUser?.uid) {
          setCurrentUser({
            id: savedUser.uid,
            uid: savedUser.uid,
            email: savedUser.email,
            displayName: savedUser.displayName,
            photoURL: savedUser.photoURL
          })
        }
        setLoading(false)
      })
    } else {
      setLoading(false)
    }

    // If real Firebase is initialized, also listen to native auth state changes
    let unsubscribe = () => {}
    if (isFirebaseConfigured && auth) {
      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (!isMounted) return
        if (firebaseUser) {
          setCurrentUser({
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL
          })
        } else {
          setCurrentUser(null)
        }
        setLoading(false)
      })
    }

    // Listen to chrome.storage changes across popup and content scripts
    const handleStorageChange = (changes, areaName) => {
      if (areaName !== 'local' || !changes[AUTH_STORAGE_KEY]) return
      const newUser = changes[AUTH_STORAGE_KEY].newValue
      if (newUser?.uid) {
        setCurrentUser({
          id: newUser.uid,
          uid: newUser.uid,
          email: newUser.email,
          displayName: newUser.displayName,
          photoURL: newUser.photoURL
        })
      } else {
        setCurrentUser(null)
      }
    }

    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange)
    }

    return () => {
      isMounted = false
      unsubscribe()
      if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
        chrome.storage.onChanged.removeListener(handleStorageChange)
      }
    }
  }, [])

  const signInWithPassword = useCallback(async (email, password) => {
    setError(null)

    // Real Firebase Auth
    if (isFirebaseConfigured && auth) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        const u = userCredential.user
        const userData = {
          id: u.uid,
          uid: u.uid,
          email: u.email,
          displayName: u.displayName
        }
        setCurrentUser(userData)
        return { success: true }
      } catch (err) {
        const message = err?.message || 'Failed to sign in.'
        setError(message)
        return { success: false, error: message }
      }
    }

    // Local development mode when Firebase is not yet configured
    const localUser = {
      id: 'local-' + btoa(email).slice(0, 12),
      uid: 'local-' + btoa(email).slice(0, 12),
      email: email,
      displayName: email.split('@')[0]
    }
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [AUTH_STORAGE_KEY]: localUser })
    }
    setCurrentUser(localUser)
    return { success: true }
  }, [])

  const signUp = useCallback(async (email, password) => {
    setError(null)

    // Real Firebase Auth
    if (isFirebaseConfigured && auth) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        const u = userCredential.user
        const userData = {
          id: u.uid,
          uid: u.uid,
          email: u.email,
          displayName: u.displayName
        }
        setCurrentUser(userData)
        return { success: true }
      } catch (err) {
        const message = err?.message || 'Failed to create account.'
        setError(message)
        return { success: false, error: message }
      }
    }

    // Local development mode when Firebase is not yet configured
    const localUser = {
      id: 'local-' + btoa(email).slice(0, 12),
      uid: 'local-' + btoa(email).slice(0, 12),
      email: email,
      displayName: email.split('@')[0]
    }
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [AUTH_STORAGE_KEY]: localUser })
    }
    setCurrentUser(localUser)
    return { success: true }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    setError(null)

    if (!isFirebaseConfigured) {
      const msg = 'Please configure your Firebase credentials in .env to use Google Sign-In.'
      setError(msg)
      return { success: false, error: msg }
    }

    try {
      // 1. Delegate to the background service worker via message passing.
      // This is necessary for content scripts (where chrome.identity is unavailable)
      // and prevents the flow from being cancelled when a popup loses focus.
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: 'AUTH_GOOGLE' }, (res) => {
            if (chrome.runtime.lastError) {
              resolve({
                success: false,
                error: chrome.runtime.lastError.message,
                unreachable: true
              })
            } else {
              resolve(res || { success: false, error: 'No response from background service worker.' })
            }
          })
        })

        if (response?.success && response.user) {
          const userData = {
            id: response.user.id || response.user.uid,
            uid: response.user.uid || response.user.id,
            email: response.user.email,
            displayName: response.user.displayName || response.user.email?.split('@')[0],
            photoURL: response.user.photoURL
          }
          if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            await chrome.storage.local.set({ [AUTH_STORAGE_KEY]: userData })
          }
          setCurrentUser(userData)
          return { success: true }
        }

        // If the worker gave an error (not a connection disconnect), report it
        if (!response?.success && !response?.unreachable) {
          const message = response?.error || 'Google sign-in failed.'
          setError(message)
          return { success: false, error: message }
        }
      }

      // 2. Fallback to direct client flow if chrome.identity is available in this context
      if (typeof chrome !== 'undefined' && chrome.identity?.launchWebAuthFlow) {
        const user = await completeGoogleSignIn()
        if (user) {
          const userData = {
            id: user.uid || user.id,
            uid: user.uid || user.id,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0],
            photoURL: user.photoURL
          }
          if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            await chrome.storage.local.set({ [AUTH_STORAGE_KEY]: userData })
          }
          setCurrentUser(userData)
        }
        return { success: true }
      }

      throw new Error('Google sign-in is not supported in this context.')
    } catch (googleError) {
      const message = googleError?.message || 'Google sign-in failed.'
      setError(message)
      return { success: false, error: message }
    }
  }, [])

  const signOut = useCallback(async () => {
    setError(null)
    try {
      if (isFirebaseConfigured && auth) {
        await firebaseSignOut(auth)
      }
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.remove([AUTH_STORAGE_KEY])
      }
      setCurrentUser(null)
      return { success: true }
    } catch (err) {
      const message = err?.message || 'Failed to sign out.'
      setError(message)
      return { success: false, error: message }
    }
  }, [])

  return {
    session: currentUser ? { user: currentUser } : null,
    user: currentUser,
    isAuthenticated: !!currentUser,
    loading,
    error,
    signInWithGoogle,
    signInWithPassword,
    signUp,
    signOut
  }
}
