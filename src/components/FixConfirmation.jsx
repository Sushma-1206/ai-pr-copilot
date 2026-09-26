import { useState } from 'react'
import { runAIFix } from '../lib/aiService'
import { applyFixesAndCommit } from '../lib/githubService'

export default function FixConfirmation({ issue, prDetails, onClose, onApplied, onOpenApiKeyModal }) {
  const [step, setStep] = useState('idle') // idle | generating | preview | applying | done | error
  const [fixData, setFixData] = useState(null)
  const [error, setError] = useState(null)
  const [commitResult, setCommitResult] = useState(null)

  async function handleGenerate() {
    setStep('generating')
    setError(null)
    try {
      const result = await runAIFix({ issue, prDetails })
      setFixData(result)
      setStep('preview')
    } catch (err) {
      if (err.message === 'API_KEY_MISSING') {
        onOpenApiKeyModal?.()
        onClose()
        return
      }
      setError(err.message || 'Failed to generate fix.')
      setStep('error')
    }
  }

  async function handleApply() {
    if (!fixData) return
    setStep('applying')
    setError(null)
    try {
      const res = await applyFixesAndCommit({
        repoIdentifier: prDetails.repoIdentifier,
        prNumber: prDetails.prNumber,
        codeFixes: [{
          file: issue.file,
          issueTitle: issue.title,
          originalCode: fixData.originalCode,
          fixedCode: fixData.fixedCode,
          description: fixData.fixDescription
        }],
        commitMessage: `fix: ${issue.title} (AI-assisted fix)`
      })
      setCommitResult(res)
      setStep('done')
      onApplied?.(issue.id)
    } catch (err) {
      if (err.message === 'GITHUB_TOKEN_MISSING') {
        setError('GitHub token required to commit. Configure it in Settings (⚙️ Key).')
      } else {
        setError(err.message || 'Failed to apply fix.')
      }
      setStep('error')
    }
  }

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-end justify-end p-4 pointer-events-none">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-indigo-600 text-white">
          <span className="text-xs font-bold">🔧 Fix This Issue</span>
          <button onClick={onClose} className="text-indigo-200 hover:text-white text-sm">✕</button>
        </div>

        <div className="p-3 space-y-3 max-h-80 overflow-y-auto">
          {/* Issue summary */}
          <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
            <p className="text-[10px] font-semibold text-gray-500 uppercase">Issue</p>
            <p className="text-xs font-medium text-gray-900">{issue.title}</p>
            {issue.file && <p className="text-[10px] font-mono text-gray-500 mt-0.5">{issue.file}</p>}
          </div>

          {/* Step: idle */}
          {step === 'idle' && (
            <div className="space-y-2">
              <p className="text-[11px] text-gray-600 leading-relaxed">
                AI will generate a targeted fix for this issue. You'll see a diff before anything is applied.
              </p>
              <button
                onClick={handleGenerate}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition"
              >
                ⚡ Generate Fix
              </button>
            </div>
          )}

          {/* Step: generating */}
          {step === 'generating' && (
            <div className="flex items-center gap-2 text-xs text-gray-600 py-3 justify-center">
              <span className="animate-spin">🌀</span>
              <span>AI is generating the fix...</span>
            </div>
          )}

          {/* Step: preview */}
          {step === 'preview' && fixData && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-gray-600 uppercase">What will change</p>
              <p className="text-[11px] text-gray-700">{fixData.explanation}</p>

              {/* Diff */}
              <div className="rounded border border-gray-200 overflow-hidden font-mono text-[10px]">
                {fixData.originalCode && (
                  <div className="bg-rose-50 p-2 border-b border-rose-200">
                    <span className="text-[9px] font-sans font-bold text-rose-600 block mb-1">− Before</span>
                    <pre className="whitespace-pre-wrap break-all text-rose-900">{fixData.originalCode}</pre>
                  </div>
                )}
                {fixData.fixedCode && (
                  <div className="bg-emerald-50 p-2">
                    <span className="text-[9px] font-sans font-bold text-emerald-600 block mb-1">+ After</span>
                    <pre className="whitespace-pre-wrap break-all text-emerald-900">{fixData.fixedCode}</pre>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-1.5 border border-gray-200 rounded text-xs text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded transition"
                >
                  ✅ Apply Fix
                </button>
              </div>
            </div>
          )}

          {/* Step: applying */}
          {step === 'applying' && (
            <div className="flex items-center gap-2 text-xs text-gray-600 py-3 justify-center">
              <span className="animate-spin">🌀</span>
              <span>Committing fix to PR branch...</span>
            </div>
          )}

          {/* Step: done */}
          {step === 'done' && (
            <div className="space-y-2">
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-xs font-semibold text-emerald-800">✅ Fix Applied!</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Committed to branch '{commitResult?.branch}'. Re-analyze to verify the fix.
                </p>
              </div>
              <button onClick={onClose} className="w-full py-1.5 border border-gray-200 rounded text-xs text-gray-700 hover:bg-gray-50">
                Close
              </button>
            </div>
          )}

          {/* Step: error */}
          {step === 'error' && (
            <div className="space-y-2">
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                <p className="text-xs text-rose-700">❌ {error}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 py-1.5 border border-gray-200 rounded text-xs text-gray-700">
                  Close
                </button>
                <button onClick={handleGenerate} className="flex-1 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded">
                  Retry
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
