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
  onTabChange
}) {
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeFix, setActiveFix] = useState(null)
  const [fixStatuses, setFixStatuses] = useState({}) // issueId -> 'applied'
  const [copied, setCopied] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [commitError, setCommitError] = useState(null)
  const [commitSuccess, setCommitSuccess] = useState(null)

  const score = reviewResult?.readinessScore ?? null
  const prevScore = previousResult?.readinessScore ?? null

  const allIssues = reviewResult?.issues || []
  const criticalCount = allIssues.filter(i => i.severity?.toLowerCase() === 'critical').length
  const highCount = allIssues.filter(i => i.severity?.toLowerCase() === 'high').length
  const mediumCount = allIssues.filter(i => i.severity?.toLowerCase() === 'medium').length
  const lowCount = allIssues.filter(i => i.severity?.toLowerCase() === 'low').length
  const passedCount = Math.max(0, (prDetails?.filesCount || 0) - criticalCount - highCount)

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
      fixableIssues.forEach(i => { newStatuses[i.id] = 'applied' })
      setFixStatuses(newStatuses)
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
      <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 p-3 rounded-lg">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
            <span>🚀</span> Developer Pre-Flight
          </h3>
          <p className="text-[11px] text-gray-600 mt-0.5">
            {prDetails?.filesCount ? `${prDetails.filesCount} file(s) changed` : 'Reading PR...'}
          </p>
        </div>
        <button
          onClick={onRunCheck}
          disabled={loading}
          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow transition flex items-center gap-1.5"
        >
          {loading ? (
            <><span className="animate-spin">🌀</span><span>Analyzing...</span></>
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
          <div className="h-16 bg-gray-100 rounded-lg" />
          <div className="h-10 bg-gray-100 rounded-lg" />
          <div className="h-24 bg-gray-100 rounded-lg" />
        </div>
      )}

      {/* Results */}
      {!loading && reviewResult && (
        <div className="space-y-3">
          {/* Readiness Score */}
          <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
            <ReadinessScore score={score} riskLevel={reviewResult.riskLevel} />

            {/* Before/After comparison */}
            {previousResult && prevScore !== null && (
              <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                <div className="text-center">
                  <p className="text-[9px] text-gray-400 uppercase">Before</p>
                  <p className="text-sm font-bold text-gray-500">{prevScore}%</p>
                </div>
                <div className="text-center">
                  <p className={`text-base font-bold ${score > prevScore ? 'text-emerald-600' : score < prevScore ? 'text-rose-600' : 'text-gray-500'}`}>
                    {score > prevScore ? `↑ +${score - prevScore}` : score < prevScore ? `↓ ${score - prevScore}` : '→ 0'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-gray-400 uppercase">After</p>
                  <p className="text-sm font-bold text-indigo-600">{score}%</p>
                </div>
              </div>
            )}
          </div>

          {/* Issue count summary */}
          <div className="grid grid-cols-4 gap-1">
            {[
              { label: 'Critical', count: criticalCount, color: 'text-red-600 bg-red-50 border-red-200' },
              { label: 'High', count: highCount, color: 'text-orange-600 bg-orange-50 border-orange-200' },
              { label: 'Medium', count: mediumCount, color: 'text-amber-600 bg-amber-50 border-amber-200' },
              { label: 'Passed', count: passedCount, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' }
            ].map(item => (
              <div key={item.label} className={`flex flex-col items-center p-1.5 rounded-lg border text-center ${item.color}`}>
                <span className="text-base font-bold">{item.count}</span>
                <span className="text-[9px] font-semibold uppercase">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Checklist */}
          {reviewResult.checklist?.length > 0 && (
            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg space-y-1">
              {reviewResult.checklist.map((item, i) => (
                <p key={i} className="text-[11px] text-gray-700">{item}</p>
              ))}
            </div>
          )}

          {/* Summary */}
          {reviewResult.summary && (
            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">AI Summary</p>
              <p className="text-[11px] text-gray-700 leading-relaxed">{reviewResult.summary}</p>
            </div>
          )}

          {/* File Risk Map */}
          {reviewResult.files?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-gray-600 uppercase">Risk Map</p>
              {reviewResult.files.map((file, i) => {
                const riskIcon = file.risk === 'high' || file.risk === 'critical' ? '🔴' : file.risk === 'medium' ? '🟠' : '🟢'
                return (
                  <div key={i} className="flex items-start gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className="text-xs mt-0.5">{riskIcon}</span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono text-indigo-700 font-medium truncate">{file.path}</p>
                      {file.reason && <p className="text-[10px] text-gray-500 mt-0.5">{file.reason}</p>}
                    </div>
                  </div>
                )
              })}
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
                    onFixThis={(iss) => setActiveFix(iss)}
                  />
                ))}
            </div>
          )}

          {/* PR Description */}
          {reviewResult.suggestedPrDescription && (
            <button
              onClick={handleCopyPrDescription}
              className="w-full py-2 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition flex items-center justify-center gap-1.5"
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
            setFixStatuses(prev => ({ ...prev, [id]: 'applied' }))
            setActiveFix(null)
          }}
          onOpenApiKeyModal={onOpenApiKeyModal}
        />
      )}
    </div>
  )
}
