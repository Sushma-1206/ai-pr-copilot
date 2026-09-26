import { useState } from 'react'
import { applyFixesAndCommit } from '../lib/githubService'

export default function BatchFixModal({
  issues,
  prDetails,
  onClose,
  onBatchApplied,
  onOpenApiKeyModal
}) {
  const [selectedIds, setSelectedIds] = useState(() => new Set(issues.map(i => i.id)))
  const [status, setStatus] = useState('review') // review | committing | done | error
  const [progressMsg, setProgressMsg] = useState('')
  const [commitResult, setCommitResult] = useState(null)
  const [error, setError] = useState(null)
  const [expandedDiffs, setExpandedDiffs] = useState({})

  const selectedIssues = issues.filter(i => selectedIds.has(i.id))

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selectedIds.size === issues.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(issues.map(i => i.id)))
    }
  }

  async function handleBatchApply() {
    if (!selectedIssues.length || !prDetails) return
    setStatus('committing')
    setError(null)
    setProgressMsg('Preparing batch suggestions...')

    try {
      // Map selected issues to code fixes
      const codeFixes = selectedIssues.map(issue => ({
        file: issue.file,
        issueTitle: issue.title,
        originalCode: issue.originalCode || '',
        fixedCode: issue.suggestedFix || issue.fixedCode || `// AI Fix: ${issue.title}`,
        description: issue.explanation || issue.title
      }))

      const res = await applyFixesAndCommit({
        repoIdentifier: prDetails.repoIdentifier,
        prNumber: prDetails.prNumber,
        codeFixes,
        commitMessage: `fix(copilot): batch apply ${codeFixes.length} accepted AI suggestions`,
        onProgress: (msg) => setProgressMsg(msg)
      })

      setCommitResult(res)
      setStatus('done')
      const appliedArray = selectedIssues.map(i => i.id)
      onBatchApplied?.(appliedArray)
    } catch (err) {
      if (err.message === 'GITHUB_TOKEN_MISSING') {
        setError('GitHub token required. Please configure your token in Settings (🔑).')
      } else {
        setError(err.message || 'Batch commit failed.')
      }
      setStatus('error')
    }
  }

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-end justify-end p-4 pointer-events-none">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[580px]">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">⚡</span>
            <div>
              <h3 className="font-bold text-xs tracking-tight">Batch Accept Suggestions</h3>
              <p className="text-[10px] text-indigo-200">Apply multiple Copilot fixes in a single coordinated action</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-indigo-300 hover:text-white hover:bg-white/10 text-xs transition cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-3.5 space-y-3 overflow-y-auto flex-1 text-xs text-gray-800">
          {status === 'review' && (
            <>
              {/* Pitch & Selector Bar */}
              <div className="flex items-center justify-between p-2 bg-indigo-50/70 border border-indigo-100 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-indigo-950">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === issues.length && issues.length > 0}
                    onChange={toggleAll}
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer w-3.5 h-3.5"
                  />
                  <span>Select All ({selectedIds.size}/{issues.length})</span>
                </label>
                <span className="text-[10px] font-medium text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-100 shadow-2xs">
                  {selectedIssues.length} suggestions ready
                </span>
              </div>

              {/* Suggestions List */}
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-0.5">
                {issues.map((issue, idx) => {
                  const isChecked = selectedIds.has(issue.id)
                  const isDiffExpanded = expandedDiffs[issue.id]
                  return (
                    <div
                      key={issue.id || idx}
                      className={`border rounded-xl p-2.5 transition shadow-2xs ${
                        isChecked ? 'border-indigo-200 bg-white' : 'border-gray-200 bg-gray-50/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(issue.id)}
                          className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer w-3.5 h-3.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-bold uppercase ${
                              issue.severity === 'critical' ? 'bg-red-100 text-red-700' :
                              issue.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {issue.severity || 'issue'}
                            </span>
                            <span className="font-semibold text-gray-900 text-[11px] truncate">
                              {issue.title}
                            </span>
                          </div>
                          {issue.file && (
                            <p className="text-[10px] font-mono text-gray-500 mt-0.5 truncate">
                              {issue.file}
                            </p>
                          )}

                          {/* Quick Diff Toggle */}
                          {issue.suggestedFix && (
                            <div className="mt-1.5">
                              <button
                                onClick={() => setExpandedDiffs(prev => ({ ...prev, [issue.id]: !prev[issue.id] }))}
                                className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1 cursor-pointer"
                              >
                                <span>{isDiffExpanded ? 'Hide suggestion' : 'View suggestion diff'}</span>
                                <span>{isDiffExpanded ? '▴' : '▾'}</span>
                              </button>
                              {isDiffExpanded && (
                                <pre className="mt-1 p-2 bg-gray-900 text-emerald-300 font-mono text-[9.5px] rounded-lg overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                                  {issue.suggestedFix}
                                </pre>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Committing State */}
          {status === 'committing' && (
            <div className="py-12 text-center space-y-3">
              <span className="animate-spin text-3xl inline-block">🌀</span>
              <p className="font-bold text-gray-900 text-xs">Applying Batch Suggestions</p>
              <p className="text-[11px] text-gray-500">{progressMsg || 'Updating target branch...'}</p>
            </div>
          )}

          {/* Done State */}
          {status === 'done' && (
            <div className="space-y-3 py-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-xl font-bold shadow-2xs">
                ✓
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Batch Suggestions Accepted!</h4>
                <p className="text-[11px] text-gray-600 mt-1">
                  Successfully committed {commitResult?.committedFiles?.length || selectedIssues.length} fix(es) to branch <span className="font-mono font-semibold text-indigo-600">{commitResult?.branch}</span>.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl text-xs transition cursor-pointer shadow-sm"
              >
                Done
              </button>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="space-y-3 py-2">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-1">
                <p className="font-bold text-xs flex items-center gap-1.5">
                  <span>❌</span> Batch Commit Failed
                </p>
                <p className="text-[11px]">{error}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-1.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBatchApply}
                  className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {status === 'review' && (
          <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 border border-gray-300 text-gray-700 hover:bg-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleBatchApply}
              disabled={selectedIssues.length === 0}
              className="flex-1 py-2 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-700 hover:to-purple-800 disabled:opacity-40 text-white font-bold rounded-xl text-xs shadow-sm hover:shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>🚀 Accept & Commit All ({selectedIssues.length})</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
