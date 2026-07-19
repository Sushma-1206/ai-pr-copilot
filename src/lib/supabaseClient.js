import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase environment variables. Create a .env file at the project root with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example).'
  )
}

/**
 * Supabase's default auth storage is window.localStorage, but a browser
 * extension's popup, content script, and background service worker each
 * run in their own isolated JS context (and the service worker has no
 * localStorage at all). chrome.storage.local is the only storage area
 * shared across all three, so we implement Supabase's storage interface
 * on top of it. This makes a session created in the popup automatically
 * readable from the content script and vice versa.
 */
const chromeStorageAdapter = {
  getItem: async (key) => {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
            return
          }
          resolve(result[key] ?? null)
        })
      } catch (err) {
        reject(err)
      }
    })
  },
  setItem: async (key, value) => {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
            return
          }
          resolve()
        })
      } catch (err) {
        reject(err)
      }
    })
  },
  removeItem: async (key) => {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.remove([key], () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
            return
          }
          resolve()
        })
      } catch (err) {
        reject(err)
      }
    })
  }
}

export const AUTH_STORAGE_KEY = 'ai-pr-copilot-auth'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: chromeStorageAdapter,
    storageKey: AUTH_STORAGE_KEY,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})
