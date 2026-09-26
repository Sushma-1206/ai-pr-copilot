import { useState, useMemo } from 'react'
import { postBatchReview, getGitHubToken } from '../lib/githubService'

export default function ReviewerOverviewPanel({
  prDetails,
  reviewResult,
  loading,
  error,
  onRunCheck,
  onOpenApiKeyModal,
  onTabChange,
  onAskPrompt
}) {
  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const [reviewAction, setReviewAction] = useState(null) // 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewSuccess, setReviewSuccess] = useState(null)
  const [reviewError, setReviewError] = useState(null)

  // Compute line diff stats
  const diffStats = useMemo(() => {
    const raw = prDetails?.rawDiff || ''
    let additions = 0
    let deletions = 0
    if (raw) {
      const lines = raw.split('\n')
      for (const line of lines) {
        if (line.startsWith('+') && !line.startsWith('+++')) additions++
        else if (line.startsWith('-') && !line.startsWith('---')) deletions++
      }
    }
    return { additions, deletions }
  }, [prDetails?.rawDiff])

  const allIssues = reviewResult?.issues || []
  const criticalCount = allIssues.filter(i => i.severity?.toLowerCase() === 'critical').length
  const highCount = allIssues.filter(i => i.severity?.toLowerCase() === 'high').length
  const mediumCount = allIssues.filter(i => i.severity?.toLowerCase() === 'medium').length

  const riskLevel = (reviewResult?.riskLevel || (criticalCount > 0 ? 'high' : highCount > 0 ? 'medium' : 'low')).toUpperCase()
  const riskBadgeStyle =
    riskLevel === 'HIGH' || riskLevel === 'CRITICAL'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : riskLevel === 'MEDIUM'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200'

  // 4 Assessment tiles status
  const securityIssues = allIssues.filter(i => i.category === 'Security' || /auth|token|secret|xss|injection/i.test(i.title))
  const testIssues = allIssues.filter(i => i.category === 'Testing' || /test|coverage|spec/i.test(i.title))
  const breakingIssues = reviewResult?.breakingChanges || []
  const perfIssues = allIssues.filter(i => i.category === 'Performance' || /performance|memory|leak|render|slow/i.test(i.title))

  // Open submit review modal
  function handleOpenReviewModal(action) {
    setReviewAction(action)
    setReviewError(null)
    setReviewSuccess(null)
    
    // Default pre-filled comment based on analysis
    const defaultComment = reviewResult?.recommendedReviewComment || 
      `### 🤖 AI PR Review Assessment\n\n**Verdict**: ${action}\n\n**Summary**: ${reviewResult?.summary || reviewResult?.overview || 'Review completed.'}\n\n${
        allIssues.length > 0 ? `**Key Issues Found**: ${allIssues.length} items flagged for attention.` : 'No critical issues identified.'
      }`
    setReviewComment(defaultComment)
  }

  async function handleSubmitReview() {
    if (!prDetails || !reviewAction) return
    const token = await getGitHubToken()
    if (!token) {
      setReviewError('GITHUB_TOKEN_MISSING')
      return
    }

    setSubmittingReview(true)
    setReviewError(null)
    try {
      await postBatchReview({
        repoIdentifier: prDetails.repoIdentifier,
        prNumber: prDetails.prNumber,
        reviewResult: {
          ...reviewResult,
          verdict: reviewAction,
          recommendedReviewComment: reviewComment
        }
      })
      setReviewSuccess(`Successfully submitted review (${reviewAction}) to PR #${prDetails.prNumber}!`)
      setTimeout(() => {
        setReviewAction(null)
        setReviewSuccess(null)
      }, 2500)
    } catch (err) {
      if (err.message === 'GITHUB_TOKEN_MISSING') {
        setReviewError('GITHUB_TOKEN_MISSING')
      } else {
        setReviewError(err.message || 'Failed to submit review.')
      }
    } finally {
      setSubmittingReview(false)
    }
  }

  return (
    <div className="space-y-3 text-xs text-gray-800">
      {/* Review Overview Header */}
      <div className="flex items-center justify-between p-2.5 bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-slate-200 rounded-xl shadow-2xs">
        <div>
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
            <span>📑</span> Review Overview
          </h3>
          <p className="text-[10.5px] text-gray-500 mt-0.5">
            Get a quick understanding of the PR and key areas to check.
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-gray-400 font-medium">AI Assessment</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${riskBadgeStyle}`}>
            {riskLevel} Risk
          </span>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-2.5 animate-pulse">
          <div className="h-16 bg-gray-100 rounded-xl" />
          <div className="h-28 bg-gray-100 rounded-xl" />
          <div className="h-24 bg-gray-100 rounded-xl" />
        </div>
      )}

      {/* Error state */}
      {error === 'API_KEY_MISSING' && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 space-y-2">
          <p className="font-semibold text-xs">⚠️ Groq API Key Required</p>
          <p className="text-[11px] text-amber-700">Add your API key to generate comprehensive review findings.</p>
          <button
            onClick={onOpenApiKeyModal}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10.5px] font-semibold cursor-pointer"
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

      {!loading && reviewResult && (
        <div className="space-y-3">
          {/* 3 Metric Stat Cards */}
          <div className="grid grid-cols-3 gap-2">
            {/* PR Risk */}
            <div className="p-2.5 bg-white border border-gray-200 rounded-xl shadow-2xs flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-gray-700">
                <span className="text-sm">⚠️</span>
                <span className="text-[10.5px] font-bold">PR Risk</span>
              </div>
              <div className="my-1">
                <span className={`text-base font-black ${riskLevel === 'HIGH' || riskLevel === 'CRITICAL' ? 'text-rose-600' : riskLevel === 'MEDIUM' ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {riskLevel}
                </span>
              </div>
              <p className="text-[9.5px] text-gray-400 leading-tight">
                Overall risk level based on detected issues.
              </p>
            </div>

            {/* Files Changed */}
            <div
              onClick={() => onTabChange?.('diff')}
              className="p-2.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-2xs flex flex-col justify-between cursor-pointer transition"
              title="Click to preview diff"
            >
              <div className="flex items-center gap-1.5 text-gray-700">
                <span className="text-sm">📄</span>
                <span className="text-[10.5px] font-bold">Files Changed</span>
              </div>
              <div className="my-1">
                <span className="text-base font-black text-gray-900">
                  {prDetails?.filesCount || 1}
                </span>
              </div>
              <p className="text-[9.5px] font-mono text-gray-500 leading-tight">
                (+{diffStats.additions} lines / -{diffStats.deletions} lines)
              </p>
            </div>

            {/* Issues Found */}
            <div
              onClick={() => onTabChange?.('findings')}
              className="p-2.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-2xs flex flex-col justify-between cursor-pointer transition"
              title="Click to view all findings"
            >
              <div className="flex items-center gap-1.5 text-gray-700">
                <span className="text-sm">🛡️</span>
                <span className="text-[10.5px] font-bold">Issues Found</span>
              </div>
              <div className="my-1">
                <span className="text-base font-black text-gray-900">
                  {allIssues.length}
                </span>
              </div>
              <p className="text-[9.5px] text-gray-400 leading-tight truncate">
                ({criticalCount} critical, {highCount} high, {mediumCount} med)
              </p>
            </div>
          </div>

          {/* PR Summary Card */}
          <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">✨</span>
                <span className="font-bold text-gray-900 text-xs">PR Summary</span>
              </div>
              <button
                onClick={() => setSummaryExpanded(!summaryExpanded)}
                className="text-[10.5px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-0.5 cursor-pointer"
              >
                <span>{summaryExpanded ? 'Show less' : 'Read full description'}</span>
                <span>{summaryExpanded ? '▴' : '▾'}</span>
              </button>
            </div>

            <p className={`text-[11px] text-gray-700 leading-relaxed ${summaryExpanded ? '' : 'line-clamp-2'}`}>
              {reviewResult.summary || reviewResult.overview || prDetails?.description || 'No summary provided.'}
            </p>

            {/* 4 Quick Assessment Tiles (2x2 Grid) */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
              {/* Security */}
              <div className="p-2 bg-gray-50/80 rounded-lg border border-gray-150">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-700 flex items-center gap-1">
                    <span>🛡️</span> Security
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1 text-[10.5px]">
                  <span className={securityIssues.length === 0 ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                    {securityIssues.length === 0 ? '🟢 No critical issues' : '⚠️ Potential issues'}
                  </span>
                  <span className="text-[9px] text-gray-400">
                    ({securityIssues.length} {securityIssues.length === 1 ? 'issue' : 'issues'})
                  </span>
                </div>
              </div>

              {/* Testing */}
              <div className="p-2 bg-gray-50/80 rounded-lg border border-gray-150">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-700 flex items-center gap-1">
                    <span>🧪</span> Testing
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1 text-[10.5px]">
                  <span className={testIssues.length === 0 ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                    {testIssues.length === 0 ? '🟢 Adequate tests' : '⚠️ Insufficient tests'}
                  </span>
                  <span className="text-[9px] text-gray-400">
                    ({testIssues.length} {testIssues.length === 1 ? 'issue' : 'issues'})
                  </span>
                </div>
              </div>

              {/* Breaking Changes */}
              <div className="p-2 bg-gray-50/80 rounded-lg border border-gray-150">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-700 flex items-center gap-1">
                    <span>⚡</span> Breaking Changes
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1 text-[10.5px]">
                  <span className={breakingIssues.length === 0 ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                    {breakingIssues.length === 0 ? '🟢 None detected' : '🔴 Detected'}
                  </span>
                  {breakingIssues.length > 0 && (
                    <span className="text-[9px] text-gray-400">
                      ({breakingIssues.length} found)
                    </span>
                  )}
                </div>
              </div>

              {/* Performance */}
              <div className="p-2 bg-gray-50/80 rounded-lg border border-gray-150">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-700 flex items-center gap-1">
                    <span>🏎️</span> Performance
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1 text-[10.5px]">
                  <span className={perfIssues.length === 0 ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                    {perfIssues.length === 0 ? '🟢 No regressions' : '⚠️ Potential regression'}
                  </span>
                  {perfIssues.length > 0 && (
                    <span className="text-[9px] text-gray-400">
                      ({perfIssues.length} issue)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Key Findings Card */}
          {allIssues.length > 0 && (
            <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🔍</span>
                  <span className="font-bold text-gray-900 text-xs">Key Findings</span>
                </div>
                <button
                  onClick={() => onTabChange?.('findings')}
                  className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  View All ({allIssues.length}) →
                </button>
              </div>

              <div className="space-y-1.5">
                {allIssues.slice(0, 4).map((issue, idx) => {
                  const isCrit = issue.severity?.toLowerCase() === 'critical'
                  const isHigh = issue.severity?.toLowerCase() === 'high'
                  const isMed = issue.severity?.toLowerCase() === 'medium'
                  
                  const pillColor = isCrit
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : isHigh
                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                    : isMed
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'

                  const dotColor = isCrit ? 'bg-rose-500' : isHigh ? 'bg-orange-500' : isMed ? 'bg-amber-500' : 'bg-blue-500'

                  return (
                    <div
                      key={issue.id || idx}
                      onClick={() => onTabChange?.('findings')}
                      className="p-2 bg-gray-50/60 hover:bg-gray-100/70 border border-gray-200/80 rounded-lg flex items-center justify-between gap-2 transition cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                          <p className="font-bold text-[11px] text-gray-900 truncate">
                            {issue.title} {issue.file ? `in ${issue.file.split('/').pop()}` : ''}
                          </p>
                        </div>
                        {issue.explanation && (
                          <p className="text-[10px] text-gray-500 truncate pl-3 mt-0.5">
                            {issue.explanation}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase ${pillColor}`}>
                          {issue.severity || 'Info'}
                        </span>
                        <span className="text-gray-400 text-xs">›</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Ask AI Quick Prompts */}
          <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🤖</span>
              <span className="font-bold text-gray-900 text-xs">Ask AI</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Why is this PR high risk?',
                'What could break if this is merged?',
                'Summarize the changes'
              ].map(prompt => (
                <button
                  key={prompt}
                  onClick={() => onAskPrompt?.(prompt)}
                  className="px-2.5 py-1 bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-200/80 text-indigo-800 rounded-lg text-[10.5px] font-medium transition cursor-pointer flex items-center gap-1"
                >
                  <span>💭</span>
                  <span>{prompt}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Human Review Decision Banner & Actions */}
          <div className="p-3 bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-amber-50/90 border border-amber-200/90 rounded-xl shadow-2xs space-y-2.5">
            <div className="flex items-start gap-2">
              <span className="text-base shrink-0 mt-0.5">⚠️</span>
              <div>
                <p className="font-bold text-amber-950 text-xs">
                  Human review still required
                </p>
                <p className="text-[10.5px] text-amber-800 leading-snug">
                  This AI analysis helps you review faster, but the final decision is yours.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-amber-200/60">
              <button
                onClick={() => handleOpenReviewModal('COMMENT')}
                className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 text-[10.5px] font-bold rounded-lg transition shadow-2xs cursor-pointer"
              >
                💬 Comment
              </button>
              <button
                onClick={() => handleOpenReviewModal('APPROVE')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-bold rounded-lg transition shadow-2xs cursor-pointer"
              >
                ✓ Approve
              </button>
              <button
                onClick={() => handleOpenReviewModal('REQUEST_CHANGES')}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10.5px] font-bold rounded-lg transition shadow-2xs cursor-pointer"
              >
                ✕ Request Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Submission Modal Dialog */}
      {reviewAction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-[420px] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-gray-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">
                  {reviewAction === 'APPROVE' ? '✅' : reviewAction === 'REQUEST_CHANGES' ? '❌' : '💬'}
                </span>
                <span className="font-bold text-xs">
                  Submit Review: {reviewAction === 'APPROVE' ? 'Approve PR' : reviewAction === 'REQUEST_CHANGES' ? 'Request Changes' : 'Post Review Comments'}
                </span>
              </div>
              <button
                onClick={() => setReviewAction(null)}
                className="text-gray-400 hover:text-white transition font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-3 text-xs">
              <p className="text-[11px] text-gray-600">
                You are submitting your official human review to GitHub PR #{prDetails?.prNumber}. You can edit or append to the AI-generated assessment below:
              </p>

              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={6}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-[11px] text-gray-800 focus:outline-indigo-500 focus:bg-white resize-none"
                placeholder="Write your review comments here..."
              />

              {reviewSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] font-medium">
                  ✅ {reviewSuccess}
                </div>
              )}

              {reviewError === 'GITHUB_TOKEN_MISSING' && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] space-y-1">
                  <p className="font-semibold">⚠️ GitHub Token Required</p>
                  <p>Configure a GitHub Personal Access Token in Settings (🔑) to submit reviews.</p>
                  <button
                    onClick={() => {
                      setReviewAction(null)
                      onOpenApiKeyModal?.()
                    }}
                    className="px-2 py-1 bg-amber-600 text-white rounded text-[10px] font-bold mt-1"
                  >
                    Open Settings
                  </button>
                </div>
              )}

              {reviewError && reviewError !== 'GITHUB_TOKEN_MISSING' && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[11px]">
                  ❌ {reviewError}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setReviewAction(null)}
                disabled={submittingReview}
                className="px-3 py-1.5 text-gray-600 hover:text-gray-800 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview}
                className={`px-4 py-1.5 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-2xs flex items-center gap-1.5 ${
                  reviewAction === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : reviewAction === 'REQUEST_CHANGES'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {submittingReview ? (
                  <>
                    <span className="animate-spin text-sm">🌀</span>
                    <span>Submitting to GitHub...</span>
                  </>
                ) : (
                  <span>Submit {reviewAction}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
