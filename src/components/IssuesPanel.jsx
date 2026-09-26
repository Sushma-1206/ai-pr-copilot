import { useState } from 'react'
import IssueCard from './IssueCard'
import FixConfirmation from './FixConfirmation'
import BatchFixModal from './BatchFixModal'

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'critical', label: '🔴 Critical' },
  { key: 'high', label: '🟠 High' },
  { key: 'security', label: '🔒 Security' },
  { key: 'tests', label: '🧪 Tests' },
  { key: 'resolved', label: '✅ Resolved' }
]

export default function IssuesPanel({
  prDetails,
  reviewResult,
  onOpenApiKeyModal,
  fixStatuses: externalFixStatuses,
  onFixStatusChange
}) {
  const [filter, setFilter] = useState('all')
  const [activeFix, setActiveFix] = useState(null)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [internalFixStatuses, setInternalFixStatuses] = useState({})

  const fixStatuses = externalFixStatuses || internalFixStatuses
  const updateFixStatus = (id) => {
    if (onFixStatusChange) {
      onFixStatusChange(id)
    } else {
      setInternalFixStatuses(prev => ({ ...prev, [id]: 'applied' }))
    }
  }

  const allIssues = reviewResult?.issues || []
  const fixableIssues = allIssues.filter(i => i.file && fixStatuses[i.id] !== 'applied')
  const appliedIssues = allIssues.filter(i => fixStatuses[i.id] === 'applied')

  const FILTERS = [
    { key: 'all', label: `All (${allIssues.length})` },
    { key: 'critical', label: '🔴 Critical' },
    { key: 'high', label: '🟠 High' },
    { key: 'security', label: '🔒 Security' },
    { key: 'tests', label: '🧪 Tests' },
    { key: 'resolved', label: `✅ Resolved (${appliedIssues.length})` }
  ]

  const filtered = allIssues
    .filter(issue => {
      if (filter === 'all') return true
      if (filter === 'critical') return issue.severity?.toLowerCase() === 'critical'
      if (filter === 'high') return ['critical', 'high'].includes(issue.severity?.toLowerCase())
      if (filter === 'security') return issue.category === 'Security'
      if (filter === 'tests') return issue.category === 'Testing'
      if (filter === 'resolved') return fixStatuses[issue.id] === 'applied'
      return true
    })
    .sort((a, b) => (SEVERITY_ORDER[a.severity?.toLowerCase()] ?? 99) - (SEVERITY_ORDER[b.severity?.toLowerCase()] ?? 99))

  if (!reviewResult) {
    return (
      <div className="text-center py-12 text-gray-400 text-xs space-y-2">
        <p className="text-3xl">🔍</p>
        <p>Run an analysis to see structured issue findings.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 text-xs text-gray-800">
      {/* Fixes Applied Success Banner */}
      {appliedIssues.length > 0 && (
        <div className="flex items-center justify-between p-2.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-xl shadow-2xs">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <span className="text-lg">🎉</span>
            <div className="min-w-0">
              <p className="font-bold text-emerald-950 text-xs">
                {appliedIssues.length} of {allIssues.length} Fixes Applied & Committed!
              </p>
              <p className="text-[10.5px] text-emerald-700 truncate">
                Changes are committed to the PR branch. View under <span className="font-semibold">✅ Resolved</span>.
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilter('resolved')}
            className="px-2.5 py-1 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shrink-0 cursor-pointer shadow-2xs"
          >
            Filter Resolved →
          </button>
        </div>
      )}

      {/* Batch Accept Suggestions Banner */}
      {fixableIssues.length > 0 && (
        <div className="flex items-center justify-between p-2.5 bg-gradient-to-r from-indigo-50/90 via-purple-50/60 to-blue-50/90 border border-indigo-100 rounded-xl shadow-2xs">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5 font-bold text-gray-900 text-xs">
              <span className="text-sm">⚡</span>
              <span>Batch Accept Suggestions</span>
            </div>
            <p className="text-[10px] text-gray-600 mt-0.5 truncate">
              Accept {fixableIssues.length} Copilot suggestions together in one action instead of reviewing individually.
            </p>
          </div>
          <button
            onClick={() => setShowBatchModal(true)}
            className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-bold text-xs rounded-lg shadow-sm hover:shadow transition shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <span>⚡ Accept All ({fixableIssues.length})</span>
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition cursor-pointer ${
              filter === f.key
                ? 'bg-indigo-600 border-indigo-600 text-white font-semibold'
                : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-400'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Count */}
      <div className="flex items-center justify-between text-[10px] text-gray-400">
        <span>Showing {filtered.length} of {allIssues.length} issues</span>
        {fixableIssues.length > 0 && (
          <span className="text-indigo-600 font-semibold">{fixableIssues.length} fixable issues remaining</span>
        )}
      </div>

      {/* Issue List */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-xs">
          {filter === 'resolved' ? '✅ No resolved issues yet.' : 'No issues match this filter.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((issue, i) => (
            <IssueCard
              key={issue.id || i}
              issue={issue}
              fixStatus={fixStatuses[issue.id]}
              onFixThis={(iss) => setActiveFix(iss)}
            />
          ))}
        </div>
      )}

      {/* Breaking Changes Section */}
      {reviewResult.breakingChanges?.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-orange-700 uppercase">💥 Breaking Changes</p>
          {reviewResult.breakingChanges.map((bc, i) => {
            const change = typeof bc === 'string' ? { title: bc, impact: '' } : bc
            return (
              <div key={i} className="border border-orange-200 bg-orange-50 rounded-lg p-2.5 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${
                    change.confirmed ? 'bg-red-600 text-white' : 'bg-orange-400 text-white'
                  }`}>
                    {change.confirmed ? 'Confirmed' : 'Potential'}
                  </span>
                  <span className="text-xs font-semibold text-orange-900">{change.title}</span>
                </div>
                {change.before && (
                  <div className="font-mono text-[10px] space-y-1">
                    <div className="bg-rose-100 text-rose-800 p-1.5 rounded">Before: {change.before}</div>
                    <div className="bg-emerald-100 text-emerald-800 p-1.5 rounded">After: {change.after}</div>
                  </div>
                )}
                {change.impact && <p className="text-[11px] text-orange-800">{change.impact}</p>}
              </div>
            )
          })}
        </div>
      )}

      {/* Security Findings */}
      {reviewResult.securityFindings?.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-red-700 uppercase">🔒 Security Findings</p>
          {reviewResult.securityFindings.map((sec, i) => (
            <div key={i} className="border border-red-200 bg-red-50 rounded-lg p-2.5 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-600 text-white rounded uppercase">
                  {sec.severity}
                </span>
                <span className="text-xs font-semibold text-red-900">{sec.title}</span>
              </div>
              {sec.file && <p className="text-[10px] font-mono text-red-700">{sec.file}{sec.lineStart ? `:${sec.lineStart}` : ''}</p>}
              {sec.explanation && <p className="text-[11px] text-red-800">{sec.explanation}</p>}
              {sec.confidence && <p className="text-[10px] text-red-500">Confidence: {Math.round(sec.confidence * 100)}%</p>}
            </div>
          ))}
        </div>
      )}

      {/* Rule Violations */}
      {reviewResult.ruleViolations?.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-amber-700 uppercase">📏 Rule Violations</p>
          {reviewResult.ruleViolations.map((rv, i) => (
            <div key={i} className="border border-amber-200 bg-amber-50 rounded-lg p-2.5 space-y-1">
              <p className="text-[10px] font-semibold text-amber-900">Rule: "{rv.rule}"</p>
              <p className="text-[11px] text-amber-800">{rv.violation}</p>
            </div>
          ))}
        </div>
      )}

      {/* Fix Overlay */}
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
    </div>
  )
}
