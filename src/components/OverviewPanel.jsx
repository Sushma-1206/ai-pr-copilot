import { useState } from 'react'
import ReadinessScore from './ReadinessScore'
import IssueCard from './IssueCard'
import FixConfirmation from './FixConfirmation'
import { applyFixesAndCommit } from '../lib/githubService'

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
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeFix, setActiveFix] = useState(null)
  const [internalFixStatuses, setInternalFixStatuses] = useState({})
  const [copied, setCopied] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [commitError, setCommitError] = useState(null)
  const [commitSuccess, setCommitSuccess] = useState(null)

  const fixStatuses = externalFixStatuses || internalFixStatuses
  const updateFixStatus = (id) => {
    if (onFixStatusChange) {
      onFixStatusChange(id)
    } else {
      setInternalFixStatuses(prev => ({ ...prev, [id]: 'applied' }))
    }
  }

  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const [expandedFiles, setExpandedFiles] = useState({})
  const [showAllFiles, setShowAllFiles] = useState(false)

  const score = reviewResult?.readinessScore ?? null
  const prevScore = previousResult?.readinessScore ?? null

  const allIssues = reviewResult?.issues || []
  const criticalCount = allIssues.filter(i => i.severity?.toLowerCase() === 'critical').length
  const highCount = allIssues.filter(i => i.severity?.toLowerCase() === 'high').length
  const mediumCount = allIssues.filter(i => i.severity?.toLowerCase() === 'medium').length
  const lowCount = allIssues.filter(i => i.severity?.toLowerCase() === 'low').length
  const passedCount = Math.max(0, (prDetails?.filesCount || 0) - criticalCount - highCount)

  function parseChecklistItem(item) {
    const clean = item.replace(/^[-*•\s]*(?:\[[ xX]\]|[✓✔△❌⚠️])?\s*/, '').trim()
    const isPass = /^(?:\[[xX]\]|[✓✔])/.test(item) || /pass|ok|good|clean|present|covered/i.test(item)
    const isCrit = /critical|security|fatal|syntax error/i.test(item)
    return {
      text: clean,
      status: isCrit ? 'critical' : isPass ? 'pass' : 'warn'
    }
  }

  const filteredIssues = allIssues
    .filter(issue => {
      if (activeFilter === 'all') return true
      if (activeFilter === 'critical') return issue.severity?.toLowerCase() === 'critical'
      if (activeFilter === 'high') return ['critical', 'high'].includes(issue.severity?.toLowerCase())
      if (activeFilter === 'security') return issue.category === 'Security'
      if (activeFilter === 'tests') return issue.category === 'Testing'
      if (activeFilter === 'resolved') return fixStatuses[issue.id] === 'applied'
      return true
    })
    .sort((a, b) => (SEVERITY_ORDER[a.severity?.toLowerCase()] ?? 99) - (SEVERITY_ORDER[b.severity?.toLowerCase()] ?? 99))

  function handleCopyPrDescription() {
    const desc = reviewResult?.suggestedPrDescription
    if (desc) {
      navigator.clipboard.writeText(desc)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleCommitAllFixes() {
    const fixableIssues = allIssues.filter(i => i.file && fixStatuses[i.id] !== 'applied')
    if (!fixableIssues.length || !prDetails) return
    setCommitting(true)
    setCommitError(null)
    setCommitSuccess(null)
    try {
      // Only commit issues that have a suggestedFix
      const fixes = fixableIssues
        .filter(i => i.suggestedFix)
        .map(i => ({
          file: i.file,
          issueTitle: i.title,
          originalCode: '',
          fixedCode: i.suggestedFix,
          description: i.explanation
        }))

      if (!fixes.length) {
        setCommitError('No fixes available to commit. Use "Fix This" on individual issues to generate precise fixes.')
        setCommitting(false)
        return
      }

      const res = await applyFixesAndCommit({
        repoIdentifier: prDetails.repoIdentifier,
        prNumber: prDetails.prNumber,
        codeFixes: fixes,
        commitMessage: 'fix: apply AI-suggested fixes'
      })
      setCommitSuccess(`${res.committedFiles.length} fix(es) committed to '${res.branch}'`)
      const newStatuses = { ...fixStatuses }
      fixableIssues.forEach(i => {
        newStatuses[i.id] = 'applied'
        updateFixStatus(i.id)
      })
      setInternalFixStatuses(newStatuses)
    } catch (err) {
      if (err.message === 'GITHUB_TOKEN_MISSING') {
        setCommitError('GitHub token required. Configure in ⚙️ Settings.')
      } else {
        setCommitError(err.message || 'Failed to commit fixes.')
      }
    } finally {
      setCommitting(false)
    }
  }

  return (
    <div className="space-y-3 text-xs text-gray-800">
      {/* Run / Re-analyze Button */}
      <div className="flex items-center justify-between bg-gradient-to-r from-indigo-50/90 via-purple-50/50 to-blue-50/90 border border-indigo-100 p-2.5 rounded-xl shadow-2xs">
        <div>
          <h3 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
            <span className="text-sm">🚀</span> Pre-Flight Check
          </h3>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {prDetails?.filesCount ? `${prDetails.filesCount} file(s) changed` : 'Reading PR...'}
          </p>
        </div>
        <button
          onClick={onRunCheck}
          disabled={loading}
          className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
        >
          {loading ? (
            <><span className="animate-spin text-xs">🌀</span><span>Analyzing...</span></>
          ) : (
            <><span>⚡</span><span>{reviewResult ? 'Re-analyze' : 'Analyze PR'}</span></>
          )}
        </button>
      </div>

      {/* Errors */}
      {error === 'API_KEY_MISSING' && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 space-y-2">
          <p className="font-semibold">⚠️ Groq API Key Required</p>
          <p className="text-[11px]">Enter your Groq API key to enable AI-powered analysis.</p>
          <button
            onClick={onOpenApiKeyModal}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded text-[11px] transition"
          >
            Configure API Key
          </button>
        </div>
      )}
      {error && error !== 'API_KEY_MISSING' && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700">
          ❌ {error}
        </div>
      )}

      {/* Loading shimmer */}
      {loading && (
        <div className="space-y-3 animate-pulse">
          <div className="h-16 bg-gray-100 rounded-xl" />
          <div className="h-12 bg-gray-100 rounded-xl" />
          <div className="h-20 bg-gray-100 rounded-xl" />
        </div>
      )}

      {/* Results */}
      {!loading && reviewResult && (
        <div className="space-y-3">
          {/* Readiness Score */}
          <div className="p-3 bg-white border border-gray-200/90 rounded-xl shadow-2xs">
            <ReadinessScore score={score} riskLevel={reviewResult.riskLevel} />

            {/* Before/After comparison */}
            {previousResult && prevScore !== null && (
              <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between">
                <div className="text-center">
                  <p className="text-[9px] text-gray-400 uppercase font-semibold">Before</p>
                  <p className="text-xs font-bold text-gray-500">{prevScore}%</p>
                </div>
                <div className="text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    score > prevScore ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : score < prevScore ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {score > prevScore ? `↑ +${score - prevScore}%` : score < prevScore ? `↓ ${score - prevScore}%` : '→ Unchanged'}
                  </span>
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-gray-400 uppercase font-semibold">After</p>
                  <p className="text-xs font-bold text-indigo-600">{score}%</p>
                </div>
              </div>
            )}
          </div>

          {/* Issue count summary cards */}
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: 'Critical', count: criticalCount, color: 'text-red-700 bg-red-50/80 border-red-200/80', dot: 'bg-red-500' },
              { label: 'High', count: highCount, color: 'text-orange-700 bg-orange-50/80 border-orange-200/80', dot: 'bg-orange-500' },
              { label: 'Medium', count: mediumCount, color: 'text-amber-700 bg-amber-50/80 border-amber-200/80', dot: 'bg-amber-500' },
              { label: 'Passed', count: passedCount, color: 'text-emerald-700 bg-emerald-50/80 border-emerald-200/80', dot: 'bg-emerald-500' }
            ].map(item => (
              <div key={item.label} className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-center ${item.color} shadow-2xs`}>
                <div className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
                  <span className="text-sm font-black leading-none">{item.count}</span>
                </div>
                <span className="text-[8.5px] font-bold uppercase tracking-wider mt-1 opacity-80">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Health Checklist Pills */}
          {reviewResult.checklist?.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Health Checks</span>
                <span className="text-[10px] text-gray-400 font-mono">{reviewResult.checklist.length} checks</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {reviewResult.checklist.map((item, i) => {
                  const parsed = parseChecklistItem(item)
                  const badgeStyle = parsed.status === 'pass'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                    : parsed.status === 'critical'
                    ? 'bg-rose-50 text-rose-700 border-rose-200/80'
                    : 'bg-amber-50 text-amber-700 border-amber-200/80'
                  const icon = parsed.status === 'pass' ? '✓' : parsed.status === 'critical' ? '✕' : '!'

                  return (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium border ${badgeStyle} shadow-2xs transition hover:brightness-95`}
                    >
                      <span className="text-[10px] font-bold opacity-75">{icon}</span>
                      <span>{parsed.text}</span>
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* Collapsible AI Summary */}
          {reviewResult.summary && (
            <div className="p-2.5 bg-gradient-to-br from-indigo-50/40 via-purple-50/20 to-white border border-indigo-100/70 rounded-xl shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">✨</span>
                  <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">AI Summary</span>
                </div>
                <button
                  onClick={() => setSummaryExpanded(!summaryExpanded)}
                  className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-0.5 cursor-pointer"
                >
                  <span>{summaryExpanded ? 'Show less' : 'Read more'}</span>
                  <span>{summaryExpanded ? '▴' : '▾'}</span>
                </button>
              </div>
              <div className="mt-1">
                <p className={`text-[11px] text-gray-700 leading-relaxed ${summaryExpanded ? '' : 'line-clamp-2'}`}>
                  {reviewResult.summary}
                </p>
              </div>
            </div>
          )}

          {/* Interactive File Risk Map */}
          {reviewResult.files?.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Risk Map</span>
                <span className="text-[10px] text-gray-400 font-mono">{reviewResult.files.length} files</span>
              </div>
              <div className="space-y-1">
                {reviewResult.files.slice(0, showAllFiles ? undefined : 4).map((file, i) => {
                  const isExpanded = expandedFiles[file.path]
                  const isHigh = file.risk === 'high' || file.risk === 'critical'
                  const isMed = file.risk === 'medium'
                  const riskBadge = isHigh
                    ? { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', label: 'HIGH' }
                    : isMed
                    ? { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: 'MED' }
                    : { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'LOW' }

                  return (
                    <div
                      key={i}
                      onClick={() => file.reason && setExpandedFiles(prev => ({ ...prev, [file.path]: !prev[file.path] }))}
                      className={`p-2 bg-white hover:bg-gray-50/80 border border-gray-200 rounded-lg transition shadow-2xs ${file.reason ? 'cursor-pointer' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${riskBadge.dot}`} />
                          <span className="text-[10.5px] font-mono text-gray-800 font-medium truncate">{file.path}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${riskBadge.bg}`}>
                            {riskBadge.label}
                          </span>
                          {file.reason && (
                            <span className="text-gray-400 text-[10px] ml-0.5">
                              {isExpanded ? '▴' : '▾'}
                            </span>
                          )}
                        </div>
                      </div>
                      {isExpanded && file.reason && (
                        <p className="text-[10px] text-gray-600 mt-1.5 pt-1.5 border-t border-gray-100 leading-snug pl-3.5">
                          {file.reason}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
              {reviewResult.files.length > 4 && (
                <button
                  onClick={() => setShowAllFiles(!showAllFiles)}
                  className="w-full py-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50/50 hover:bg-indigo-50 rounded-md transition text-center cursor-pointer"
                >
                  {showAllFiles ? 'Show fewer files' : `+ Show ${reviewResult.files.length - 4} more files`}
                </button>
              )}
            </div>
          )}

          {/* Issues Section */}
          {allIssues.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-gray-600 uppercase">Issues ({allIssues.length})</p>
                <button
                  onClick={() => onTabChange?.('issues')}
                  className="text-[10px] text-indigo-600 hover:underline"
                >
                  View all →
                </button>
              </div>

              {/* Show top 3 most critical */}
              {allIssues
                .sort((a, b) => (SEVERITY_ORDER[a.severity?.toLowerCase()] ?? 99) - (SEVERITY_ORDER[b.severity?.toLowerCase()] ?? 99))
                .slice(0, 3)
                .map((issue, i) => (
                  <IssueCard
                    key={issue.id || i}
                    issue={issue}
                    fixStatus={fixStatuses[issue.id]}
                    onFixThis={(iss, mode) => setActiveFix({ ...iss, initialMode: mode })}
                  />
                ))}
            </div>
          )}

          {/* PR Description */}
          {reviewResult.suggestedPrDescription && (
            <button
              onClick={handleCopyPrDescription}
              className="w-full py-2 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copied ? '✓ Copied!' : '📋 Copy AI PR Description'}
            </button>
          )}

          {/* Security/breaking change quick alerts */}
          {reviewResult.securityFindings?.length > 0 && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-[10px] font-bold text-red-800 uppercase mb-1">
                🔒 {reviewResult.securityFindings.length} Security Finding(s)
              </p>
              {reviewResult.securityFindings.slice(0, 2).map((f, i) => (
                <p key={i} className="text-[11px] text-red-700">• {f.title}</p>
              ))}
            </div>
          )}

          {reviewResult.breakingChanges?.length > 0 && (
            <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-[10px] font-bold text-orange-800 uppercase mb-1">
                💥 {reviewResult.breakingChanges.length} Breaking Change(s)
              </p>
              {reviewResult.breakingChanges.slice(0, 2).map((bc, i) => (
                <p key={i} className="text-[11px] text-orange-700">• {typeof bc === 'string' ? bc : bc.title}</p>
              ))}
            </div>
          )}

          {/* Commit errors/success */}
          {commitSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px]">
              ✅ {commitSuccess}
            </div>
          )}
          {commitError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[11px]">
              ❌ {commitError}
            </div>
          )}
        </div>
      )}

      {/* Fix Confirmation Overlay */}
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
