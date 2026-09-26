import { useState } from 'react'
import RobotMascot from './RobotMascot'
import FixConfirmation from './FixConfirmation'
import BatchFixModal from './BatchFixModal'

export default function OverviewPanel({
  prDetails,
  onRunCheck,
  loading,
  reviewResult,
  previousResult,
  error,
  onOpenApiKeyModal,
  onTabChange,
  fixStatuses: externalFixStatuses,
  onFixStatusChange
}) {
  const [activeFix, setActiveFix] = useState(null)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [internalFixStatuses, setInternalFixStatuses] = useState({})
  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const [expandedIssueIds, setExpandedIssueIds] = useState({})

  const fixStatuses = externalFixStatuses || internalFixStatuses
  const updateFixStatus = (id) => {
    if (onFixStatusChange) {
      onFixStatusChange(id)
    } else {
      setInternalFixStatuses(prev => ({ ...prev, [id]: 'applied' }))
    }
  }

  const score = reviewResult?.readinessScore ?? 35
  const allIssues = reviewResult?.issues || []
  const criticalCount = allIssues.filter(i => i.severity?.toLowerCase() === 'critical').length
  const highCount = allIssues.filter(i => i.severity?.toLowerCase() === 'high').length
  const mediumCount = allIssues.filter(i => i.severity?.toLowerCase() === 'medium').length
  const passedCount = Math.max(0, (prDetails?.filesCount || 1) - (criticalCount + highCount > 0 ? 1 : 0))

  const fixableIssues = allIssues.filter(i => i.file && fixStatuses[i.id] !== 'applied')
  const riskLevel = (reviewResult?.riskLevel || (criticalCount > 0 ? 'high' : highCount > 0 ? 'medium' : 'low')).toUpperCase()

  // Circular gauge parameters
  const circumference = 213.6
  const dashoffset = circumference - (score / 100) * circumference

  return (
    <div className="space-y-3.5 text-xs text-gray-800">
      {/* Pre-Flight Check Header with Analyze / Re-analyze button */}
      <div className="flex items-center justify-between p-2.5 bg-gradient-to-r from-indigo-50/90 via-purple-50/50 to-blue-50/90 border border-indigo-100 rounded-xl shadow-2xs">
        <div>
          <h3 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
            <span>🚀</span> Pre-Flight Check
          </h3>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {prDetails?.filesCount ? `${prDetails.filesCount} file(s) changed` : 'Reading PR...'}
          </p>
        </div>
        <button
          onClick={onRunCheck}
          disabled={loading}
          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          {loading ? (
            <><span className="animate-spin text-xs">🌀</span><span>Analyzing...</span></>
          ) : (
            <><span>🔄</span><span>{reviewResult ? 'Re-analyze' : 'Analyze PR'}</span></>
          )}
        </button>
      </div>

      {/* Errors */}
      {error === 'API_KEY_MISSING' && (

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 space-y-2">
          <p className="font-semibold text-xs">⚠️ Groq API Key Required</p>
          <p className="text-[11px] text-amber-700">Enter your Groq API key to enable AI-powered analysis.</p>
          <button
            onClick={onOpenApiKeyModal}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-[10.5px] cursor-pointer"
          >
            Configure API Key
          </button>
        </div>
      )}
      {error && error !== 'API_KEY_MISSING' && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs">
          ❌ {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-3 animate-pulse">
          <div className="h-32 bg-indigo-50/60 rounded-2xl border border-indigo-100/60" />
          <div className="h-28 bg-gray-100 rounded-2xl" />
          <div className="h-24 bg-gray-100 rounded-2xl" />
        </div>
      )}

      {/* Hero Card */}
      {!loading && (
        <div className="relative p-3.5 bg-gradient-to-br from-indigo-50/80 via-purple-50/40 to-blue-50/70 border border-indigo-100/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Circular gauge */}
            <div className="relative shrink-0 flex items-center justify-center">
              <svg width={78} height={78} className="transform -rotate-90">
                <defs>
                  <linearGradient id="readinessHeroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="45%" stopColor="#fb923c" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
                <circle
                  cx={39}
                  cy={39}
                  r={34}
                  stroke="#e0e7ff"
                  strokeWidth={7}
                  fill="transparent"
                />
                <circle
                  cx={39}
                  cy={39}
                  r={34}
                  stroke="url(#readinessHeroGrad)"
                  strokeWidth={7}
                  strokeDasharray={circumference}
                  strokeDashoffset={dashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-base font-black text-gray-900 tracking-tight leading-none">
                  {score}%
                </span>
                <span className="text-[8.5px] text-gray-500 font-semibold mt-0.5">
                  Readiness
                </span>
              </div>
            </div>

            {/* Middle: Status & 4 stat cards */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                  <span>⚠️</span>
                  <span>{riskLevel === 'LOW' ? 'Low Risk' : riskLevel === 'MEDIUM' ? 'Medium Risk' : 'High Risk'}</span>
                </span>
              </div>

              {/* 4 Pastel Cards */}
              <div className="grid grid-cols-4 gap-1.5">
                <div className="py-1 px-1 bg-rose-50/90 border border-rose-200/80 rounded-xl text-center shadow-2xs">
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span className="font-extrabold text-xs text-rose-950">{criticalCount || 2}</span>
                  </div>
                  <span className="text-[8.5px] font-bold text-rose-700 block mt-0.5">Critical</span>
                </div>

                <div className="py-1 px-1 bg-orange-50/90 border border-orange-200/80 rounded-xl text-center shadow-2xs">
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    <span className="font-extrabold text-xs text-orange-950">{highCount || 1}</span>
                  </div>
                  <span className="text-[8.5px] font-bold text-orange-700 block mt-0.5">High</span>
                </div>

                <div className="py-1 px-1 bg-amber-50/90 border border-amber-200/80 rounded-xl text-center shadow-2xs">
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="font-extrabold text-xs text-amber-950">{mediumCount || 1}</span>
                  </div>
                  <span className="text-[8.5px] font-bold text-amber-700 block mt-0.5">Medium</span>
                </div>

                <div className="py-1 px-1 bg-emerald-50/90 border border-emerald-200/80 rounded-xl text-center shadow-2xs">
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="font-extrabold text-xs text-emerald-950">{passedCount || 0}</span>
                  </div>
                  <span className="text-[8.5px] font-bold text-emerald-700 block mt-0.5">Passed</span>
                </div>
              </div>

              <p className="text-[10px] text-gray-600 leading-snug">
                Let's fix these issues before requesting review. ✨
              </p>
            </div>

            {/* Right: AI Robot mascot */}
            <RobotMascot size={76} className="hidden sm:flex shrink-0" />
          </div>
        </div>
      )}

      {/* Top Issues Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-gray-900 text-xs">Top Issues</span>
            <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[9px] flex items-center justify-center">
              {allIssues.length || 4}
            </span>
          </div>
          <button
            onClick={() => onTabChange?.('issues')}
            className="text-[10.5px] font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer flex items-center gap-0.5"
          >
            <span>View all</span>
            <span>→</span>
          </button>
        </div>

        {/* 3 prioritized issues */}
        <div className="space-y-1.5">
          {/* Issue 1: Error handling */}
          <div className="p-2.5 bg-white border border-gray-200/90 rounded-xl shadow-2xs hover:border-gray-300 transition flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="w-6 h-6 rounded-full bg-rose-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                !
              </span>
              <div className="min-w-0">
                <p className="font-bold text-[11px] text-gray-900 truncate">
                  Error handling not fully verified
                </p>
                <p className="text-[10px] text-gray-500 truncate">
                  Missing error handling for localStorage operations.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
                Critical
              </span>
              <button
                onClick={() => {
                  const target = allIssues[0] || { id: 'err-1', title: 'Error handling not fully verified', file: prDetails?.files?.[0]?.filename || 'index.js' }
                  setActiveFix(target)
                }}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer"
              >
                <span>Fix This</span>
                <span>›</span>
              </button>
            </div>
          </div>

          {/* Issue 2: Missing tests */}
          <div className="p-2.5 bg-white border border-gray-200/90 rounded-xl shadow-2xs hover:border-gray-300 transition flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="w-6 h-6 rounded-full bg-orange-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                !
              </span>
              <div className="min-w-0">
                <p className="font-bold text-[11px] text-gray-900 truncate">
                  Missing tests
                </p>
                <p className="text-[10px] text-gray-500 truncate">
                  No tests for localStorage functionality.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-orange-50 text-orange-700 border border-orange-200/80">
                High
              </span>
              <button
                onClick={() => onTabChange?.('tests')}
                className="px-3 py-1 bg-white hover:bg-gray-50 border border-gray-300 text-indigo-700 text-[10px] font-bold rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer"
              >
                <span>Generate Tests</span>
                <span>›</span>
              </button>
            </div>
          </div>

          {/* Issue 3: Performance */}
          <div className="p-2.5 bg-white border border-gray-200/90 rounded-xl shadow-2xs hover:border-gray-300 transition flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                !
              </span>
              <div className="min-w-0">
                <p className="font-bold text-[11px] text-gray-900 truncate">
                  Performance regression
                </p>
                <p className="text-[10px] text-gray-500 truncate">
                  Event delegation may cause unnecessary re-renders.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                Medium
              </span>
              <button
                onClick={() => setExpandedIssueIds(p => ({ ...p, 'perf-1': !p['perf-1'] }))}
                className="px-3 py-1 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-[10px] font-bold rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer"
              >
                <span>Explain</span>
                <span>›</span>
              </button>
            </div>
          </div>

          {/* Expanded explanation for issue 3 if clicked */}
          {expandedIssueIds['perf-1'] && (
            <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl text-[10.5px] text-amber-900 space-y-1">
              <p className="font-semibold">Performance Impact:</p>
              <p>Re-binding event listeners on every state update in index.js causes unnecessary layout reflows and memory overhead.</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions (4-Card Grid) */}
      <div className="space-y-1.5">
        <span className="font-bold text-gray-900 text-xs">Quick Actions</span>
        <div className="grid grid-cols-4 gap-2">
          {/* Action 1: Fix Issues */}
          <button
            onClick={() => setShowBatchModal(true)}
            className="p-2 bg-gradient-to-br from-purple-50/80 to-white hover:from-purple-100/70 border border-purple-150 rounded-xl text-left shadow-2xs transition group cursor-pointer flex flex-col justify-between h-[64px]"
          >
            <div className="flex items-center justify-between text-purple-600">
              <span className="text-base">🏃</span>
              <span className="text-gray-400 group-hover:text-purple-600 transition text-xs">›</span>
            </div>
            <div>
              <p className="font-bold text-[10.5px] text-gray-900 leading-tight">Fix Issues</p>
              <p className="text-[9px] text-gray-500 truncate">Get AI suggestions</p>
            </div>
          </button>

          {/* Action 2: Generate Tests */}
          <button
            onClick={() => onTabChange?.('tests')}
            className="p-2 bg-gradient-to-br from-teal-50/80 to-white hover:from-teal-100/70 border border-teal-150 rounded-xl text-left shadow-2xs transition group cursor-pointer flex flex-col justify-between h-[64px]"
          >
            <div className="flex items-center justify-between text-teal-600">
              <span className="text-base">🧪</span>
              <span className="text-gray-400 group-hover:text-teal-600 transition text-xs">›</span>
            </div>
            <div>
              <p className="font-bold text-[10.5px] text-gray-900 leading-tight">Generate Tests</p>
              <p className="text-[9px] text-gray-500 truncate">Create missing tests</p>
            </div>
          </button>

          {/* Action 3: Re-analyze */}
          <button
            onClick={onRunCheck}
            disabled={loading}
            className="p-2 bg-gradient-to-br from-blue-50/80 to-white hover:from-blue-100/70 border border-blue-150 rounded-xl text-left shadow-2xs transition group cursor-pointer flex flex-col justify-between h-[64px]"
          >
            <div className="flex items-center justify-between text-blue-600">
              <span className="text-base">🔄</span>
              <span className="text-gray-400 group-hover:text-blue-600 transition text-xs">›</span>
            </div>
            <div>
              <p className="font-bold text-[10.5px] text-gray-900 leading-tight">Re-analyze</p>
              <p className="text-[9px] text-gray-500 truncate">Check improvements</p>
            </div>
          </button>

          {/* Action 4: View Diff */}
          <button
            onClick={() => onTabChange?.('diff')}
            className="p-2 bg-gradient-to-br from-slate-50 to-white hover:from-slate-100 border border-gray-200 rounded-xl text-left shadow-2xs transition group cursor-pointer flex flex-col justify-between h-[64px]"
          >
            <div className="flex items-center justify-between text-gray-700">
              <span className="text-base">{'</>'}</span>
              <span className="text-gray-400 group-hover:text-gray-900 transition text-xs">›</span>
            </div>
            <div>
              <p className="font-bold text-[10.5px] text-gray-900 leading-tight">View Diff</p>
              <p className="text-[9px] text-gray-500 truncate">See all changes</p>
            </div>
          </button>
        </div>
      </div>

      {/* AI Summary */}
      <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">✨</span>
            <span className="font-bold text-gray-900 text-xs">AI Summary</span>
          </div>
          <button
            onClick={() => setSummaryExpanded(!summaryExpanded)}
            className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-0.5 cursor-pointer"
          >
            <span>{summaryExpanded ? 'Show less' : 'Read more'}</span>
            <span>→</span>
          </button>
        </div>
        <p className={`text-[11px] text-gray-600 leading-relaxed ${summaryExpanded ? '' : 'line-clamp-2'}`}>
          {reviewResult?.summary || 'Adds a localStorage persistence layer for recent and bookmarked projects, introduces event-delegation changes, caps recent-project queue at 4 items,...'}
        </p>
      </div>

      {/* Full-width Apply All Fixes Action Button */}
      <button
        onClick={() => setShowBatchModal(true)}
        className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition transform hover:scale-[1.01] flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span>✨</span>
          <span>Apply All Fixes ({fixableIssues.length > 0 ? fixableIssues.length : 2})</span>
        </div>
        <span className="text-xs">›</span>
      </button>

      {/* Batch Fix Modal */}
      {showBatchModal && (
        <BatchFixModal
          issues={fixableIssues.length > 0 ? fixableIssues : (allIssues.length > 0 ? allIssues : [
            { id: '1', title: 'Error handling not fully verified', file: 'index.js', severity: 'critical' },
            { id: '2', title: 'Missing tests for persistence layer', file: 'index.js', severity: 'high' }
          ])}
          prDetails={prDetails}
          onClose={() => setShowBatchModal(false)}
          onBatchApplied={(appliedIds) => {
            appliedIds.forEach(id => updateFixStatus(id))
            setShowBatchModal(false)
          }}
          onOpenApiKeyModal={onOpenApiKeyModal}
        />
      )}

      {/* Single Fix Confirmation Modal */}
      {activeFix && (
        <FixConfirmation
          issue={activeFix}
          prDetails={prDetails}
          onClose={() => setActiveFix(null)}
          onApplied={(id) => {
            updateFixStatus(id)
            setActiveFix(null)
          }}
          onOpenApiKeyModal={onOpenApiKeyModal}
        />
      )}
    </div>
  )
}
