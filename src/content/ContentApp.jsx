import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import AuthPanel from '../components/AuthPanel'
import OverviewPanel from '../components/OverviewPanel'
import ReviewerOverviewPanel from '../components/ReviewerOverviewPanel'
import IssuesPanel from '../components/IssuesPanel'
import TestsPanel from '../components/TestsPanel'
import AskAIPanel from '../components/AskAIPanel'
import ReviewerPanel from '../components/ReviewerPanel'
import RiskPanel from '../components/RiskPanel'
import DiffPreviewPanel from '../components/DiffPreviewPanel'
import RulesPanel from '../components/RulesPanel'
import HistoryLogsPanel from '../components/HistoryLogsPanel'
import ApiKeyModal from '../components/ApiKeyModal'
import { extractPRDetails } from '../lib/diffExtractor'
import { runAIReview } from '../lib/aiService'

// Contributor compact navigation tabs
const CONTRIBUTOR_TABS = [
  { key: 'overview', label: 'Overview', icon: '🏠' },
  { key: 'issues', label: 'Issues', icon: '⚠️' },
  { key: 'tests', label: 'Tests', icon: '🧪' },
  { key: 'diff', label: 'Diff Preview', icon: '</>' },
  { key: 'ask', label: 'Ask AI', icon: '💬' }
]

// Reviewer compact navigation tabs
const REVIEWER_TABS = [
  { key: 'overview', label: 'Overview', icon: '🏠' },
  { key: 'focus', label: 'Key Focus', icon: '🎯' },
  { key: 'risk', label: 'Risk', icon: '🛡️' },
  { key: 'ask', label: 'Ask AI', icon: '💬' }
]

export default function ContentApp() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  
  // Persistent Role Selection: 'contributor' | 'reviewer'
  const [userRole, setUserRole] = useState(() => {
    try {
      return localStorage.getItem('ai_pr_copilot_user_role') || 'contributor'
    } catch {
      return 'contributor'
    }
  })

  const [activeTab, setActiveTab] = useState('overview')
  const [pendingAskPrompt, setPendingAskPrompt] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState('rules') // 'rules' | 'history'

  // PR details
  const [prDetails, setPrDetails] = useState(null)
  const [extractError, setExtractError] = useState(null)
  const [extracting, setExtracting] = useState(true)

  // AI Review states
  const [reviewResult, setReviewResult] = useState(null)
  const [previousResult, setPreviousResult] = useState(null)
  const [revReviewResult, setRevReviewResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [revLoading, setRevLoading] = useState(false)
  const [error, setError] = useState(null)
  const [revError, setRevError] = useState(null)

  // Fixes state across panels
  const [fixStatuses, setFixStatuses] = useState({})

  function handleFixStatusChange(issueId) {
    setFixStatuses(prev => ({ ...prev, [issueId]: 'applied' }))
  }

  function handleRoleToggle() {
    const nextRole = userRole === 'contributor' ? 'reviewer' : 'contributor'
    setUserRole(nextRole)
    try {
      localStorage.setItem('ai_pr_copilot_user_role', nextRole)
    } catch (e) {
      console.warn('Could not persist user role', e)
    }
    setActiveTab('overview')
  }

  // Dynamically compute improved readiness score as issues are resolved
  const totalIssuesCount = (reviewResult?.issues || []).length
  const appliedCount = Object.values(fixStatuses).filter(v => v === 'applied').length
  const computedScore = reviewResult?.readinessScore != null
    ? Math.min(100, Math.round(reviewResult.readinessScore + (totalIssuesCount > 0 ? (appliedCount / totalIssuesCount) * (100 - reviewResult.readinessScore) : 0)))
    : null

  const effectiveReviewResult = reviewResult ? {
    ...reviewResult,
    readinessScore: computedScore ?? reviewResult.readinessScore
  } : null

  // Modal
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [tokenRefreshKey, setTokenRefreshKey] = useState(0)

  useEffect(() => {
    async function initPRData() {
      setExtracting(true)
      setExtractError(null)
      try {
        const details = await extractPRDetails()
        setPrDetails(details)
      } catch (err) {
        setExtractError(err.message || 'Could not extract PR details from this page.')
      } finally {
        setExtracting(false)
      }
    }
    initPRData()
  }, [])

  async function handleRunDevCheck() {
    if (!prDetails) return
    setPreviousResult(reviewResult)
    setLoading(true)
    setError(null)
    try {
      const result = await runAIReview({ prDetails, mode: 'developer' })
      setReviewResult(result)
    } catch (err) {
      if (err.message === 'API_KEY_MISSING') {
        setError('API_KEY_MISSING')
      } else {
        setError(err.message || 'Analysis failed. Check your API key and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleRunRevCheck() {
    if (!prDetails) return
    setRevLoading(true)
    setRevError(null)
    try {
      const result = await runAIReview({ prDetails, mode: 'reviewer' })
      setRevReviewResult(result)
      if (!reviewResult) {
        setReviewResult(result)
      }
    } catch (err) {
      if (err.message === 'API_KEY_MISSING') {
        setRevError('API_KEY_MISSING')
      } else {
        setRevError(err.message || 'Reviewer analysis failed.')
      }
    } finally {
      setRevLoading(false)
    }
  }

  if (authLoading) return null

  // Collapsed pill
  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-full shadow-2xl transition transform hover:scale-105 cursor-pointer"
      >
        <span>🤖</span>
        <span>AI PR Copilot</span>
        {prDetails?.prNumber && (
          <span className="bg-indigo-800 text-indigo-100 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
            #{prDetails.prNumber}
          </span>
        )}
      </button>
    )
  }

  const currentTabs = userRole === 'contributor' ? CONTRIBUTOR_TABS : REVIEWER_TABS

  return (
    <div className="w-[480px] bg-white border border-gray-200/90 rounded-3xl shadow-2xl overflow-hidden font-sans text-xs">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-150">
        {/* Left: Brand & Tagline */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 flex items-center justify-center text-white text-base shadow-xs shrink-0">
            🤖
          </div>
          <div>
            <h2 className="text-xs font-black tracking-tight text-gray-900 leading-tight">
              AI PR Copilot
            </h2>
            <p className="text-[9.5px] text-gray-400 font-medium">
              Smarter PRs. Faster.
            </p>
          </div>
        </div>

        {/* Right: Role Switcher & PR Badge & Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Role Switcher Dropdown Pill */}
          <button
            onClick={handleRoleToggle}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 transition cursor-pointer shadow-2xs"
            title="Click to switch between Contributor and Reviewer"
          >
            <span>{userRole === 'contributor' ? '👤 Contributor' : '👁 Reviewer'}</span>
            <span className="text-[8px] text-indigo-400">▾</span>
          </button>

          {/* PR Number Pill */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono font-semibold bg-gray-50 border border-gray-200 text-gray-700">
            <span className="opacity-80">🐙</span>
            <span>PR #{prDetails?.prNumber || '4557'}</span>
          </div>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
              showSettings ? 'bg-indigo-50 text-indigo-700' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title="Settings & Rules"
          >
            ⚙️
          </button>

          {/* Keys */}
          <button
            onClick={() => setShowKeyModal(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-xs transition cursor-pointer"
            title="Configure API Keys"
          >
            🔑
          </button>

          {/* Close */}
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-xs transition cursor-pointer font-bold"
            aria-label="Collapse panel"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-3.5 space-y-3">
        {!isAuthenticated ? (
          <AuthPanel />
        ) : extracting ? (
          <div className="text-center py-8 text-gray-400 space-y-2">
            <span className="animate-spin inline-block text-xl">🌀</span>
            <p className="text-xs text-gray-500">Reading pull request...</p>
          </div>
        ) : extractError ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs">
            <p className="font-semibold mb-1">⚠️ Could Not Read PR</p>
            <p>{extractError}</p>
            <p className="mt-1 text-[10px] text-amber-600">Make sure you are on a GitHub or GitLab pull request page, then refresh.</p>
          </div>
        ) : showSettings ? (
          /* Settings drawer */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">⚙️ Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer"
              >
                ← Back
              </button>
            </div>
            <div className="flex bg-gray-100/90 p-1 rounded-xl gap-1">
              {[
                { key: 'rules', label: '📏 Rules' },
                { key: 'history', label: '📜 History' }
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setSettingsTab(t.key)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    settingsTab === t.key
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="min-h-[260px] max-h-[500px] overflow-y-auto pr-1">
              {settingsTab === 'rules' && <RulesPanel repoIdentifier={prDetails?.repoIdentifier} />}
              {settingsTab === 'history' && <HistoryLogsPanel repoIdentifier={prDetails?.repoIdentifier} />}
            </div>
          </div>
        ) : (
          /* Main Workflow View */
          <div className="space-y-3">
            {/* Compact Top Navigation Tabs */}
            <div className="flex bg-gray-100/80 p-1 rounded-xl gap-1">
              {currentTabs.map(tab => {
                const isActive = activeTab === tab.key
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-1.5 px-1 rounded-lg text-[10.5px] font-semibold transition-all duration-150 flex items-center justify-center gap-1 cursor-pointer truncate ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                        : 'text-gray-500 hover:text-gray-800 hover:bg-white/60'
                    }`}
                  >
                    <span className="text-xs shrink-0">{tab.icon}</span>
                    <span className="truncate">{tab.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Tab Panels */}
            <div className="min-h-[320px] max-h-[540px] overflow-y-auto pr-0.5">
              {/* Contributor Mode Tabs */}
              {userRole === 'contributor' && (
                <>
                  {activeTab === 'overview' && (
                    <OverviewPanel
                      prDetails={prDetails}
                      onRunCheck={handleRunDevCheck}
                      loading={loading}
                      reviewResult={effectiveReviewResult}
                      previousResult={previousResult}
                      error={error}
                      onOpenApiKeyModal={() => setShowKeyModal(true)}
                      onTabChange={setActiveTab}
                      fixStatuses={fixStatuses}
                      onFixStatusChange={handleFixStatusChange}
                    />
                  )}

                  {activeTab === 'issues' && (
                    <IssuesPanel
                      prDetails={prDetails}
                      reviewResult={effectiveReviewResult}
                      onOpenApiKeyModal={() => setShowKeyModal(true)}
                      fixStatuses={fixStatuses}
                      onFixStatusChange={handleFixStatusChange}
                    />
                  )}

                  {activeTab === 'tests' && (
                    <TestsPanel
                      prDetails={prDetails}
                      reviewResult={reviewResult}
                      onOpenApiKeyModal={() => setShowKeyModal(true)}
                    />
                  )}

                  {activeTab === 'diff' && (
                    <DiffPreviewPanel prDetails={prDetails} />
                  )}

                  {activeTab === 'ask' && (
                    <AskAIPanel
                      prDetails={prDetails}
                      analysisResult={reviewResult}
                      onOpenApiKeyModal={() => setShowKeyModal(true)}
                      initialPrompt={pendingAskPrompt}
                      onClearInitialPrompt={() => setPendingAskPrompt(null)}
                    />
                  )}
                </>
              )}

              {/* Reviewer Mode Tabs */}
              {userRole === 'reviewer' && (
                <>
                  {activeTab === 'overview' && (
                    <ReviewerOverviewPanel
                      prDetails={prDetails}
                      reviewResult={effectiveReviewResult || revReviewResult}
                      loading={loading || revLoading}
                      error={error || revError}
                      onRunCheck={handleRunRevCheck}
                      onOpenApiKeyModal={() => setShowKeyModal(true)}
                      onTabChange={setActiveTab}
                      onAskPrompt={(prompt) => {
                        setPendingAskPrompt(prompt)
                        setActiveTab('ask')
                      }}
                    />
                  )}

                  {activeTab === 'focus' && (
                    <ReviewerPanel
                      prDetails={prDetails}
                      onRunCheck={handleRunRevCheck}
                      loading={revLoading}
                      reviewResult={revReviewResult || reviewResult}
                      error={revError}
                      onOpenApiKeyModal={() => setShowKeyModal(true)}
                      tokenRefreshKey={tokenRefreshKey}
                      onReAnalyze={handleRunDevCheck}
                    />
                  )}

                  {activeTab === 'risk' && (
                    <RiskPanel
                      prDetails={prDetails}
                      reviewResult={effectiveReviewResult || revReviewResult}
                      onTabChange={setActiveTab}
                    />
                  )}

                  {activeTab === 'diff' && (
                    <DiffPreviewPanel prDetails={prDetails} />
                  )}

                  {activeTab === 'ask' && (
                    <AskAIPanel
                      prDetails={prDetails}
                      analysisResult={reviewResult || revReviewResult}
                      onOpenApiKeyModal={() => setShowKeyModal(true)}
                      initialPrompt={pendingAskPrompt}
                      onClearInitialPrompt={() => setPendingAskPrompt(null)}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        onSaveSuccess={() => {
          setError(null)
          setRevError(null)
          setTokenRefreshKey(k => k + 1)
        }}
      />
    </div>
  )
}
