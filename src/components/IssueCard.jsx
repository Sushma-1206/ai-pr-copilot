import { useState } from 'react'

const SEVERITY_CONFIG = {
  critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-600 text-white', icon: '🔴' },
  high: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-500 text-white', icon: '🟠' },
  medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-500 text-white', icon: '🟡' },
  low: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-500 text-white', icon: '🔵' }
}

const CATEGORY_ICONS = {
  Security: '🔒',
  Bug: '🐛',
  Performance: '⚡',
  Reliability: '🛡️',
  Maintainability: '🔧',
  'Breaking Change': '💥',
  Testing: '🧪',
  Architecture: '🏗️',
  'Code Quality': '✨',
  Accessibility: '♿',
  'Error Handling': '⚠️'
}

export default function IssueCard({ issue, onFixThis, onExplain, fixStatus }) {
  const [expanded, setExpanded] = useState(false)

  const severity = (issue.severity || 'medium').toLowerCase()
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.medium
  const categoryIcon = CATEGORY_ICONS[issue.category] || '📋'

  return (
    <div className={`border ${config.border} rounded-lg overflow-hidden ${config.bg}`}>
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-2 p-2.5 text-left hover:brightness-95 transition"
      >
        <span className="mt-0.5 text-xs">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${config.badge}`}>
              {severity}
            </span>
            <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
              {categoryIcon} {issue.category || 'General'}
            </span>
            {fixStatus === 'applied' && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700">
                FIX APPLIED
              </span>
            )}
          </div>
          <p className={`text-xs font-semibold mt-1 ${config.text}`}>{issue.title}</p>
          {issue.file && (
            <span className="text-[10px] font-mono text-gray-500 mt-0.5 block truncate">
              {issue.file}{issue.lineStart ? `:${issue.lineStart}` : ''}{issue.lineEnd && issue.lineEnd !== issue.lineStart ? `-${issue.lineEnd}` : ''}
            </span>
          )}
        </div>
        <span className="text-gray-400 text-xs mt-1">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-gray-200/50">
          {/* Explanation */}
          {issue.explanation && (
            <div className="mt-2">
              <p className="text-[10px] font-semibold text-gray-600 uppercase mb-0.5">Problem</p>
              <p className="text-[11px] text-gray-700 leading-relaxed">{issue.explanation}</p>
            </div>
          )}

          {/* Impact */}
          {issue.impact && (
            <div>
              <p className="text-[10px] font-semibold text-gray-600 uppercase mb-0.5">Why This Matters</p>
              <p className="text-[11px] text-gray-700 leading-relaxed">{issue.impact}</p>
            </div>
          )}

          {/* Suggested Fix */}
          {issue.suggestedFix && (
            <div>
              <p className="text-[10px] font-semibold text-gray-600 uppercase mb-0.5">Suggested Fix</p>
              <pre className="text-[11px] text-gray-700 bg-white/70 p-2 rounded border border-gray-200 overflow-x-auto whitespace-pre-wrap">
                {issue.suggestedFix}
              </pre>
            </div>
          )}

          {/* Confidence */}
          {issue.confidence != null && (
            <p className="text-[10px] text-gray-400">
              Confidence: {Math.round(issue.confidence * 100)}%
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1.5 pt-1 flex-wrap">
            {onExplain && (
              <button
                onClick={() => onExplain(issue)}
                className="px-2 py-1 text-[10px] font-medium bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition text-gray-700 cursor-pointer"
              >
                💡 Explain
              </button>
            )}
            {onFixThis && fixStatus !== 'applied' && (
              <>
                <button
                  onClick={() => onFixThis(issue, 'cross-file')}
                  className="px-2.5 py-1 text-[10px] font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-md hover:from-indigo-700 hover:to-purple-700 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Analyzes repository context & dependent files to propose coordinated multi-file changes"
                >
                  <span>🔗</span>
                  <span>Codebase-Aware Fix</span>
                </button>
                <button
                  onClick={() => onFixThis(issue, 'localized')}
                  className="px-2 py-1 text-[10px] font-medium bg-white border border-indigo-200 text-indigo-700 rounded-md hover:bg-indigo-50 transition cursor-pointer"
                  title="Targeted single-line fix"
                >
                  <span>🎯 Local Fix</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
