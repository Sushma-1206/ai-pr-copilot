import { useState } from 'react'

export default function RiskPanel({ prDetails, reviewResult, onTabChange }) {
  const [selectedFile, setSelectedFile] = useState(null)

  const files = reviewResult?.files || []
  const breakingChanges = reviewResult?.breakingChanges || []
  const securityFindings = reviewResult?.securityFindings || []
  const riskLevel = (reviewResult?.riskLevel || 'medium').toUpperCase()

  const riskBadgeStyle =
    riskLevel === 'HIGH' || riskLevel === 'CRITICAL'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : riskLevel === 'MEDIUM'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200'

  return (
    <div className="space-y-3 text-xs text-gray-800">
      {/* Risk Overview Header */}
      <div className="flex items-center justify-between p-2.5 bg-gradient-to-r from-rose-50/70 via-amber-50/50 to-orange-50/70 border border-rose-200/80 rounded-xl shadow-2xs">
        <div>
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
            <span>🛡️</span> PR Risk & Blast Radius
          </h3>
          <p className="text-[10.5px] text-gray-600 mt-0.5">
            Evaluate code ripple effects, breaking changes, and critical files.
          </p>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${riskBadgeStyle}`}>
          {riskLevel} RISK
        </span>
      </div>

      {/* Breaking Changes Alert */}
      {breakingChanges.length > 0 ? (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
          <div className="flex items-center gap-1.5 text-rose-900 font-bold text-xs">
            <span>💥</span>
            <span>{breakingChanges.length} Breaking Changes Detected</span>
          </div>
          <div className="space-y-1.5">
            {breakingChanges.map((bc, idx) => {
              const title = typeof bc === 'string' ? bc : bc.title || bc.description
              const detail = typeof bc === 'object' ? bc.impact || bc.file : null
              return (
                <div key={idx} className="p-2 bg-white/80 border border-rose-200/60 rounded-lg text-[11px]">
                  <p className="font-semibold text-rose-950">{title}</p>
                  {detail && <p className="text-[10px] text-rose-700 mt-0.5">{detail}</p>}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-[11px]">
          <span>✓</span>
          <span>No breaking changes or backward-incompatible API changes detected.</span>
        </div>
      )}

      {/* File Blast Radius & Risk Map */}
      <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
            <span>🗺️</span> File Blast Radius ({files.length > 0 ? files.length : (prDetails?.filesCount || 1)})
          </span>
          <button
            onClick={() => onTabChange?.('diff')}
            className="text-[10.5px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
          >
            Inspect Diff →
          </button>
        </div>

        <div className="space-y-1.5">
          {(files.length > 0 ? files : [{ path: prDetails?.files?.[0]?.filename || 'Changed File', risk: 'medium', reason: 'Primary file touched by PR.' }]).map((file, idx) => {
            const isHigh = file.risk === 'high' || file.risk === 'critical'
            const isMed = file.risk === 'medium'
            const pillColor = isHigh
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : isMed
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            const dot = isHigh ? 'bg-rose-500' : isMed ? 'bg-amber-500' : 'bg-emerald-500'

            return (
              <div
                key={idx}
                className="p-2 bg-gray-50/70 border border-gray-200/80 rounded-lg space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                    <span className="font-mono text-[11px] font-semibold text-gray-800 truncate">
                      {file.path}
                    </span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase shrink-0 ${pillColor}`}>
                    {file.risk || 'MED'}
                  </span>
                </div>
                {file.reason && (
                  <p className="text-[10.5px] text-gray-600 pl-3.5 leading-snug">
                    {file.reason}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Security Check Summary */}
      <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-2">
        <div className="flex items-center gap-1.5 font-bold text-gray-900 text-xs">
          <span>🔒</span>
          <span>Security & Vulnerability Posture</span>
        </div>
        {securityFindings.length > 0 ? (
          <div className="space-y-1.5">
            {securityFindings.map((finding, idx) => (
              <div key={idx} className="p-2 bg-rose-50/60 border border-rose-200/70 rounded-lg text-[11px]">
                <p className="font-semibold text-rose-900">{finding.title}</p>
                {finding.explanation && (
                  <p className="text-[10px] text-rose-700 mt-0.5">{finding.explanation}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-gray-600 leading-relaxed">
            No dangerous patterns, leaked secrets, or severe authorization flaws were flagged in this pull request.
          </p>
        )}
      </div>
    </div>
  )
}
