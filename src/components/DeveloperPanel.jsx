import { useState } from 'react'
import CodeFixCard from './CodeFixCard'
import { applyFixesAndCommit } from '../lib/githubService'

export default function DeveloperPanel({
  prDetails,
  onRunCheck,
  loading,
  reviewResult,
  error,
  onOpenApiKeyModal
}) {
  const [copied, setCopied] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [commitProgress, setCommitProgress] = useState('')
  const [commitSuccess, setCommitSuccess] = useState(null)
  const [commitError, setCommitError] = useState(null)

  function handleCopyPrDescription() {
    if (reviewResult?.suggestedPrDescription) {
      navigator.clipboard.writeText(reviewResult.suggestedPrDescription)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleDownloadPatch() {
    if (!reviewResult?.codeFixes?.length) return

    const patchLines = []
    reviewResult.codeFixes.forEach((fix) => {
      const file = fix.file || 'modified-file.js'
      patchLines.push(`diff --git a/${file} b/${file}`)
      patchLines.push(`--- a/${file}`)
      patchLines.push(`+++ b/${file}`)
      patchLines.push(`@@ -1,1 +1,1 @@`)
      if (fix.originalCode) {
        fix.originalCode.split('\n').forEach((line) => patchLines.push(`-${line}`))
      }
      if (fix.fixedCode) {
        fix.fixedCode.split('\n').forEach((line) => patchLines.push(`+${line}`))
      }
      patchLines.push('')
    })

    const blob = new Blob([patchLines.join('\n')], { type: 'text/x-diff' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-pr-fixes-${prDetails?.prNumber || 'patch'}.patch`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleAutoCommitFixes() {
    if (!reviewResult?.codeFixes?.length || !prDetails) return
    setCommitting(true)
    setCommitError(null)
    setCommitSuccess(null)

    try {
      const res = await applyFixesAndCommit({
        repoIdentifier: prDetails.repoIdentifier,
        prNumber: prDetails.prNumber,
        codeFixes: reviewResult.codeFixes,
        onProgress: (status) => setCommitProgress(status)
      })

      setCommitSuccess(`Successfully committed ${res.committedFiles.length} fix(es) directly to branch '${res.branch}'!`)
    } catch (err) {
      if (err.message === 'GITHUB_TOKEN_MISSING') {
        setCommitError('GITHUB_TOKEN_MISSING')
      } else {
        setCommitError(err.message || 'Failed to auto-commit fixes.')
      }
    } finally {
      setCommitting(false)
    }
  }

  const score = reviewResult?.readinessScore ?? null
  const scoreColor =
    score >= 80 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : score >= 60 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-rose-600 bg-rose-50 border-rose-200'

  return (
    <div className="space-y-4 text-xs text-gray-800">
      {/* Header & Run Action */}
      <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 p-3 rounded-lg">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
            <span>🚀</span> Developer Pre-Flight Check
          </h3>
          <p className="text-[11px] text-gray-600 mt-0.5">
            {prDetails?.filesCount ? `${prDetails.filesCount} file(s) changed` : 'Extracting PR diff...'}
          </p>
        </div>

        <button
          onClick={onRunCheck}
          disabled={loading || committing}
          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-xs rounded-md shadow transition flex items-center gap-1.5"
        >
          {loading ? (
            <>
              <span className="animate-spin text-sm">🌀</span>
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <span>⚡</span>
              <span>{reviewResult ? 'Re-run Check' : 'Run Pre-flight'}</span>
            </>
          )}
        </button>
      </div>

      {/* API Key Missing Error Banner */}
      {error === 'API_KEY_MISSING' && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 space-y-2">
          <p className="font-medium">⚠️ Groq API Key Required</p>
          <p className="text-[11px]">
            Please enter your Groq API key to enable AI-powered pre-flight checks.
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
          {/* Readiness Score Banner */}
          {score !== null && (
            <div className={`flex items-center justify-between p-3 border rounded-lg ${scoreColor}`}>
              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold opacity-75">
                  PR Readiness Score
                </span>
                <p className="text-2xl font-bold">{score}%</p>
              </div>
              <div className="w-1/2 bg-gray-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${score}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Actionable Code Fixes Section */}
          {reviewResult.codeFixes?.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900 text-xs flex items-center gap-1">
                  🛠️ Actionable Code Fixes ({reviewResult.codeFixes.length})
                </span>

                <button
                  onClick={handleDownloadPatch}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium text-[10px] rounded border border-gray-200 transition flex items-center gap-1"
                  title="Download unified .patch file to apply locally using git apply"
                >
                  <span>📥 .patch</span>
                </button>
              </div>

              {/* 1-Click Auto Commit Action Button */}
              <button
                onClick={handleAutoCommitFixes}
                disabled={committing}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow transition flex items-center justify-center gap-1.5"
              >
                {committing ? (
                  <>
                    <span className="animate-spin text-sm">🌀</span>
                    <span>{commitProgress || 'Committing fixes...'}</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm">🚀</span>
                    <span>1-Click Apply All Fixes & Commit to PR</span>
                  </>
                )}
              </button>

              {/* Commit Success Banner */}
              {commitSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-[11px] flex items-center justify-between">
                  <span>✅ {commitSuccess}</span>
                  <button
                    onClick={() => window.location.reload()}
                    className="underline text-emerald-900 font-medium ml-2"
                  >
                    Reload PR
                  </button>
                </div>
              )}

              {/* Commit Error Banner */}
              {commitError === 'GITHUB_TOKEN_MISSING' && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-[11px] space-y-1">
                  <p className="font-medium">⚠️ GitHub Access Token Required for 1-Click Commits</p>
                  <p className="text-[10px]">
                    To allow AI PR Copilot to commit directly to your PR branch, enter a Personal Access Token with <code className="bg-amber-100 px-1 py-0.5 rounded">repo</code> scope.
                  </p>
                  <button
                    onClick={onOpenApiKeyModal}
                    className="px-2.5 py-1 bg-amber-700 text-white font-medium rounded text-[10px] mt-1"
                  >
                    Configure Token in Settings
                  </button>
                </div>
              )}

              {commitError && commitError !== 'GITHUB_TOKEN_MISSING' && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-md text-rose-700 text-[11px]">
                  ❌ {commitError}
                </div>
              )}

              <div className="space-y-2">
                {reviewResult.codeFixes.map((fix, idx) => (
                  <CodeFixCard key={idx} fix={fix} />
                ))}
              </div>
            </div>
          )}

          {/* Overview Summary */}
          {reviewResult.summary && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="font-semibold text-gray-900 block mb-1">Overview</span>
              <p className="text-gray-700 leading-relaxed">{reviewResult.summary}</p>
            </div>
          )}

          {/* Bug Risks */}
          {reviewResult.bugRisks?.length > 0 && (
            <div className="p-3 bg-rose-50/50 border border-rose-200 rounded-lg space-y-1.5">
              <span className="font-semibold text-rose-900 flex items-center gap-1">
                🐛 Potential Bug Risks ({reviewResult.bugRisks.length})
              </span>
              <ul className="space-y-1 text-gray-700">
                {reviewResult.bugRisks.map((bug, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-rose-500">•</span>
                    <div>
                      {bug.file && <span className="font-mono text-[10px] text-gray-600 bg-gray-200 px-1 py-0.5 rounded mr-1">{bug.file}</span>}
                      <span>{bug.description}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Custom Rules Violations */}
          {reviewResult.customRulesViolations?.length > 0 && (
            <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg space-y-1.5">
              <span className="font-semibold text-amber-900 flex items-center gap-1">
                📏 Custom Repo Rule Violations ({reviewResult.customRulesViolations.length})
              </span>
              <ul className="space-y-1 text-gray-700">
                {reviewResult.customRulesViolations.map((v, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-500">•</span>
                    <span>{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing Test Coverage */}
          {reviewResult.testCoverageGaps?.length > 0 && (
            <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg space-y-1.5">
              <span className="font-semibold text-blue-900 flex items-center gap-1">
                🧪 Test Coverage Gaps
              </span>
              <ul className="space-y-1 text-gray-700">
                {reviewResult.testCoverageGaps.map((t, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-blue-500">•</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Copy PR Description Action */}
          {reviewResult.suggestedPrDescription && (
            <button
              onClick={handleCopyPrDescription}
              className="w-full py-2 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-md transition flex items-center justify-center gap-1.5"
            >
              <span>{copied ? '✓ Copied!' : '📋 Copy Suggested PR Description'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
