import { useState } from 'react'

export default function CodeFixCard({ fix }) {
  const [copiedGh, setCopiedGh] = useState(false)
  const [copiedRaw, setCopiedRaw] = useState(false)

  function handleCopyGitHubSuggestion() {
    const markdown =
      fix.githubSuggestionMarkdown ||
      `\`\`\`suggestion\n${fix.fixedCode}\n\`\`\``
    navigator.clipboard.writeText(markdown)
    setCopiedGh(true)
    setTimeout(() => setCopiedGh(false), 2000)
  }

  function handleCopyRawFix() {
    navigator.clipboard.writeText(fix.fixedCode)
    setCopiedRaw(true)
    setTimeout(() => setCopiedRaw(false), 2000)
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm text-xs space-y-2 p-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-sm">🛠️</span>
          <span className="font-semibold text-gray-900 truncate">
            {fix.issueTitle || 'Suggested Code Refactor'}
          </span>
        </div>
        {fix.file && (
          <span className="font-mono text-[10px] bg-gray-100 text-indigo-700 font-medium px-1.5 py-0.5 rounded truncate max-w-[140px]">
            {fix.file}
          </span>
        )}
      </div>

      {/* Description */}
      {fix.description && (
        <p className="text-gray-600 leading-relaxed text-[11px]">
          {fix.description}
        </p>
      )}

      {/* Code Comparison (Diff View) */}
      <div className="space-y-1.5 font-mono text-[11px] rounded overflow-hidden border border-gray-200">
        {/* Original Code */}
        {fix.originalCode && (
          <div className="bg-rose-50/80 border-b border-rose-200/60 p-2 text-rose-900 overflow-x-auto">
            <span className="text-[9px] uppercase font-sans font-bold text-rose-600 block mb-0.5 select-none">
              - Original Code
            </span>
            <pre className="whitespace-pre-wrap break-all">{fix.originalCode}</pre>
          </div>
        )}

        {/* AI Fixed Code */}
        {fix.fixedCode && (
          <div className="bg-emerald-50/80 p-2 text-emerald-900 overflow-x-auto">
            <span className="text-[9px] uppercase font-sans font-bold text-emerald-600 block mb-0.5 select-none">
              + AI Recommended Fix
            </span>
            <pre className="whitespace-pre-wrap break-all">{fix.fixedCode}</pre>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleCopyGitHubSuggestion}
          className="flex-1 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded text-[10px] transition flex items-center justify-center gap-1"
          title="Copy formatted for GitHub comment suggestion block"
        >
          <span>{copiedGh ? '✓ Copied!' : '📋 Copy GitHub Suggestion'}</span>
        </button>

        <button
          onClick={handleCopyRawFix}
          className="py-1.5 px-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded text-[10px] border border-gray-200 transition"
          title="Copy raw code snippet"
        >
          <span>{copiedRaw ? '✓ Copied' : 'Copy Code'}</span>
        </button>
      </div>
    </div>
  )
}
