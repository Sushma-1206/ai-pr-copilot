import { supabase } from './supabaseClient'

const OAUTH_CALLBACK_PATH = 'supabase-auth'

function getCallbackParams(callbackUrl) {
  const url = new URL(callbackUrl)
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))

  const errorDescription =
    url.searchParams.get('error_description') ||
    hashParams.get('error_description') ||
    url.searchParams.get('error') ||
    hashParams.get('error')

  if (errorDescription) {
    throw new Error(errorDescription)
  }

  return {
    accessToken: hashParams.get('access_token'),
    refreshToken: hashParams.get('refresh_token'),
    code: url.searchParams.get('code')
  }
}

/**
 * Runs Google OAuth from the extension service worker. Keeping the flow here
 * is important: a popup page is destroyed as soon as it loses focus, while
 * the service worker remains available to receive the final OAuth callback.
 */
export async function completeGoogleSignIn() {
  if (!chrome.identity?.getRedirectURL || !chrome.identity?.launchWebAuthFlow) {
    throw new Error('Google sign-in requires the Chrome Identity API.')
  }

  const redirectTo = chrome.identity.getRedirectURL(OAUTH_CALLBACK_PATH)
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true
    }
  })

  if (error) throw error
  if (!data?.url) throw new Error('Supabase did not return a Google sign-in URL.')

  const callbackUrl = await chrome.identity.launchWebAuthFlow({
    url: data.url,
    interactive: true
  })

  if (!callbackUrl) throw new Error('Google sign-in was cancelled.')

  const { accessToken, refreshToken, code } = getCallbackParams(callbackUrl)

  if (accessToken && refreshToken) {
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    })
    if (sessionError) throw sessionError
    return sessionData.session
  }

  if (code) {
    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) throw exchangeError
    return sessionData.session
  }

  throw new Error('Google sign-in completed without a Supabase session.')
}

