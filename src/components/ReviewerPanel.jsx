import { useState } from 'react'
import IssueCard from './IssueCard'
import FixConfirmation from './FixConfirmation'
import ReadinessScore from './ReadinessScore'
import { postBatchReview } from '../lib/githubService'

export default function ReviewerPanel({
  prDetails,
  onRunCheck,
  loading,
  reviewResult,
  error,
  onOpenApiKeyModal
}) {
  const [posting, setPosting] = useState(false)
  const [postSuccess, setPostSuccess] = useState(false)
  const [postError, setPostError] = useState(null)
  const [editComment, setEditComment] = useState(false)
  const [reviewComment, setReviewComment] = useState('')
  const [activeFix, setActiveFix] = useState(null)
  const [copied, setCopied] = useState(false)

  const verdict = reviewResult?.verdict
  const verdictStyle =
    verdict === 'APPROVE'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
      : verdict === 'REQUEST_CHANGES'
      ? 'bg-rose-100 text-rose-800 border-rose-300'
      : 'bg-indigo-100 text-indigo-800 border-indigo-300'

  async function handlePostReview() {
    if (!reviewResult || !prDetails) return
    const body = editComment ? reviewComment : reviewResult.recommendedReviewComment
    setPosting(true)
    setPostError(null)
    setPostSuccess(false)
    try {
      await postBatchReview({
        repoIdentifier: prDetails.repoIdentifier,
        prNumber: prDetails.prNumber,
        reviewResult: { ...reviewResult, recommendedReviewComment: body }
      })
      setPostSuccess(true)
    } catch (err) {
      if (err.message === 'GITHUB_TOKEN_MISSING') {
        setPostError('GITHUB_TOKEN_MISSING')
      } else {
        setPostError(err.message || 'Failed to post review to GitHub.')
      }
    } finally {
      setPosting(false)
    }
  }

  function handleCopyComment() {
    const body = reviewResult?.recommendedReviewComment
    if (body) {
      navigator.clipboard.writeText(body)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-3 text-xs text-gray-800">
      {/* Header & Run */}
      <div className="flex items-center justify-between bg-purple-50 border border-purple-100 p-3 rounded-lg">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
            <span>📋</span> Reviewer Mode
          </h3>
          <p className="text-[11px] text-gray-600 mt-0.5">
            {prDetails?.filesCount ? `${prDetails.filesCount} file(s) under review` : 'Reading PR diff...'}
          </p>
        </div>
        <button
          onClick={onRunCheck}
          disabled={loading || posting}
          className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow transition flex items-center gap-1.5"
        >
          {loading ? (
            <><span className="animate-spin">🌀</span><span>Analyzing...</span></>
          ) : (
            <><span>📋</span><span>{reviewResult ? 'Re-run' : 'Generate Summary'}</span></>
          )}
        </button>
      </div>

      {/* Errors */}
      {error === 'API_KEY_MISSING' && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 space-y-2">
          <p className="font-semibold">⚠️ Groq API Key Required</p>
          <button onClick={onOpenApiKeyModal} className="px-3 py-1 bg-amber-600 text-white rounded text-[11px]">
            Configure API Key
          </button>
        </div>
      )}
      {error && error !== 'API_KEY_MISSING' && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700">❌ {error}</div>
      )}

      {loading && (
        <div className="space-y-2 animate-pulse">
          <div className="h-16 bg-gray-100 rounded-lg" />
          <div className="h-10 bg-gray-100 rounded-lg" />
          <div className="h-24 bg-gray-100 rounded-lg" />
        </div>
      )}

      {!loading && reviewResult && (
        <div className="space-y-3">
          {/* Readiness + Verdict */}
          <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-sm space-y-2">
            <ReadinessScore score={reviewResult.readinessScore} riskLevel={reviewResult.riskLevel} />
            {verdict && (
              <div className={`p-2 border rounded-lg flex items-center justify-between ${verdictStyle}`}>
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-wider">Recommended Verdict</span>
                  <p className="text-sm font-bold uppercase">{verdict.replace('_', ' ')}</p>
                </div>
                <span className="text-xl">
                  {verdict === 'APPROVE' ? '✅' : verdict === 'REQUEST_CHANGES' ? '❌' : '💬'}
                </span>
              </div>
            )}
          </div>

          {/* Review Priority */}
          {reviewResult.reviewPriority?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-gray-600 uppercase">Review Priority</p>
              {reviewResult.reviewPriority.map((item, i) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="text-xs font-bold text-amber-600 shrink-0">{i + 1}.</span>
                  <div>
                    <p className="text-[10px] font-mono text-indigo-700 font-medium">{item.file}</p>
                    {item.reason && <p className="text-[10px] text-amber-800">{item.reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Overview */}
          {(reviewResult.overview || reviewResult.summary) && (
            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Executive Overview</p>
              <p className="text-[11px] text-gray-700 leading-relaxed">
                {reviewResult.overview || reviewResult.summary}
              </p>
            </div>
          )}

          {/* Issues */}
          {reviewResult.issues?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-gray-600 uppercase">Issues ({reviewResult.issues.length})</p>
              {reviewResult.issues.slice(0, 5).map((issue, i) => (
                <IssueCard
                  key={issue.id || i}
                  issue={issue}
                  onFixThis={(iss) => setActiveFix(iss)}
                />
              ))}
            </div>
          )}

          {/* Breaking Changes */}
          {reviewResult.breakingChanges?.length > 0 && (
            <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-lg space-y-1">
              <p className="text-[10px] font-bold text-orange-800 uppercase">💥 Breaking Changes</p>
              {reviewResult.breakingChanges.map((bc, i) => {
                const change = typeof bc === 'string' ? { title: bc } : bc
                return (
                  <p key={i} className="text-[11px] text-orange-800">• {change.title}</p>
                )
              })}
            </div>
          )}

          {/* Security */}
          {reviewResult.securityFindings?.length > 0 && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg space-y-1">
              <p className="text-[10px] font-bold text-red-800 uppercase">🔒 Security</p>
              {reviewResult.securityFindings.map((f, i) => (
                <p key={i} className="text-[11px] text-red-800">• [{f.severity}] {f.title}</p>
              ))}
            </div>
          )}

          {/* Questions for Author */}
          {reviewResult.targetedQuestions?.length > 0 && (
            <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg space-y-1">
              <p className="text-[10px] font-bold text-purple-800 uppercase">❓ Questions for Author</p>
              {reviewResult.targetedQuestions.map((q, i) => (
                <p key={i} className="text-[11px] text-purple-800">• {q}</p>
              ))}
            </div>
          )}

          {/* Review comment */}
          {reviewResult.recommendedReviewComment && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gray-600 uppercase">Suggested Review Comment</p>
              {editComment ? (
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={5}
                  className="w-full px-2.5 py-1.5 text-[11px] border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              ) : (
                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg max-h-28 overflow-y-auto">
                  <pre className="text-[10px] text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {reviewResult.recommendedReviewComment}
                  </pre>
                </div>
              )}

              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    if (!editComment) setReviewComment(reviewResult.recommendedReviewComment)
                    setEditComment(!editComment)
                  }}
                  className="px-2.5 py-1.5 border border-gray-200 rounded text-[10px] text-gray-700 hover:bg-gray-50"
                >
                  {editComment ? 'Preview' : '✏️ Edit'}
                </button>
                <button
                  onClick={handleCopyComment}
                  className="px-2.5 py-1.5 border border-gray-200 rounded text-[10px] text-gray-700 hover:bg-gray-50"
                >
                  {copied ? '✓ Copied' : '📋 Copy'}
                </button>
                <button
                  onClick={handlePostReview}
                  disabled={posting}
                  className="flex-1 py-1.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-semibold text-[10px] rounded transition"
                >
                  {posting ? '🌀 Posting...' : '💬 Post to GitHub'}
                </button>
              </div>
            </div>
          )}

          {/* Architectural impact */}
          {reviewResult.architecturalImpact && (
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-[10px] font-semibold text-blue-900 mb-1">Architectural Impact</p>
              <p className="text-[11px] text-blue-800">{reviewResult.architecturalImpact}</p>
            </div>
          )}

          {/* Post banners */}
          {postSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px]">
              ✅ Review comment posted to GitHub!
            </div>
          )}
          {postError === 'GITHUB_TOKEN_MISSING' && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] space-y-1">
              <p className="font-semibold">⚠️ GitHub Access Token Required</p>
              <p>Configure in ⚙️ Settings to post reviews directly to GitHub.</p>
              <button
                onClick={onOpenApiKeyModal}
                className="px-2.5 py-1 bg-amber-700 text-white font-medium rounded text-[10px]"
              >
                Configure Token
              </button>
            </div>
          )}
          {postError && postError !== 'GITHUB_TOKEN_MISSING' && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[11px]">
              ❌ {postError}
            </div>
          )}
        </div>
      )}

      {activeFix && (
        <FixConfirmation
          issue={activeFix}
          prDetails={prDetails}
          onClose={() => setActiveFix(null)}
          onApplied={() => setActiveFix(null)}
          onOpenApiKeyModal={onOpenApiKeyModal}
        />
      )}
    </div>
  )
}
