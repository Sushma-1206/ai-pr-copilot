import { useState } from 'react'
import { runAIFix, runCrossFileFix } from '../lib/aiService'
import { applyFixesAndCommit } from '../lib/githubService'

export default function FixConfirmation({
  issue,
  prDetails,
  onClose,
  onApplied,
  onOpenApiKeyModal
}) {
  const [fixMode, setFixMode] = useState('cross-file') // 'cross-file' | 'localized'
  const [step, setStep] = useState('idle') // idle | generating | preview | applying | done | error
  const [fixData, setFixData] = useState(null)
  const [activeFileIndex, setActiveFileIndex] = useState(0)
  const [error, setError] = useState(null)
  const [commitResult, setCommitResult] = useState(null)
  const [progressMsg, setProgressMsg] = useState('')

  async function handleGenerate(mode = fixMode) {
    setStep('generating')
    setError(null)
    setFixData(null)
    try {
      if (mode === 'cross-file') {
        const result = await runCrossFileFix({ issue, prDetails })
        setFixData({
          type: 'cross-file',
          title: result.title,
          explanation: result.explanation,
          affectedFiles: result.affectedFiles || []
        })
        setActiveFileIndex(0)
      } else {
        const result = await runAIFix({ issue, prDetails })
        setFixData({
          type: 'localized',
          title: issue.title,
          explanation: result.explanation || result.fixDescription,
          affectedFiles: [
            {
              file: issue.file,
              action: 'modify',
              role: 'Target Line',
              reason: result.fixDescription,
              originalCode: result.originalCode,
              fixedCode: result.fixedCode,
              explanation: result.explanation
            }
          ]
        })
        setActiveFileIndex(0)
      }
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
    if (!fixData?.affectedFiles?.length || !prDetails) return
    setStep('applying')
    setError(null)
    setProgressMsg('Applying coordinated fix...')

    try {
      const codeFixes = fixData.affectedFiles.map(af => ({
        file: af.file,
        issueTitle: issue.title,
        originalCode: af.originalCode || '',
        fixedCode: af.fixedCode || '',
        description: af.explanation || af.reason
      }))

      const commitMsg = fixData.type === 'cross-file'
        ? `fix(cross-file): ${issue.title} (coordinated across ${codeFixes.length} files)`
        : `fix: ${issue.title} (localized fix)`

      const res = await applyFixesAndCommit({
        repoIdentifier: prDetails.repoIdentifier,
        prNumber: prDetails.prNumber,
        codeFixes,
        commitMessage: commitMsg,
        onProgress: (msg) => setProgressMsg(msg)
      })

      setCommitResult(res)
      setStep('done')
      onApplied?.(issue.id)
    } catch (err) {
      if (err.message === 'GITHUB_TOKEN_MISSING') {
        setError('GitHub token required to commit. Configure it in Settings (🔑).')
      } else {
        setError(err.message || 'Failed to apply fix.')
      }
      setStep('error')
    }
  }

  const currentFile = fixData?.affectedFiles?.[activeFileIndex] || fixData?.affectedFiles?.[0]

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-end justify-end p-4 pointer-events-none">
      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[600px]">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-gray-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-gray-800 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">🛠️</span>
            <div>
              <h3 className="font-bold text-xs tracking-tight">
                {fixMode === 'cross-file' ? '🔗 Codebase-Aware Fix' : '🎯 Localized Fix'}
              </h3>
              <p className="text-[10px] text-gray-300 truncate max-w-xs">
                {issue.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 text-xs transition cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>

        {/* Mode Selector Tabs */}
        {step === 'idle' && (
          <div className="px-3 pt-3">
            <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
              <button
                onClick={() => setFixMode('cross-file')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[10.5px] font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  fixMode === 'cross-file'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <span>🔗</span>
                <span>Codebase-Aware Fix</span>
              </button>
              <button
                onClick={() => setFixMode('localized')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[10.5px] font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  fixMode === 'localized'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <span>🎯</span>
                <span>Localized Fix</span>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-3.5 space-y-3 overflow-y-auto flex-1 text-xs text-gray-800">
          {/* Issue Summary Card */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase ${
                issue.severity === 'critical' ? 'bg-red-100 text-red-700' :
                issue.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {issue.severity}
              </span>
              {issue.file && (
                <span className="text-[10px] font-mono text-gray-500 truncate">
                  {issue.file}{issue.lineStart ? `:${issue.lineStart}` : ''}
                </span>
              )}
            </div>
            <p className="font-semibold text-gray-900 text-xs">{issue.title}</p>
            {issue.explanation && (
              <p className="text-[10.5px] text-gray-600 leading-relaxed">{issue.explanation}</p>
            )}
          </div>

          {/* STEP: IDLE */}
          {step === 'idle' && (
            <div className="space-y-3">
              {fixMode === 'cross-file' ? (
                <div className="p-3 bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-blue-50/60 border border-indigo-100 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-xs">
                    <span>💡</span>
                    <span>Why Codebase-Aware?</span>
                  </div>
                  <p className="text-[11px] text-indigo-950/80 leading-relaxed">
                    Unlike a localized fix that focuses only on the reported line, <strong>Codebase-Aware Fix</strong> analyzes the surrounding repository context and identifies the changes required across dependent files (e.g. callers, services, and tests).
                  </p>
                  <div className="pt-1 flex flex-col gap-1 text-[10px] text-indigo-800">
                    <span className="flex items-center gap-1.5">✓ Identifies callers & dependent references</span>
                    <span className="flex items-center gap-1.5">✓ Generates coordinated multi-file patch</span>
                    <span className="flex items-center gap-1.5">✓ Previews combined multi-file diff before committing</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1 text-[11px] text-gray-600">
                  <p>
                    Targeted single-file fix focused precisely on the reported line in <code>{issue.file || 'the target file'}</code>.
                  </p>
                </div>
              )}

              <button
                onClick={() => handleGenerate(fixMode)}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>⚡</span>
                <span>{fixMode === 'cross-file' ? 'Generate Codebase-Aware Fix' : 'Generate Localized Fix'}</span>
              </button>
            </div>
          )}

          {/* STEP: GENERATING */}
          {step === 'generating' && (
            <div className="py-12 text-center space-y-3">
              <span className="animate-spin text-3xl inline-block">🌀</span>
              <p className="font-bold text-gray-900 text-xs">
                {fixMode === 'cross-file' ? 'Analyzing Repository Context & Dependencies...' : 'Generating Localized Fix...'}
              </p>
              <p className="text-[11px] text-gray-500">
                {fixMode === 'cross-file' ? 'Examining caller contracts, consumer schemas, and unit tests' : 'Targeting reported lines'}
              </p>
            </div>
          )}

          {/* STEP: PREVIEW */}
          {step === 'preview' && fixData && (
            <div className="space-y-3">
              {/* Coordinated Explanation */}
              {fixData.explanation && (
                <div className="p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-1">
                  <span className="text-[9.5px] font-bold text-indigo-900 uppercase tracking-wider block">
                    {fixData.type === 'cross-file' ? 'Cross-File Architectural Impact' : 'Fix Overview'}
                  </span>
                  <p className="text-[11px] text-indigo-950 leading-relaxed">{fixData.explanation}</p>
                </div>
              )}

              {/* Potentially Affected Files Breakdown */}
              {fixData.affectedFiles?.length > 1 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Potentially Affected Files ({fixData.affectedFiles.length})
                    </span>
                    <span className="text-[10px] text-indigo-600 font-semibold">Click to preview diff</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {fixData.affectedFiles.map((fileObj, idx) => {
                      const isSelected = activeFileIndex === idx
                      return (
                        <button
                          key={idx}
                          onClick={() => setActiveFileIndex(idx)}
                          className={`px-2.5 py-1 rounded-lg text-[10.5px] font-medium border transition cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600 text-white font-bold shadow-2xs'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300'
                          }`}
                        >
                          <span className="font-mono">{fileObj.file}</span>
                          <span className={`px-1 py-0.2 rounded text-[8.5px] uppercase ${
                            isSelected ? 'bg-indigo-800 text-indigo-100' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {fileObj.action || 'modify'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Current File Diff Preview */}
              {currentFile && (
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                  <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs">📄</span>
                      <span className="font-mono font-bold text-[10.5px] text-gray-900 truncate">
                        {currentFile.file}
                      </span>
                    </div>
                    {currentFile.role && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {currentFile.role}
                      </span>
                    )}
                  </div>

                  {currentFile.reason && (
                    <div className="px-3 py-1.5 bg-gray-50/50 border-b border-gray-100 text-[10.5px] text-gray-600">
                      {currentFile.reason}
                    </div>
                  )}

                  {/* Diff View */}
                  <div className="font-mono text-[10px]">
                    {currentFile.originalCode && (
                      <div className="bg-rose-50/80 p-2.5 border-b border-rose-200">
                        <span className="text-[9px] font-sans font-bold text-rose-600 block mb-1">
                          − Before ({currentFile.file})
                        </span>
                        <pre className="whitespace-pre-wrap break-all text-rose-950 font-mono leading-relaxed">
                          {currentFile.originalCode}
                        </pre>
                      </div>
                    )}
                    {currentFile.fixedCode && (
                      <div className="bg-emerald-50/80 p-2.5">
                        <span className="text-[9px] font-sans font-bold text-emerald-600 block mb-1">
                          + After (Coordinated Fix)
                        </span>
                        <pre className="whitespace-pre-wrap break-all text-emerald-950 font-mono leading-relaxed">
                          {currentFile.fixedCode}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Approval Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  className="flex-2 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>✅ Approve & Apply Fix ({fixData.affectedFiles?.length || 1} files)</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP: APPLYING */}
          {step === 'applying' && (
            <div className="py-12 text-center space-y-3">
              <span className="animate-spin text-3xl inline-block">🌀</span>
              <p className="font-bold text-gray-900 text-xs">Committing Fix to PR Branch</p>
              <p className="text-[11px] text-gray-500">{progressMsg || 'Updating target branch files...'}</p>
            </div>
          )}

          {/* STEP: DONE */}
          {step === 'done' && (
            <div className="space-y-3 py-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-xl font-bold shadow-2xs">
                ✓
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">
                  {fixData?.type === 'cross-file' ? 'Cross-File Fix Applied!' : 'Fix Applied!'}
                </h4>
                <p className="text-[11px] text-gray-600 mt-1">
                  Committed {commitResult?.committedFiles?.length || 1} file(s) to branch <span className="font-mono font-semibold text-indigo-600">{commitResult?.branch}</span>.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl text-xs transition cursor-pointer shadow-sm"
              >
                Close
              </button>
            </div>
          )}

          {/* STEP: ERROR */}
          {step === 'error' && (
            <div className="space-y-3 py-2">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-1">
                <p className="font-bold text-xs flex items-center gap-1.5">
                  <span>❌</span> Fix Operation Failed
                </p>
                <p className="text-[11px]">{error}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-1.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => handleGenerate(fixMode)}
                  className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                >
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
