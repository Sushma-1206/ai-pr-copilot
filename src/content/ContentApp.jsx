import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import AuthPanel from '../components/AuthPanel'
import OverviewPanel from '../components/OverviewPanel'
import IssuesPanel from '../components/IssuesPanel'
import TestsPanel from '../components/TestsPanel'
import AskAIPanel from '../components/AskAIPanel'
import ReviewerPanel from '../components/ReviewerPanel'
import RulesPanel from '../components/RulesPanel'
import HistoryLogsPanel from '../components/HistoryLogsPanel'
import ApiKeyModal from '../components/ApiKeyModal'
import { extractPRDetails } from '../lib/diffExtractor'
import { runAIReview, getAISettings } from '../lib/aiService'

// Primary tabs (visible in main nav)
const PRIMARY_TABS = [
  { key: 'overview', label: 'Overview', icon: '🚀' },
  { key: 'issues', label: 'Issues', icon: '🔍' },
  { key: 'tests', label: 'Tests', icon: '🧪' },
  { key: 'ask', label: 'Ask AI', icon: '💬' },
  { key: 'reviewer', label: 'Reviewer', icon: '📋' }
]

export default function ContentApp() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
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

  // Modal
  const [showKeyModal, setShowKeyModal] = useState(false)
  // Increment to signal token-dependent panels to re-check token
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
    setPreviousResult(reviewResult) // keep for before/after
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
        className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-full shadow-2xl transition transform hover:scale-105"
      >
        <span>🤖</span>
        <span>AI PR Copilot</span>
        {prDetails?.repoIdentifier && (
          <span className="bg-indigo-800 text-indigo-100 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
            {prDetails.repoIdentifier}
          </span>
        )}
        {reviewResult && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
            (reviewResult.readinessScore || 0) >= 80
              ? 'bg-emerald-400 text-emerald-900'
              : (reviewResult.readinessScore || 0) >= 60
              ? 'bg-amber-400 text-amber-900'
              : 'bg-rose-400 text-rose-900'
          }`}>
            {reviewResult.readinessScore}%
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="w-[460px] bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden font-sans text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-gray-950 via-slate-900 to-indigo-950 text-white border-b border-gray-800/80 shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex items-center justify-center">
            <span className="text-base shrink-0">🤖</span>
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-gray-900 animate-pulse" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>AI PR Copilot</span>
            </h2>
            {prDetails?.repoIdentifier && (
              <p className="text-[10px] text-gray-400 font-mono truncate">
                {prDetails.repoIdentifier}{prDetails.prNumber ? ` • PR #${prDetails.prNumber}` : ''}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
              showSettings ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            title="Settings, Rules & History"
          >
            ⚙️
          </button>
          <button
            onClick={() => setShowKeyModal(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 text-xs transition cursor-pointer"
            title="Configure API Keys"
          >
            🔑
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 text-xs transition cursor-pointer font-bold"
            aria-label="Collapse panel"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-3">
        {!isAuthenticated ? (
          <AuthPanel />
        ) : extracting ? (
          <div className="text-center py-8 text-gray-400 space-y-2">
            <span className="animate-spin inline-block text-xl">🌀</span>
            <p className="text-xs text-gray-500">Reading pull request...</p>
          </div>
        ) : extractError ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
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
          /* Main content */
          <div className="space-y-3">
            {/* PR Title bar */}
            {prDetails?.title && (
              <div className="px-2.5 py-2 bg-gradient-to-r from-gray-50 to-indigo-50/30 border border-gray-200/90 rounded-xl shadow-2xs">
                <p className="font-semibold text-gray-900 truncate text-[11px]" title={prDetails.title}>
                  {prDetails.title}
                </p>
                <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
                  <span className="font-medium text-indigo-700">PR #{prDetails.prNumber}</span>
                  <span className="bg-gray-200/80 text-gray-700 px-1.5 py-0.5 rounded-md font-mono text-[9px]">
                    {prDetails.filesCount} files changed
                  </span>
                </div>
              </div>
            )}

            {/* Segmented Navigation tabs */}
            <div className="flex bg-gray-100/90 p-1 rounded-xl gap-1 shadow-inner">
              {PRIMARY_TABS.map(tab => {
                const isActive = activeTab === tab.key
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-1.5 px-1 rounded-lg text-[10px] font-semibold transition-all duration-150 flex items-center justify-center gap-1 cursor-pointer ${
                      isActive
                        ? 'bg-white text-indigo-700 shadow-2xs font-bold scale-[1.02]'
                        : 'text-gray-500 hover:text-gray-800 hover:bg-white/40'
                    }`}
                  >
                    <span className="text-xs">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Tab Content */}
            <div className="min-h-[300px] max-h-[520px] overflow-y-auto pr-0.5">
              {activeTab === 'overview' && (
                <OverviewPanel
                  prDetails={prDetails}
                  onRunCheck={handleRunDevCheck}
                  loading={loading}
                  reviewResult={reviewResult}
                  previousResult={previousResult}
                  error={error}
                  onOpenApiKeyModal={() => setShowKeyModal(true)}
                  onTabChange={setActiveTab}
                />
              )}

              {activeTab === 'issues' && (
                <IssuesPanel
                  prDetails={prDetails}
                  reviewResult={reviewResult}
                  onOpenApiKeyModal={() => setShowKeyModal(true)}
                />
              )}

              {activeTab === 'tests' && (
                <TestsPanel
                  prDetails={prDetails}
                  reviewResult={reviewResult}
                  onOpenApiKeyModal={() => setShowKeyModal(true)}
                />
              )}

              {activeTab === 'ask' && (
                <AskAIPanel
                  prDetails={prDetails}
                  analysisResult={reviewResult}
                  onOpenApiKeyModal={() => setShowKeyModal(true)}
                />
              )}

              {activeTab === 'reviewer' && (
                <ReviewerPanel
                  prDetails={prDetails}
                  onRunCheck={handleRunRevCheck}
                  loading={revLoading}
                  reviewResult={revReviewResult}
                  error={revError}
                  onOpenApiKeyModal={() => setShowKeyModal(true)}
                  tokenRefreshKey={tokenRefreshKey}
                  onReAnalyze={() => {
                    setActiveTab('overview')
                    handleRunDevCheck()
                  }}
                />
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
          setTokenRefreshKey(k => k + 1) // trigger token re-check in ReviewerPanel
        }}
      />
    </div>
  )
}
