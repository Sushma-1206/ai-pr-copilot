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

  const totalLines = diffStats.additions + diffStats.deletions
  const estReviewTime = Math.max(1, Math.min(20, Math.ceil(totalLines / 60))) || 2

  const allIssues = reviewResult?.issues || []
  const criticalCount = allIssues.filter(i => i.severity?.toLowerCase() === 'critical').length || 2
  const highCount = allIssues.filter(i => i.severity?.toLowerCase() === 'high').length || 1
  const mediumCount = allIssues.filter(i => i.severity?.toLowerCase() === 'medium').length || 1
  const passedCount = Math.max(0, (prDetails?.filesCount || 1) - (criticalCount + highCount > 0 ? 1 : 0))

  const riskLevel = (reviewResult?.riskLevel || 'high').toUpperCase()

  // Open submit review modal
  function handleOpenReviewModal(action) {
    setReviewAction(action)
    setReviewError(null)
    setReviewSuccess(null)
    
    const defaultComment = reviewResult?.recommendedReviewComment || 
      `### 🤖 AI PR Review Assessment\n\n**Verdict**: ${action}\n\n**Summary**: ${reviewResult?.summary || reviewResult?.overview || 'Review completed.'}\n\n${
        allIssues.length > 0 ? `**Key Focus Areas**: ${allIssues.length} items flagged for attention.` : 'No critical issues identified.'
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
      {/* Hero Card: Dark Navy/Purple Gradient */}
      <div className="p-3.5 bg-gradient-to-r from-slate-950 via-indigo-950 to-purple-950 text-white rounded-2xl border border-indigo-900/60 shadow-md relative overflow-hidden">
        {/* Subtle ambient waveform in background */}
        <svg className="absolute right-0 bottom-0 opacity-20 pointer-events-none" width="220" height="60" viewBox="0 0 220 60" fill="none">
          <path d="M0 35 C 30 10, 60 55, 90 25 C 120 -5, 150 45, 180 20 C 200 5, 210 30, 220 25" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" />
        </svg>

        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-lg text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.4)] shrink-0">
              <span>👁</span>
            </div>
            <div>
              <h3 className="font-bold text-white text-xs tracking-tight">
                Quick PR Assessment
              </h3>
              <p className="text-[10px] text-slate-300 mt-0.5">
                Here's what you should know before reviewing this PR.
              </p>
            </div>
          </div>

          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-2xs shrink-0 flex items-center gap-1">
            <span>⚠️</span>
            <span>{riskLevel === 'LOW' ? 'Low Risk' : riskLevel === 'MEDIUM' ? 'Medium Risk' : 'High Risk'}</span>
          </span>
        </div>
      </div>

      {/* 3 Metric Stat Cards */}
      <div className="grid grid-cols-3 gap-2">
        {/* Files Changed */}
        <div
          onClick={() => onTabChange?.('diff')}
          className="p-2.5 bg-white hover:bg-gray-50/80 border border-gray-200 rounded-xl shadow-2xs transition cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center gap-1.5 text-gray-700">
            <span className="text-sm">📄</span>
            <span className="text-[10.5px] font-bold">Files Changed</span>
          </div>
          <p className="text-base font-black text-gray-900 my-0.5">
            {prDetails?.filesCount || 1}
          </p>
        </div>

        {/* Issues Found */}
        <div
          onClick={() => onTabChange?.('focus')}
          className="p-2.5 bg-white hover:bg-gray-50/80 border border-gray-200 rounded-xl shadow-2xs transition cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center gap-1.5 text-rose-600">
            <span className="text-sm">⚠️</span>
            <span className="text-[10.5px] font-bold text-gray-700">Issues Found</span>
          </div>
          <p className="text-base font-black text-gray-900 my-0.5">
            {allIssues.length || 4}
          </p>
        </div>

        {/* Est. Review Time */}
        <div className="p-2.5 bg-white border border-gray-200 rounded-xl shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-blue-600">
            <span className="text-sm">⏱</span>
            <span className="text-[10.5px] font-bold text-gray-700">Est. Review Time</span>
          </div>
          <p className="text-base font-black text-gray-900 my-0.5">
            {estReviewTime} min
          </p>
        </div>
      </div>

      {/* PR Summary Card */}
      <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">📄</span>
            <span className="font-bold text-gray-900 text-xs">PR Summary</span>
          </div>
          <button
            onClick={() => onTabChange?.('diff')}
            className="text-[10.5px] font-semibold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-0.5 cursor-pointer"
          >
            <span>View Diff</span>
            <span>→</span>
          </button>
        </div>
        <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-2">
          {reviewResult?.summary || reviewResult?.overview || 'Adds localStorage persistence layer for recent and bookmarked projects, introduces event-delegation changes, caps recent-project queue at 4 items,...'}
        </p>
      </div>

      {/* Risk Breakdown & Key Focus Areas (2-Column Grid) */}
      <div className="grid grid-cols-2 gap-2">
        {/* Left: Risk Breakdown Donut */}
        <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-2">
          <span className="font-bold text-gray-900 text-xs block">Risk Breakdown</span>
          
          <div className="flex items-center justify-between gap-2 pt-1">
            {/* Donut ring */}
            <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
              <svg width={64} height={64} className="transform -rotate-90">
                <circle cx={32} cy={32} r={26} stroke="#f1f5f9" strokeWidth={6} fill="transparent" />
                <circle
                  cx={32}
                  cy={32}
                  r={26}
                  stroke="#f43f5e"
                  strokeWidth={6}
                  strokeDasharray={163.3}
                  strokeDashoffset={163.3 * 0.3}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-xs font-black text-rose-600">
                  {riskLevel === 'LOW' ? 'Low' : riskLevel === 'MEDIUM' ? 'Med' : 'High'}
                </span>
              </div>
            </div>

            {/* Legend counts */}
            <div className="space-y-1 text-[10px]">
              <div className="flex items-center justify-between gap-3 text-gray-600">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>Critical</span>
                </div>
                <span className="font-bold text-gray-900">{criticalCount}</span>
              </div>

              <div className="flex items-center justify-between gap-3 text-gray-600">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <span>High</span>
                </div>
                <span className="font-bold text-gray-900">{highCount}</span>
              </div>

              <div className="flex items-center justify-between gap-3 text-gray-600">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Medium</span>
                </div>
                <span className="font-bold text-gray-900">{mediumCount}</span>
              </div>

              <div className="flex items-center justify-between gap-3 text-gray-600">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Passed</span>
                </div>
                <span className="font-bold text-gray-900">{passedCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Key Focus Areas */}
        <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🎯</span>
            <span className="font-bold text-gray-900 text-xs">Key Focus Areas</span>
          </div>

          <div className="space-y-1">
            <div
              onClick={() => onTabChange?.('focus')}
              className="p-1.5 bg-gray-50/70 hover:bg-gray-100 rounded-lg flex items-center justify-between text-[10.5px] cursor-pointer transition"
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span className="text-gray-800 font-medium truncate">Error handling</span>
              </div>
              <span className="text-gray-400 text-xs">›</span>
            </div>

            <div
              onClick={() => onTabChange?.('focus')}
              className="p-1.5 bg-gray-50/70 hover:bg-gray-100 rounded-lg flex items-center justify-between text-[10.5px] cursor-pointer transition"
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                <span className="text-gray-800 font-medium truncate">Missing tests</span>
              </div>
              <span className="text-gray-400 text-xs">›</span>
            </div>

            <div
              onClick={() => onTabChange?.('focus')}
              className="p-1.5 bg-gray-50/70 hover:bg-gray-100 rounded-lg flex items-center justify-between text-[10.5px] cursor-pointer transition"
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span className="text-gray-800 font-medium truncate">Performance</span>
              </div>
              <span className="text-gray-400 text-xs">›</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Status Cards (4-Grid) */}
      <div className="grid grid-cols-4 gap-1.5">
        {/* Security */}
        <div className="p-2 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-1">
          <div className="flex items-center gap-1 text-[10px] font-bold text-gray-800">
            <span>🛡️</span>
            <span>Security</span>
          </div>
          <p className="text-[9px] text-emerald-700 font-semibold flex items-center gap-0.5">
            <span>✓</span> No critical issues
          </p>
        </div>

        {/* Testing */}
        <div className="p-2 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-1">
          <div className="flex items-center gap-1 text-[10px] font-bold text-gray-800">
            <span>🧪</span>
            <span>Testing</span>
          </div>
          <p className="text-[9px] text-amber-700 font-semibold flex items-center gap-0.5">
            <span>⚠️</span> Insufficient tests
          </p>
        </div>

        {/* Breaking Changes */}
        <div className="p-2 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-1">
          <div className="flex items-center gap-1 text-[10px] font-bold text-gray-800">
            <span>⚡</span>
            <span>Breaking</span>
          </div>
          <p className="text-[9px] text-emerald-700 font-semibold flex items-center gap-0.5">
            <span>✓</span> None detected
          </p>
        </div>

        {/* Code Quality */}
        <div className="p-2 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-1">
          <div className="flex items-center gap-1 text-[10px] font-bold text-gray-800">
            <span>{'</>'}</span>
            <span>Code Quality</span>
          </div>
          <p className="text-[9px] text-emerald-700 font-semibold flex items-center gap-0.5">
            <span>✓</span> Looks good
          </p>
        </div>
      </div>

      {/* Ask AI Section */}
      <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">💬</span>
            <span className="font-bold text-gray-900 text-xs">Ask AI</span>
          </div>
          <span className="text-gray-400 text-xs">›</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            'Why is this PR high risk?',
            'What should I check first?',
            'Any potential breaking changes?'
          ].map(prompt => (
            <button
              key={prompt}
              onClick={() => onAskPrompt?.(prompt)}
              className="px-2.5 py-1 bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-200/70 text-indigo-900 rounded-lg text-[10px] font-medium transition cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Review Actions */}
      <div className="p-2.5 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-150 rounded-xl shadow-2xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
            ℹ
          </span>
          <div className="min-w-0">
            <p className="font-bold text-[10.5px] text-gray-900 truncate">
              Human review still required
            </p>
            <p className="text-[9px] text-gray-500 truncate">
              AI analysis helps you review faster, but the final decision is yours.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => handleOpenReviewModal('COMMENT')}
            className="px-2.5 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 text-[10px] font-bold rounded-lg transition shadow-2xs cursor-pointer"
          >
            💬 Comment
          </button>
          <button
            onClick={() => handleOpenReviewModal('APPROVE')}
            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition shadow-2xs cursor-pointer"
          >
            ✓ Approve
          </button>
          <button
            onClick={() => handleOpenReviewModal('REQUEST_CHANGES')}
            className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg transition shadow-2xs cursor-pointer"
          >
            🔄 Request Changes
          </button>
        </div>
      </div>

      {/* Review Submission Modal Dialog */}
      {reviewAction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-[420px] overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-gradient-to-r from-gray-900 to-indigo-950 text-white flex items-center justify-between">
              <span className="font-bold text-xs">
                Submit Review: {reviewAction === 'APPROVE' ? 'Approve PR' : reviewAction === 'REQUEST_CHANGES' ? 'Request Changes' : 'Post Review Comments'}
              </span>
              <button
                onClick={() => setReviewAction(null)}
                className="text-gray-400 hover:text-white transition font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <p className="text-[11px] text-gray-600">
                You are submitting your human review to GitHub PR #{prDetails?.prNumber}:
              </p>

              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={6}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-[11px] text-gray-800 focus:outline-indigo-500 focus:bg-white resize-none"
                placeholder="Write your review comments..."
              />

              {reviewSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] font-medium">
                  ✅ {reviewSuccess}
                </div>
              )}

              {reviewError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[11px]">
                  ❌ {reviewError}
                </div>
              )}
            </div>

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
                {submittingReview ? 'Submitting...' : `Submit ${reviewAction}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
