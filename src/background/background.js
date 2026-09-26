import { completeGoogleSignIn } from '../lib/googleAuth'

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({
      'ai-pr-copilot-settings': {
        defaultMode: 'developer',
        installedAt: new Date().toISOString()
      }
    })
  }
})

// Simple health-check message used by the popup/content script to confirm
// the service worker is alive before wiring in the AI call in Phase 4.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'PING') {
    sendResponse({ type: 'PONG', timestamp: Date.now() })
    return true
  }

  if (message?.type === 'AUTH_GOOGLE') {
    completeGoogleSignIn()
      .then((session) => {
        sendResponse({
          success: true,
          user: session?.user
            ? { id: session.user.id, email: session.user.email }
            : null
        })
      })
      .catch((error) => {
        sendResponse({
          success: false,
          error: error?.message || 'Google sign-in failed.'
        })
      })
    return true
  }

  if (message?.type === 'FETCH_PR_DIFF') {
    const { url, headers } = message
    fetch(url, {
      headers: headers || {},
      credentials: 'omit'
    })
      .then(async (res) => {
        if (!res.ok) {
          sendResponse({
            success: false,
            status: res.status,
            statusText: res.statusText
          })
          return
        }
        const text = await res.text()
        sendResponse({ success: true, text })
      })
      .catch((err) => {
        sendResponse({
          success: false,
          error: err?.message || 'Diff fetch failed in background.'
        })
      })
    return true
  }

  return false
})
