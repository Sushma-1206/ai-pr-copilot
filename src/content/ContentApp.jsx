import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import AuthPanel from '../components/AuthPanel'
import DeveloperPanel from '../components/DeveloperPanel'
import ReviewerPanel from '../components/ReviewerPanel'
import RulesPanel from '../components/RulesPanel'
import HistoryLogsPanel from '../components/HistoryLogsPanel'
import ApiKeyModal from '../components/ApiKeyModal'
import { extractPRDetails } from '../lib/diffExtractor'
import { runAIReview, getAISettings } from '../lib/aiService'

export default function ContentApp() {
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('developer') // 'developer' | 'reviewer' | 'rules' | 'history'

  // PR details state
  const [prDetails, setPrDetails] = useState(null)
  const [extractError, setExtractError] = useState(null)
  const [extracting, setExtracting] = useState(true)

  // AI Review states
  const [devReviewResult, setDevReviewResult] = useState(null)
  const [revReviewResult, setRevReviewResult] = useState(null)
  const [devLoading, setDevLoading] = useState(false)
  const [revLoading, setRevLoading] = useState(false)
  const [devError, setDevError] = useState(null)
  const [revError, setRevError] = useState(null)

  // Api key modal
  const [showKeyModal, setShowKeyModal] = useState(false)

  // Extract PR details when panel opens
  useEffect(() => {
    async function initPRData() {
      setExtracting(true)
      setExtractError(null)
      try {
        const details = await extractPRDetails()
        setPrDetails(details)
      } catch (err) {
        setExtractError(err.message || 'Could not extract PR details.')
      } finally {
        setExtracting(false)
      }
    }

    initPRData()
  }, [])

  async function handleRunDevCheck() {
    if (!prDetails) return
    setDevLoading(true)
    setDevError(null)

    try {
      const result = await runAIReview({ prDetails, mode: 'developer' })
      setDevReviewResult(result)
    } catch (err) {
      if (err.message === 'API_KEY_MISSING') {
        setDevError('API_KEY_MISSING')
      } else {
        setDevError(err.message || 'Failed to run developer pre-flight check.')
      }
    } finally {
      setDevLoading(false)
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
        setRevError(err.message || 'Failed to generate reviewer summary.')
      }
    } finally {
      setRevLoading(false)
    }
  }

  if (authLoading) return null

  // Collapsed Floating Button Pill
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
      </button>
    )
  }

  return (
    <div className="w-[380px] bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden font-sans text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-gray-900 text-white">
        <div className="flex items-center gap-2">
          <span className="text-base">🤖</span>
          <div>
            <h2 className="text-xs font-bold tracking-tight">AI PR Copilot</h2>
            {prDetails?.repoIdentifier && (
              <p className="text-[10px] text-gray-400 font-mono">{prDetails.repoIdentifier}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowKeyModal(true)}
            className="text-gray-300 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-gray-800 transition"
            title="Configure Gemini API Key"
          >
            ⚙️ Key
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="text-gray-400 hover:text-white text-sm"
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
          <div className="text-center py-8 text-gray-500 space-y-2">
            <span className="animate-spin inline-block text-xl">🌀</span>
            <p className="text-xs">Extracting pull request diff...</p>
          </div>
        ) : extractError ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-xs">
            ⚠️ {extractError}
          </div>
        ) : (
          <div className="space-y-3">
            {/* PR Info Header */}
            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs space-y-1">
              <p className="font-semibold text-gray-900 truncate" title={prDetails?.title}>
                {prDetails?.title}
              </p>
              <div className="flex items-center justify-between text-[11px] text-gray-500">
                <span>PR #{prDetails?.prNumber}</span>
                <span className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded text-[10px]">
                  {prDetails?.filesCount} files changed
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 text-xs">
              <button
                onClick={() => setActiveTab('developer')}
                className={`flex-1 py-1.5 font-medium border-b-2 transition ${
                  activeTab === 'developer'
                    ? 'border-indigo-600 text-indigo-600 font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                🚀 Dev
              </button>
              <button
                onClick={() => setActiveTab('reviewer')}
                className={`flex-1 py-1.5 font-medium border-b-2 transition ${
                  activeTab === 'reviewer'
                    ? 'border-purple-600 text-purple-600 font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                🔍 Reviewer
              </button>
              <button
                onClick={() => setActiveTab('rules')}
                className={`flex-1 py-1.5 font-medium border-b-2 transition ${
                  activeTab === 'rules'
                    ? 'border-indigo-600 text-indigo-600 font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                ⚙️ Rules
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-1.5 font-medium border-b-2 transition ${
                  activeTab === 'history'
                    ? 'border-indigo-600 text-indigo-600 font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                📜 History
              </button>
            </div>

            {/* Tab Views */}
            <div className="min-h-[250px] max-h-[420px] overflow-y-auto pr-1">
              {activeTab === 'developer' && (
                <DeveloperPanel
                  prDetails={prDetails}
                  onRunCheck={handleRunDevCheck}
                  loading={devLoading}
                  reviewResult={devReviewResult}
                  error={devError}
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
                />
              )}

              {activeTab === 'rules' && (
                <RulesPanel repoIdentifier={prDetails?.repoIdentifier} />
              )}

              {activeTab === 'history' && (
                <HistoryLogsPanel repoIdentifier={prDetails?.repoIdentifier} />
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
          setDevError(null)
          setRevError(null)
        }}
      />
    </div>
  )
}
