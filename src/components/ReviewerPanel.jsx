import { useState } from 'react'
import CodeFixCard from './CodeFixCard'
import { postBatchReview } from '../lib/githubService'

export default function ReviewerPanel({
  prDetails,
  onRunCheck,
  loading,
  reviewResult,
  error,
  onOpenApiKeyModal
}) {
  const [copied, setCopied] = useState(false)
  const [posting, setPosting] = useState(false)
  const [postSuccess, setPostSuccess] = useState(false)
  const [postError, setPostError] = useState(null)

  function handleCopyReviewComment() {
    if (reviewResult?.recommendedReviewComment) {
      navigator.clipboard.writeText(reviewResult.recommendedReviewComment)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handlePostBatchReview() {
    if (!reviewResult || !prDetails) return
    setPosting(true)
    setPostError(null)
    setPostSuccess(false)

    try {
      await postBatchReview({
        repoIdentifier: prDetails.repoIdentifier,
        prNumber: prDetails.prNumber,
        reviewResult
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

  const verdict = reviewResult?.verdict
  const verdictStyle =
    verdict === 'APPROVE'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
      : verdict === 'REQUEST_CHANGES'
      ? 'bg-rose-100 text-rose-800 border-rose-300'
      : 'bg-indigo-100 text-indigo-800 border-indigo-300'

  return (
    <div className="space-y-4 text-xs text-gray-800">
      {/* Header & Run Action */}
      <div className="flex items-center justify-between bg-purple-50 border border-purple-100 p-3 rounded-lg">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
            <span>🔍</span> Reviewer Verification
          </h3>
          <p className="text-[11px] text-gray-600 mt-0.5">
            {prDetails?.filesCount ? `${prDetails.filesCount} file(s) under review` : 'Reading PR diff...'}
          </p>
        </div>

        <button
          onClick={onRunCheck}
          disabled={loading || posting}
          className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium text-xs rounded-md shadow transition flex items-center gap-1.5"
        >
          {loading ? (
            <>
              <span className="animate-spin text-sm">🌀</span>
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <span>🔍</span>
              <span>{reviewResult ? 'Re-run Summary' : 'Generate Summary'}</span>
            </>
          )}
        </button>
      </div>

      {/* API Key Missing Error Banner */}
      {error === 'API_KEY_MISSING' && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 space-y-2">
          <p className="font-medium">⚠️ Groq API Key Required</p>
          <p className="text-[11px]">
            Please enter your Groq API key to generate reviewer summaries.
          </p>
          <button
            onClick={onOpenApiKeyModal}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded text-[11px] transition"
          >
            Configure API Key
          </button>
        </div>
      )}

      {/* General Error Banner */}
      {error && error !== 'API_KEY_MISSING' && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-700">
          {error}
        </div>
      )}

      {/* Loading Shimmer State */}
      {loading && (
        <div className="space-y-3 p-3 bg-gray-50 rounded-lg animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      )}

      {/* Review Results */}
      {!loading && reviewResult && (
        <div className="space-y-3">
          {/* Verdict Banner */}
          {verdict && (
            <div className={`p-3 border rounded-lg flex items-center justify-between ${verdictStyle}`}>
              <div>
                <span className="text-[10px] uppercase font-semibold tracking-wider">
                  Recommended Verdict
                </span>
                <p className="text-base font-bold uppercase">{verdict.replace('_', ' ')}</p>
              </div>
              <span className="text-2xl">
                {verdict === 'APPROVE' ? '✅' : verdict === 'REQUEST_CHANGES' ? '❌' : '💬'}
              </span>
            </div>
          )}

          {/* 1-Click Post Batch Review Action */}
          <button
            onClick={handlePostBatchReview}
            disabled={posting}
            className="w-full py-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-semibold rounded-lg shadow transition flex items-center justify-center gap-1.5"
          >
            {posting ? (
              <>
                <span className="animate-spin text-sm">🌀</span>
                <span>Posting review to GitHub...</span>
              </>
            ) : (
              <>
                <span className="text-sm">💬</span>
                <span>1-Click Post Batch Review to GitHub</span>
              </>
            )}
          </button>

          {/* Post Success Banner */}
          {postSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-[11px] flex items-center justify-between">
              <span>✅ Review comment posted to GitHub PR!</span>
              <button
                onClick={() => window.location.reload()}
                className="underline text-emerald-900 font-medium ml-2"
              >
                Reload
              </button>
            </div>
          )}

          {/* Post Error Banner */}
          {postError === 'GITHUB_TOKEN_MISSING' && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-[11px] space-y-1">
              <p className="font-medium">⚠️ GitHub Access Token Required</p>
              <p className="text-[10px]">
                To post batch reviews directly to GitHub, enter your GitHub Access Token in settings.
              </p>
              <button
                onClick={onOpenApiKeyModal}
                className="px-2.5 py-1 bg-amber-700 text-white font-medium rounded text-[10px] mt-1"
              >
                Configure Token in Settings
              </button>
            </div>
          )}

          {postError && postError !== 'GITHUB_TOKEN_MISSING' && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-md text-rose-700 text-[11px]">
              ❌ {postError}
            </div>
          )}

          {/* Actionable Code Suggestions Section */}
          {reviewResult.codeFixes?.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="font-semibold text-gray-900 text-xs block">
                🛠️ Suggested Inline Review Fixes ({reviewResult.codeFixes.length})
              </span>

              <div className="space-y-2">
                {reviewResult.codeFixes.map((fix, idx) => (
                  <CodeFixCard key={idx} fix={fix} />
                ))}
              </div>
            </div>
          )}

          {/* PR Overview */}
          {reviewResult.overview && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="font-semibold text-gray-900 block mb-1">Executive Overview</span>
              <p className="text-gray-700 leading-relaxed">{reviewResult.overview}</p>
            </div>
          )}

          {/* Breaking Changes */}
          {reviewResult.breakingChanges?.length > 0 && (
            <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-lg space-y-1.5">
              <span className="font-semibold text-rose-900 flex items-center gap-1">
                ⚠️ Breaking Changes Detected ({reviewResult.breakingChanges.length})
              </span>
              <ul className="space-y-1 text-gray-700">
                {reviewResult.breakingChanges.map((bc, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-rose-500">•</span>
                    <span>{bc}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Architectural Impact */}
          {reviewResult.architecturalImpact && (
            <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg">
              <span className="font-semibold text-blue-900 block mb-1">Architectural Impact</span>
              <p className="text-gray-700 leading-relaxed">{reviewResult.architecturalImpact}</p>
            </div>
          )}

          {/* Questions for Author */}
          {reviewResult.targetedQuestions?.length > 0 && (
            <div className="p-3 bg-purple-50/50 border border-purple-200 rounded-lg space-y-1.5">
              <span className="font-semibold text-purple-900 flex items-center gap-1">
                ❓ Suggested Questions for PR Author
              </span>
              <ul className="space-y-1 text-gray-700">
                {reviewResult.targetedQuestions.map((q, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-purple-500">•</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Copy Review Comment Action */}
          {reviewResult.recommendedReviewComment && (
            <button
              onClick={handleCopyReviewComment}
              className="w-full py-2 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-md transition flex items-center justify-center gap-1.5"
            >
              <span>{copied ? '✓ Copied to Clipboard!' : '📋 Copy Raw Review Comment'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
