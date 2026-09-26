import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { auth, AUTH_STORAGE_KEY } from './firebaseClient'

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'

function randomBase64Url(byteLength = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength))
  const binary = String.fromCharCode(...bytes)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function extractIdToken(callbackUrl, expectedState) {
  const url = new URL(callbackUrl)
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))
  const searchParams = url.searchParams

  const error =
    searchParams.get('error_description') ||
    hashParams.get('error_description') ||
    searchParams.get('error') ||
    hashParams.get('error')

  if (error) throw new Error(error)

  const returnedState = hashParams.get('state') || searchParams.get('state')
  if (expectedState && returnedState && returnedState !== expectedState) {
    throw new Error('Google sign-in returned an invalid state.')
  }

  const idToken = hashParams.get('id_token') || searchParams.get('id_token')
  if (!idToken) throw new Error('No ID token returned from Google.')
  return idToken
}

/**
 * Signs into Firebase via Google using chrome.identity.launchWebAuthFlow
 * which returns an id_token (required by Firebase's signInWithCredential).
 */
export async function completeGoogleSignIn() {
  if (!chrome.identity?.launchWebAuthFlow) {
    throw new Error('Google sign-in requires the Chrome Identity API.')
  }

  const manifest = chrome.runtime.getManifest?.() || {}
  const clientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    manifest.oauth2?.client_id ||
    '1067050462708-um4ecl0nap1lh3seeclervdjhkhm3gqe.apps.googleusercontent.com'

  if (!clientId) {
    throw new Error('OAuth client_id is missing from the extension manifest.')
  }

  // chrome.identity.getRedirectURL() generates: https://<item-id>.chromiumapp.org/
  const redirectUri = chrome.identity.getRedirectURL()
  const state = randomBase64Url()
  const nonce = randomBase64Url()

  console.log('[googleAuth] Extension ID:', chrome.runtime.id)
  console.log('[googleAuth] Redirect URI:', redirectUri)
  console.log('[googleAuth] Client ID:', clientId)

  const authUrl = new URL(GOOGLE_AUTH_ENDPOINT)
  authUrl.search = new URLSearchParams({
    client_id: clientId,
    response_type: 'id_token',
    redirect_uri: redirectUri,
    scope: 'openid email profile',
    state,
    nonce,
    prompt: 'select_account'
  }).toString()

  const callbackUrl = await new Promise((resolve, reject) => {
    try {
      chrome.identity.launchWebAuthFlow(
        {
          url: authUrl.toString(),
          interactive: true
        },
        (responseUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message || 'Google sign-in was cancelled or failed.'))
          } else if (!responseUrl) {
            reject(new Error('Google sign-in was cancelled.'))
          } else {
            resolve(responseUrl)
          }
        }
      )
    } catch (err) {
      reject(err)
    }
  })

  // Extract the id_token from the hash fragment or search params of the redirect URL
  const idToken = extractIdToken(callbackUrl, state)

  if (!auth) {
    throw new Error('Firebase Auth is not initialized. Please verify your Firebase credentials.')
  }

  // Sign into Firebase using the Google ID token
  const credential = GoogleAuthProvider.credential(idToken)
  const userCredential = await signInWithCredential(auth, credential)
  const user = userCredential.user

  const userData = {
    uid: user.uid,
    id: user.uid,
    email: user.email,
    displayName: user.displayName || user.email?.split('@')[0],
    photoURL: user.photoURL
  }

  // Ensure user is synced to chrome.storage.local immediately
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    try {
      await chrome.storage.local.set({ [AUTH_STORAGE_KEY]: userData })
    } catch (storageErr) {
      console.warn('[googleAuth] Failed to cache user session:', storageErr)
    }
  }

  return userData
}

