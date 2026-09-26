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
      .then((user) => {
        sendResponse({
          success: true,
          user: user
            ? {
                id: user.uid || user.id,
                uid: user.uid || user.id,
                email: user.email,
                displayName: user.displayName || user.email?.split('@')[0],
                photoURL: user.photoURL
              }
            : null
        })
      })
      .catch((error) => {
        console.error('[background] Google sign-in failed:', error)
        sendResponse({
          success: false,
          error: error?.message || 'Google sign-in failed.'
        })
      })
    return true
  }

  return false
})
