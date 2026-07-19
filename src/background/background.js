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
  return false
})
