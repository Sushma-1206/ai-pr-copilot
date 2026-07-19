import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
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
  permissions: ['storage', 'activeTab'],
  host_permissions: ['https://github.com/*', 'https://gitlab.com/*', 'https://*.supabase.co/*']
})
