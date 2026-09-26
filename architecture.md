# AI PR Copilot Architecture

## Current State

- **Type**: Chrome Extension (Manifest V3)
- **Framework**: React + Vite + Tailwind CSS
- **Authentication**: Supabase (Email/Password & Google OAuth)
- **AI Integration**: Groq API (openai-compatible endpoint)
- **Key Files**:
  - `src/background/background.js`: Handles Google OAuth and initialization.
  - `src/content/content.jsx`: Injects UI into GitHub PR pages.
  - `src/popup/Popup.jsx`: Main extension popup UI.
  - `src/lib/aiService.js`: Handles Groq AI prompts and communication.
  - `src/lib/githubService.js`: Handles GitHub API integration.
  - `src/lib/supabaseClient.js`: Supabase connection.

## Planned Changes (Phases)

1. **Phase 1**: Restructure AI JSON output schema.
2. **Phase 2**: Redesign main PR review UI.
3. **Phase 3**: Implement targeted "Fix This" actions and re-analysis.
4. **Phase 4**: Add test generation functionality.
5. **Phase 5**: Add interactive "Ask AI" chat.
6. **Phase 6**: Enhance breaking change detection, security review, and reviewer mode.
7. **Phase 7**: Polish UI, caching, and error handling.
