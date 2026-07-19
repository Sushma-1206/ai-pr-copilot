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

  ReactDOM.createRoot(appContainer).render(
    <React.StrictMode>
      <ContentApp />
    </React.StrictMode>
  )
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountPanel)
} else {
  mountPanel()
}
