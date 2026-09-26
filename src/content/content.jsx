import React from 'react'
import ReactDOM from 'react-dom/client'
import ContentApp from './ContentApp.jsx'
import tailwindStyles from '../styles/tailwind.css?inline'

const ROOT_ID = 'ai-pr-copilot-root'

function mountPanel() {
  if (document.getElementById(ROOT_ID)) return

  const hostContainer = document.createElement('div')
  hostContainer.id = ROOT_ID
  hostContainer.style.position = 'fixed'
  hostContainer.style.bottom = '16px'
  hostContainer.style.right = '16px'
  hostContainer.style.zIndex = '2147483647'
  document.body.appendChild(hostContainer)

  // Shadow DOM isolates our Tailwind classes from GitHub/GitLab's own
  // stylesheets (and vice versa) so nothing bleeds either direction.
  const shadowRoot = hostContainer.attachShadow({ mode: 'open' })

  const styleEl = document.createElement('style')
  styleEl.textContent = tailwindStyles
  shadowRoot.appendChild(styleEl)

  const appContainer = document.createElement('div')
  shadowRoot.appendChild(appContainer)

  try {
    ReactDOM.createRoot(appContainer).render(
      <React.StrictMode>
        <ContentApp />
      </React.StrictMode>
    )
  } catch (err) {
    // Fallback pill if React fails to mount
    appContainer.innerHTML = `
      <button id="ai-pr-fallback-btn" style="display:flex;align-items:center;gap:8px;padding:8px 14px;background:#4f46e5;color:#fff;border:none;border-radius:999px;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 4px 20px rgba(79,70,229,0.4);font-family:sans-serif">
        🤖 AI PR Copilot
      </button>`
    document.getElementById('ai-pr-fallback-btn')?.addEventListener('click', () => {
      window.location.reload()
    })
    console.error('[AI PR Copilot] Mount failed:', err)
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountPanel)
} else {
  mountPanel()
}
