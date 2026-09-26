import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  // Keep the unpacked extension ID stable so the OAuth callback URL does not
  // change between builds or machines.
  key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsMZ9ixQ2cHr8hi/+Q2V80AZKFsHmEXqKy3R/SiUELPma0LTb4iY8v57NRMHSPti+N8lh3RQ+OnFE+6vNhmiKBrSEminKqCbLy9x0WRtVEy5Ak8Iq9cr3m9XudRLrkTGUd9IK09kihdirLHTlaP+CSFOXHpFamGhZy+bg+KYgZb6Cnc4geFKUL8Q1bjer1iCtlMrs3+iL7wnR2XWKyadJu46rA0Ses4mXS9u0bzGjAGX1WLvBy3SL5yknISkWBbJdTKW6+/sSdfmYU17X7ljChNKeqYpdUzzxJ1+OH9587QFMbjcGXLnJUPOVh5//+wwwIDun0fI4MFEW21wfx3xPLwIDAQAB',
  name: 'AI PR Copilot',
  description:
    'AI-powered pre-flight checks for developers and final verification for reviewers on GitHub/GitLab pull requests.',
  version: pkg.version,
  icons: {
    16: 'public/icons/icon16.png',
    48: 'public/icons/icon48.png',
    128: 'public/icons/icon128.png'
  },
  action: {
    default_popup: 'src/popup/popup.html',
    default_icon: {
      16: 'public/icons/icon16.png',
      48: 'public/icons/icon48.png',
      128: 'public/icons/icon128.png'
    }
  },
  background: {
    service_worker: 'src/background/background.js',
    type: 'module'
  },
  oauth2: {
    client_id: '1067050462708-um4ecl0nap1lh3seeclervdjhkhm3gqe.apps.googleusercontent.com',
    scopes: ['openid', 'email', 'profile']
  },
  content_scripts: [
    {
      matches: [
        'https://github.com/*/*/pull/*',
        'https://github.com/*/*/compare/*',
        'https://gitlab.com/*/-/merge_requests/*'
      ],
      js: ['src/content/content.jsx'],
      run_at: 'document_idle'
    }
  ],
  permissions: ['storage', 'activeTab', 'identity'],
  host_permissions: [
    'https://github.com/*',
    'https://gitlab.com/*',
    'https://*.firebaseio.com/*',
    'https://*.googleapis.com/*'
  ]
})
