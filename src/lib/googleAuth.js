import { supabase } from './supabaseClient'

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/auth'

function randomBase64Url(byteLength = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength))
  const binary = String.fromCharCode(...bytes)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function getGoogleIdToken(callbackUrl, expectedState) {
  const url = new URL(callbackUrl)
  const params = new URLSearchParams(url.hash.replace(/^#/, ''))
  const errorDescription = params.get('error_description') || params.get('error')

  if (errorDescription) throw new Error(errorDescription)
  if (params.get('state') !== expectedState) {
    throw new Error('Google sign-in returned an invalid state.')
  }

  const idToken = params.get('id_token')
  if (!idToken) throw new Error('Google sign-in completed without an ID token.')
  return idToken
}

/**
 * Runs Google OAuth in the extension service worker. A popup page is destroyed
 * when it loses focus, while the service worker remains alive for the callback.
 */
export async function completeGoogleSignIn() {
  if (!chrome.identity?.getRedirectURL || !chrome.identity?.launchWebAuthFlow) {
    throw new Error('Google sign-in requires the Chrome Identity API.')
  }

  const manifest = chrome.runtime.getManifest()
  const clientId = manifest.oauth2?.client_id
  const scopes = manifest.oauth2?.scopes

  if (!clientId || !Array.isArray(scopes) || scopes.length === 0) {
    throw new Error('Google OAuth is not configured in the extension manifest.')
  }

  // Google registers Chrome-extension OAuth clients against this exact origin.
  // Unlike getRedirectURL(), it intentionally has no trailing slash.
  const redirectUri = `https://${chrome.runtime.id}.chromiumapp.org`
  const state = randomBase64Url()
  const authUrl = new URL(GOOGLE_AUTH_ENDPOINT)
  authUrl.search = new URLSearchParams({
    client_id: clientId,
    response_type: 'id_token',
    access_type: 'offline',
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    state,
    prompt: 'select_account'
  }).toString()

  const callbackUrl = await chrome.identity.launchWebAuthFlow({
    url: authUrl.toString(),
    interactive: true
  })

  if (!callbackUrl) throw new Error('Google sign-in was cancelled.')

  const idToken = getGoogleIdToken(callbackUrl, state)
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken
  })

  if (error) throw error
  if (!data.session) throw new Error('Google sign-in completed without a Supabase session.')
  return data.session
}
