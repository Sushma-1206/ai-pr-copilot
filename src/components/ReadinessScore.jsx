export default function ReadinessScore({ score, riskLevel, breakdown }) {
  if (score == null) return null

  const scoreColor = score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-rose-600'
  const barColor = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
  const ringColor = score >= 80 ? 'border-emerald-400' : score >= 60 ? 'border-amber-400' : 'border-rose-400'

  const riskConfig = {
    low: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'LOW' },
    medium: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'MEDIUM' },
    high: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'HIGH' },
    critical: { bg: 'bg-red-100', text: 'text-red-700', label: 'CRITICAL' }
  }

  const risk = riskConfig[(riskLevel || 'medium').toLowerCase()] || riskConfig.medium

  return (
    <div className="space-y-2">
      {/* Score + Risk Row */}
      <div className="flex items-center gap-3">
        {/* Circular score */}
        <div className={`flex items-center justify-center w-14 h-14 rounded-full border-3 ${ringColor} bg-white shadow-sm`}>
          <div className="text-center">
            <p className={`text-lg font-bold leading-none ${scoreColor}`}>{score}</p>
            <p className="text-[8px] text-gray-400 uppercase">Score</p>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-gray-700">PR Readiness</span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${risk.bg} ${risk.text}`}>
              Risk: {risk.label}
            </span>
          </div>
          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
            <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${score}%` }} />
          </div>
        </div>
      </div>

      {/* Optional breakdown */}
      {breakdown && breakdown.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          {breakdown.map((item, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 rounded px-2 py-1 border border-gray-100">
              <span className="text-[10px] text-gray-600">{item.label}</span>
              <span className={`text-[10px] font-bold ${
                item.score >= 80 ? 'text-emerald-600' : item.score >= 60 ? 'text-amber-600' : 'text-rose-600'
              }`}>
                {item.score}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
