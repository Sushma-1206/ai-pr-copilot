<div align="center">

  <h1>🤖 AI PR Copilot</h1>
  <p><strong>AI-Powered Pre-Flight Checks for Developers & Automated Audits for Reviewers on GitHub and GitLab Pull Requests.</strong></p>

  <p>
    <a href="https://github.com/Sushma-1206/ai-pr-copilot"><img src="https://img.shields.io/badge/Manifest-V3-5A67D8?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Manifest V3" /></a>
    <a href="https://github.com/Sushma-1206/ai-pr-copilot"><img src="https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" /></a>
    <a href="https://github.com/Sushma-1206/ai-pr-copilot"><img src="https://img.shields.io/badge/Vite-8.x-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" /></a>
    <a href="https://github.com/Sushma-1206/ai-pr-copilot"><img src="https://img.shields.io/badge/TailwindCSS-3.x-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></a>
    <a href="https://github.com/Sushma-1206/ai-pr-copilot"><img src="https://img.shields.io/badge/Backend-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" /></a>
    <a href="https://github.com/Sushma-1206/ai-pr-copilot"><img src="https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge" alt="License MIT" /></a>
  </p>

</div>

---

## 🌟 Overview

**AI PR Copilot** is a modern Chrome Extension (Manifest V3) designed to optimize code reviews and pre-flight checks directly on GitHub and GitLab. 

By injecting an intelligent side panel safely inside an isolated **Shadow DOM**, AI PR Copilot helps developers spot bugs, missing unit tests, and performance issues before submitting a PR—while giving reviewers instant executive summaries, security audit scores, and automated feedback.

---

## 👥 Meet the Team

<div align="center">

| Contributor | GitHub Profile | Role |
| :--- | :--- | :--- |
| 👩‍💻 **Sushma Kumari** | [@Sushma-1206](https://github.com/Sushma-1206) | Core Developer & Maintainer |
| 👩‍💻 **Mariya Anjum** | [@MariyaAnjum937](https://github.com/MariyaAnjum937) | Core Developer & Collaborator |
| 👩‍💻 **Syeda Naazima Unnisa** | [@syeda007](https://github.com/syeda007) | Core Developer & Collaborator |

</div>

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| **🚀 Developer Mode** | Runs automated pre-flight checks on PR diffs to flag potential bugs, edge cases, missing tests, and performance bottlenecks before hitting *Ready for Review*. |
| **🔍 Reviewer Mode** | Generates high-level summaries, security audit scores, breaking change alerts, and ready-to-post review comments. |
| **⚡ Real-Time DOM Parsing** | Extracts PR diffs, changed files, and code context directly from GitHub & GitLab pages without extra API rate limits. |
| **🔐 Unified Extension Auth** | Custom `chrome.storage.local` adapter for Supabase Auth providing a single, continuous login session across Extension Popups, Content Scripts, and Service Workers. |
| **📋 Custom Rules Engine** | Define team conventions or project-specific architectural rules that the AI enforces during every code scan. |
| **📜 History & Audit Logs** | Track historical PR review analyses and past scan results securely stored in Supabase with Row Level Security (RLS). |
| **🎨 Encapsulated Glassmorphism UI** | A sleek floating side panel with dark mode support, fluid micro-animations, and 100% CSS isolation via Shadow DOM. |

---

## 🛠️ Tech Stack & Architecture

- **Frontend Framework:** React 19 & Vite 8
- **Styling:** Tailwind CSS & Lucide Icons
- **Extension Architecture:** Chrome Extension Manifest V3 (`@crxjs/vite-plugin`)
- **Backend & Database:** Supabase (Auth, PostgreSQL, Row Level Security)
- **AI Engine:** Multi-provider support (Groq, OpenAI, Anthropic, Gemini API)

---

## 📁 Repository Structure

```text
ai-pr-copilot/
├── public/                 # Static extension assets & icons
├── src/
│   ├── background/         # Service worker for Manifest V3 events
│   ├── components/         # Modular React UI components
│   │   ├── AuthPanel.jsx         # Supabase Authentication UI
│   │   ├── DeveloperPanel.jsx    # Developer pre-flight check panel
│   │   ├── ReviewerPanel.jsx     # Security & compliance audit panel
│   │   ├── RulesPanel.jsx        # Custom project rules manager
│   │   ├── HistoryLogsPanel.jsx  # Past review logs viewer
│   │   ├── ApiKeyModal.jsx       # LLM API configuration modal
│   │   └── CodeFixCard.jsx       # Interactive AI code fix suggestions
│   ├── content/            # Injected Shadow DOM content script
│   ├── hooks/              # Custom React hooks (Auth, Storage)
│   ├── lib/                # Core services & utilities
│   │   ├── aiService.js          # Multi-LLM provider service
│   │   ├── diffExtractor.js      # GitHub / GitLab DOM diff extractor
│   │   ├── githubService.js      # GitHub REST API integrations
│   │   ├── rulesService.js       # Custom rules & Supabase manager
│   │   └── supabaseClient.js     # Supabase client with chrome.storage adapter
│   ├── popup/              # Chrome Extension popup toolbar UI
│   └── styles/             # Global CSS & Tailwind imports
├── supabase/               # SQL database migrations & schemas
│   └── migrations/
├── manifest.config.js      # Manifest V3 extension configuration
├── vite.config.js          # Vite build settings
└── package.json
```

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- `npm` (v9 or higher)
- A [Supabase](https://supabase.com) account

---

### 📥 Installation & Build

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Sushma-1206/ai-pr-copilot.git
   cd ai-pr-copilot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

4. **Configure Google sign-in:**
   - In Google Cloud, create a **Web application** OAuth client and add
     `https://<your-project-ref>.supabase.co/auth/v1/callback` as an authorized redirect URI.
   - In Supabase Dashboard → **Authentication → Sign In / Providers → Google**, enable Google and add that client ID and secret.
   - In Supabase Dashboard → **Authentication → URL Configuration → Redirect URLs**, add:
     `https://abbdjaagnpegifekmkelmccahjigbdnp.chromiumapp.org/supabase-auth`

   The manifest contains a public extension key so this unpacked extension ID
   and callback URL stay stable. The Google client secret belongs only in the
   Supabase Dashboard; never put it in `.env` or extension source code.

5. **Build the extension:**
   ```bash
   npm run build
   ```

---

### 🧩 Loading the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click **Load unpacked**.
4. Select the `dist/` directory generated inside your project folder.

> [!TIP]
> **Active Development & HMR:** Run `npm run dev` to start Vite in watch mode. `@crxjs/vite-plugin` automatically reloads content scripts and side panels whenever you edit the source code!

---

## 🗄️ Database Setup (Supabase)

To enable persistent user accounts, custom project rules, and audit logs:

```bash
# Login to Supabase CLI
npx supabase login

# Link local project to Supabase
npx supabase link --project-ref YOUR_PROJECT_REF

# Deploy SQL migrations & tables
npx supabase db push
```

> [!NOTE]
> Under Supabase Dashboard → *Authentication → Providers → Email*, you can optionally uncheck **Confirm email** for instant sign-in during development.

---

## 🛡️ License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more details.

---

<div align="center">
  <p>Built with ❤️ by <strong>Sushma Kumari</strong>, <strong>Mariya Anjum</strong>, and <strong>Syeda Naazima Unnisa</strong>.</p>
</div>
