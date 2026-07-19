# 🤖 AI PR Copilot

> **AI-Powered Pre-Flight Checks for Developers & Automated Audits for Reviewers on GitHub and GitLab Pull Requests.**

<p align="center">
  <img src="https://img.shields.io/badge/Manifest-V3-blue.svg" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/React-19.x-61dafb.svg" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8.x-646cff.svg" alt="Vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.x-38bdf8.svg" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Backend-Supabase-3ecf8e.svg" alt="Supabase" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License MIT" />
</p>

---

## 🌟 Overview

**AI PR Copilot** is a modern Chrome extension (Manifest V3) that seamlessly embeds an intelligent AI review panel directly into GitHub and GitLab Pull Request pages. It helps developers conduct thorough pre-flight checks before requesting reviews and assists maintainers/reviewers with automated code security, performance, and compliance audits.

Built with **React 19**, **Vite**, **Tailwind CSS**, and **Supabase**, AI PR Copilot operates safely within an isolated Shadow DOM to ensure smooth styling integration without interfering with GitHub or GitLab's UI.

---

## ✨ Key Features

- **🚀 Dual Mode AI Reviewer:**
  - **Developer Mode:** Runs pre-flight checks on pull request diffs to flag potential bugs, edge cases, missing unit tests, and performance bottlenecks before you hit *Ready for Review*.
  - **Reviewer Mode:** Generates executive summaries, security audit scores, breaking change warnings, and ready-to-use review comments for code reviewers.
- **⚡ Real-Time DOM Diff Extraction:** Automatically extracts PR diffs, file changes, and context directly from GitHub and GitLab PR DOMs.
- **🔐 Shared Extension Auth Session:** Custom `chrome.storage.local` adapter for Supabase Auth that maintains a unified, seamless session across Extension Popups, Content Scripts, and Background Workers.
- **📋 Custom Project Rules Engine:** Define custom linting, architectural rules, or coding conventions per project. The AI enforces these rules during every scan.
- **📜 Audit Logs & History:** Track historical PR review analyses and past scan results securely stored in Supabase with Row Level Security (RLS).
- **🎨 Glassmorphism & Shadow DOM UI:** Beautiful floating side panel with dark mode UI, micro-animations, and complete CSS encapsulation.

---

## 🛠️ Tech Stack

- **Frontend & UI:** React 19, Tailwind CSS, Lucide React (Icons)
- **Extension Architecture:** Chrome Extension Manifest V3, `@crxjs/vite-plugin`
- **Build Tool:** Vite 8
- **Backend & Database:** Supabase (Auth, PostgreSQL, Row Level Security, Edge Functions)
- **AI Integrations:** Flexible API key configuration supporting OpenAI, Anthropic, Groq, and custom endpoints.

---

## 📁 Project Structure

```
ai-pr-copilot/
├── public/                 # Static assets & extension icons
├── src/
│   ├── background/         # Service worker for MV3 background events
│   ├── components/         # Modular React UI components
│   │   ├── AuthPanel.jsx         # Supabase Authentication (Login/Signup)
│   │   ├── DeveloperPanel.jsx    # Pre-flight PR checks & code fixes
│   │   ├── ReviewerPanel.jsx     # Security & compliance audit panel
│   │   ├── RulesPanel.jsx        # Custom project rules configuration
│   │   ├── HistoryLogsPanel.jsx  # Past review logs
│   │   ├── ApiKeyModal.jsx       # LLM API Provider settings
│   │   └── CodeFixCard.jsx       # Suggested code diff fixes
│   ├── content/            # Injected Shadow DOM side panel script
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Core business logic & services
│   │   ├── aiService.js          # AI client & prompt formatting
│   │   ├── diffExtractor.js      # GitHub / GitLab DOM diff parser
│   │   ├── githubService.js      # GitHub API integrations
│   │   ├── rulesService.js       # Rules management
│   │   └── supabaseClient.js     # Supabase client & storage adapter
│   ├── popup/              # Chrome Extension popup interface
│   └── styles/             # Global CSS & Tailwind imports
├── supabase/               # SQL Migrations & Database Schema
│   └── migrations/
├── manifest.config.js      # Chrome Extension Manifest V3 configuration
├── vite.config.js          # Vite build pipeline configuration
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- `npm` (v9 or higher)
- A [Supabase](https://supabase.com) account & project

---

### 📥 Installation

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
   Create a `.env` file in the project root:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

4. **Build the extension:**
   ```bash
   npm run build
   ```

---

### 🧩 Loading into Browser (Developer Mode)

1. Open Chrome or any Chromium-based browser (Edge, Brave, Arc).
2. Navigate to `chrome://extensions`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked**.
5. Select the generated `dist/` directory inside your project folder.

> 💡 **For Active Development with Hot Reload:**  
> Run `npm run dev` and keep the `dist/` folder loaded. HMR will update content scripts and UI changes automatically.

---

## 🗄️ Database Setup (Supabase)

To enable authentication and persistent review logs, deploy the DB schema to your Supabase instance:

```bash
# Login to Supabase CLI
npx supabase login

# Link your local repo to your Supabase project
npx supabase link --project-ref YOUR_PROJECT_REF

# Apply database migrations
npx supabase db push
```

> **Note:** In your Supabase Dashboard under *Authentication → Providers → Email*, you can optionally disable "Confirm email" for faster local development.

---

## 🧪 Usage Instructions

1. Click the **AI PR Copilot** extension icon in your browser toolbar and sign in or register.
2. Navigate to any open Pull Request on GitHub (e.g., `https://github.com/facebook/react/pull/1`).
3. Look for the floating **🤖 AI PR Copilot** widget in the bottom-right corner.
4. Expand the panel to:
   - Run **Developer Pre-Flight Checks** on diffs.
   - Run **Reviewer Audits** for security & code quality scoring.
   - Configure **Custom Rules** to enforce team conventions.

---

## 🛡️ License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ❤️ for developers and code reviewers worldwide.
</p>
