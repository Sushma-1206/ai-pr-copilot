import { initializeApp, getApps, getApp } from 'firebase/app'
import { initializeAuth, getAuth, indexedDBLocalPersistence, browserLocalPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const rawApiKey = import.meta.env.VITE_FIREBASE_API_KEY

export const isFirebaseConfigured = Boolean(
  rawApiKey &&
  !rawApiKey.includes('your-api-key') &&
  !rawApiKey.includes('DummyKey') &&
  rawApiKey.length > 10 &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID &&
  !import.meta.env.VITE_FIREBASE_PROJECT_ID.includes('placeholder')
)

export const AUTH_STORAGE_KEY = 'ai-pr-copilot-firebase-auth'

let app = null
let auth = null
let db = null

if (isFirebaseConfigured) {
  try {
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    }

    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

    try {
      auth = initializeAuth(app, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence]
      })
    } catch {
      auth = getAuth(app)
    }

    db = getFirestore(app)

    auth.onAuthStateChanged((user) => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage?.local && user) {
          chrome.storage.local.set({
            [AUTH_STORAGE_KEY]: {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email?.split('@')[0],
              photoURL: user.photoURL
            }
          })
        }
      } catch (err) {
        console.warn('[firebaseClient] Failed to sync auth state to chrome.storage:', err)
      }
    })
  } catch (err) {
    console.error('[firebaseClient] Failed to initialize Firebase:', err)
    app = null
    auth = null
    db = null
  }
}

export { app, auth, db }
