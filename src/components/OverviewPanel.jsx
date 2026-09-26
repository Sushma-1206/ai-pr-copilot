import { useState } from 'react'
import ReadinessScore from './ReadinessScore'
import FixConfirmation from './FixConfirmation'
import BatchFixModal from './BatchFixModal'

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

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
  const [expandedIssues, setExpandedIssues] = useState({})

  const fixStatuses = externalFixStatuses || internalFixStatuses
  const updateFixStatus = (id) => {
    if (onFixStatusChange) {
      onFixStatusChange(id)
    } else {
      setInternalFixStatuses(prev => ({ ...prev, [id]: 'applied' }))
    }
  }

  const score = reviewResult?.readinessScore ?? null
  const prevScore = previousResult?.readinessScore ?? null

  const allIssues = reviewResult?.issues || []
  const criticalCount = allIssues.filter(i => i.severity?.toLowerCase() === 'critical').length
  const highCount = allIssues.filter(i => i.severity?.toLowerCase() === 'high').length
  const mediumCount = allIssues.filter(i => i.severity?.toLowerCase() === 'medium').length
  const passedCount = Math.max(0, (prDetails?.filesCount || 1) - (criticalCount + highCount > 0 ? 1 : 0))

  const fixableIssues = allIssues.filter(i => i.file && fixStatuses[i.id] !== 'applied')

  function parseChecklistItem(item) {
    const clean = item.replace(/^[-*•\s]*(?:\[[ xX]\]|[✓✔△❌⚠️])?\s*/, '').trim()
    const isPass = /^(?:\[[xX]\]|[✓✔])/.test(item) || /pass|ok|good|clean|present|covered|completed/i.test(item)
    const isCrit = /critical|security|fatal|syntax error/i.test(item)
    const isHigh = /missing test|untested|leak|regression/i.test(item)
    return {
      text: clean,
      status: isCrit ? 'critical' : isHigh ? 'high' : isPass ? 'pass' : 'warn'
    }
  }

  // Files with risk
  const filesList = reviewResult?.files?.length > 0
    ? reviewResult.files
    : [{ path: prDetails?.files?.[0]?.filename || 'index.js', risk: 'high', reason: 'Contains core PR modifications.' }]

  return (
    <div className="space-y-3 text-xs text-gray-800">
      {/* Pre-Flight Check Header & Action */}
      <div className="flex items-center justify-between p-2.5 bg-gradient-to-r from-slate-50 to-indigo-50/50 border border-slate-200 rounded-xl shadow-2xs">
        <div>
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
            <span>🚀</span> Pre-Flight Check
          </h3>
          <p className="text-[10.5px] text-gray-500 mt-0.5">
            Analyze your PR and fix potential issues before requesting review.
          </p>
        </div>

        <button
          onClick={onRunCheck}
          disabled={loading}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          {loading ? (
            <>
              <span className="animate-spin text-xs">🌀</span>
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <span>🔄</span>
              <span>{reviewResult ? 'Re-analyze' : 'Analyze PR'}</span>
            </>
          )}
        </button>
      </div>

      {/* Errors */}
      {error === 'API_KEY_MISSING' && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 space-y-2">
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
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
          ❌ {error}
        </div>
      )}

      {/* Loading shimmer */}
      {loading && (
        <div className="space-y-2.5 animate-pulse">
          <div className="h-20 bg-gray-100 rounded-xl" />
          <div className="h-16 bg-gray-100 rounded-xl" />
          <div className="h-24 bg-gray-100 rounded-xl" />
        </div>
      )}

      {/* Analysis Results */}
      {!loading && reviewResult && (
        <div className="space-y-3">
          {/* PR Readiness Card */}
          <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs">
            <ReadinessScore
              score={score}
              riskLevel={reviewResult.riskLevel}
              counts={{
                critical: criticalCount,
                high: highCount,
                medium: mediumCount,
                passed: passedCount
              }}
            />

            {/* Before/After comparison if score changed */}
            {previousResult && prevScore !== null && prevScore !== score && (
              <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between">
                <div className="text-center">
                  <p className="text-[9px] text-gray-400 uppercase font-semibold">Before</p>
                  <p className="text-xs font-bold text-gray-500">{prevScore}%</p>
                </div>
                <div className="text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    score > prevScore
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {score > prevScore ? `↑ +${score - prevScore}%` : `↓ ${score - prevScore}%`}
                  </span>
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-gray-400 uppercase font-semibold">After</p>
                  <p className="text-xs font-bold text-indigo-600">{score}%</p>
                </div>
              </div>
            )}
          </div>

          {/* Health Checks Card */}
          {reviewResult.checklist?.length > 0 && (
            <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900 text-xs">Health Checks</span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {reviewResult.checklist.length} checks
                </span>
              </div>

              <div className="space-y-1.5">
                {reviewResult.checklist.map((item, i) => {
                  const parsed = parseChecklistItem(item)
                  const isCrit = parsed.status === 'critical'
                  const isHigh = parsed.status === 'high'
                  const isPass = parsed.status === 'pass'
                  
                  const pillStyle = isCrit
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : isHigh
                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                    : isPass
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'

                  const dotColor = isCrit ? 'bg-rose-500' : isHigh ? 'bg-orange-500' : isPass ? 'bg-emerald-500' : 'bg-amber-500'

                  return (
                    <div
                      key={i}
                      className="p-1.5 bg-gray-50/70 border border-gray-150 rounded-lg flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                        <span className="text-[11px] text-gray-800 truncate">{parsed.text}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold border uppercase shrink-0 ${pillStyle}`}>
                        {isCrit ? 'Critical' : isHigh ? 'High' : isPass ? 'Passed' : 'Medium'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* AI Summary Card */}
          {reviewResult.summary && (
            <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">✨</span>
                  <span className="font-bold text-gray-900 text-xs">AI Summary</span>
                </div>
                <button
                  onClick={() => setSummaryExpanded(!summaryExpanded)}
                  className="text-[10.5px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                >
                  <span>{summaryExpanded ? 'Show less' : 'Read more'}</span>
                  <span>{summaryExpanded ? '▴' : '▾'}</span>
                </button>
              </div>

              <p className={`text-[11px] text-gray-700 leading-relaxed ${summaryExpanded ? '' : 'line-clamp-2'}`}>
                {reviewResult.summary}
              </p>
            </div>
          )}

          {/* Risk Map Card */}
          <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900 text-xs">Risk Map</span>
              <span className="text-[10px] text-gray-400 font-mono">
                {filesList.length} file{filesList.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-1">
              {filesList.map((file, i) => {
                const isHigh = file.risk === 'high' || file.risk === 'critical'
                const isMed = file.risk === 'medium'
                const pillColor = isHigh
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : isMed
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                const dotColor = isHigh ? 'bg-rose-500' : isMed ? 'bg-amber-500' : 'bg-emerald-500'

                return (
                  <div
                    key={i}
                    onClick={() => onTabChange?.('diff')}
                    className="p-2 bg-gray-50/70 hover:bg-gray-100/70 border border-gray-200/80 rounded-lg flex items-center justify-between gap-2 transition cursor-pointer"
                    title="Click to preview diff"
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                      <span className="font-mono text-[11px] font-semibold text-gray-800 truncate">
                        {file.path}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase ${pillColor}`}>
                        {file.risk?.toUpperCase() || 'HIGH'}
                      </span>
                      <span className="text-gray-400 text-xs">›</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Issues & Fixes Card */}
          {allIssues.length > 0 && (
            <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900 text-xs">Issues & Fixes</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-400 font-mono">{allIssues.length} issues</span>
                  <button
                    onClick={() => onTabChange?.('issues')}
                    className="text-[10.5px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer ml-1"
                  >
                    View All →
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {allIssues.slice(0, 3).map((issue, idx) => {
                  const isCrit = issue.severity?.toLowerCase() === 'critical'
                  const isHigh = issue.severity?.toLowerCase() === 'high'
                  const dotColor = isCrit ? 'bg-rose-500' : isHigh ? 'bg-orange-500' : 'bg-amber-500'
                  const isApplied = fixStatuses[issue.id] === 'applied'
                  const isTesting = issue.category === 'Testing' || /test/i.test(issue.title)
                  const isExpanded = expandedIssues[issue.id || idx]

                  return (
                    <div
                      key={issue.id || idx}
                      className="p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl space-y-2 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                            <p className="font-bold text-[11px] text-gray-900 truncate">
                              {issue.title} {issue.file ? `in ${issue.file.split('/').pop()}` : ''}
                            </p>
                          </div>
                          {issue.explanation && (
                            <p className="text-[10px] text-gray-600 pl-3 mt-0.5 line-clamp-1">
                              {issue.explanation}
                            </p>
                          )}
                        </div>

                        {isApplied && (
                          <span className="px-2 py-0.5 text-[9.5px] font-bold bg-emerald-100 text-emerald-800 rounded-full shrink-0 border border-emerald-300">
                            ✓ FIX APPLIED
                          </span>
                        )}
                      </div>

                      {/* Expanded explanation */}
                      {isExpanded && (
                        <div className="p-2 bg-white rounded-lg border border-gray-200 text-[10.5px] text-gray-700 space-y-1">
                          <p className="font-semibold text-gray-900">Why this matters:</p>
                          <p>{issue.impact || issue.explanation || 'No extra explanation provided.'}</p>
                          {issue.suggestedFix && (
                            <pre className="p-1.5 bg-gray-900 text-emerald-300 rounded font-mono text-[9.5px] overflow-x-auto whitespace-pre">
                              {issue.suggestedFix}
                            </pre>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      {!isApplied && (
                        <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-gray-200/60">
                          {isTesting ? (
                            <button
                              onClick={() => onTabChange?.('tests')}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg shadow-2xs transition cursor-pointer"
                            >
                              🧪 Generate Tests
                            </button>
                          ) : (
                            <button
                              onClick={() => setActiveFix({ ...issue, initialMode: 'local' })}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg shadow-2xs transition cursor-pointer"
                            >
                              🔧 Fix This
                            </button>
                          )}
                          <button
                            onClick={() => setExpandedIssues(prev => ({ ...prev, [issue.id || idx]: !prev[issue.id || idx] }))}
                            className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 text-[10px] font-semibold rounded-lg transition cursor-pointer"
                          >
                            {isExpanded ? 'Hide' : 'Explain'}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Full-width Apply All Fixes Action Button */}
          {fixableIssues.length > 0 && (
            <button
              onClick={() => setShowBatchModal(true)}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition transform hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>✨</span>
              <span>Apply All Fixes ({fixableIssues.length})</span>
            </button>
          )}
        </div>
      )}

      {/* Batch Fix Modal */}
      {showBatchModal && (
        <BatchFixModal
          issues={fixableIssues}
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
