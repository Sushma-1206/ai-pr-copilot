export default function ReadinessScore({ score, riskLevel, breakdown, counts }) {
  if (score == null) return null

  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)))
  
  // SVG circular gauge geometry
  const size = 68
  const strokeWidth = 6.5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference

  const isHigh = normalizedScore >= 80
  const isMed = normalizedScore >= 60

  const theme = isHigh
    ? { text: 'text-emerald-600', gradId: 'scoreGradEmerald', start: '#34d399', end: '#059669', track: '#e6f7f0' }
    : isMed
    ? { text: 'text-amber-600', gradId: 'scoreGradAmber', start: '#fbbf24', end: '#d97706', track: '#fef3c7' }
    : { text: 'text-rose-600', gradId: 'scoreGradRose', start: '#fb7185', end: '#e11d48', track: '#ffe4e6' }

  const riskConfig = {
    low: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dot: 'bg-emerald-500', label: 'Low Risk' },
    medium: { bg: 'bg-amber-50 text-amber-700 border-amber-200/80', dot: 'bg-amber-500', label: 'Medium Risk' },
    high: { bg: 'bg-rose-50 text-rose-700 border-rose-200/80', dot: 'bg-rose-500', label: 'High Risk' },
    critical: { bg: 'bg-rose-50 text-rose-700 border-rose-200/80', dot: 'bg-rose-500', label: 'Critical Risk' }
  }

  const risk = riskConfig[(riskLevel || 'medium').toLowerCase()] || riskConfig.medium

  return (
    <div className="space-y-2.5">
      {/* Score + Circular Ring Gauge */}
      <div className="flex items-center gap-3.5">
        <div className="relative shrink-0 flex items-center justify-center">
          <svg width={size} height={size} className="transform -rotate-90">
            <defs>
              <linearGradient id={theme.gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={theme.start} />
                <stop offset="100%" stopColor={theme.end} />
              </linearGradient>
            </defs>
            {/* Background track circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Animated progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={`url(#${theme.gradId})`}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{
                transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className={`text-base font-extrabold leading-none tracking-tight ${theme.text}`}>
              {normalizedScore}
            </span>
            <span className="text-[9px] font-semibold text-gray-400 mt-0.5 tracking-tight">
              /100
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-xs font-bold text-gray-800 tracking-tight">PR Readiness</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${risk.bg}`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${risk.dot}`} />
              {risk.label}
            </span>
          </div>
          <p className="text-[10px] text-gray-500 leading-snug">
            {normalizedScore >= 80
              ? '• High quality! PR is ready for smooth review.'
              : normalizedScore >= 60
              ? '• Minor issues found. Review the suggested fixes.'
              : '• Needs attention before requesting a review.'}
          </p>
        </div>
      </div>

      {/* Severity Count Pills row */}
      {counts && (
        <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100 flex-wrap">
          <span className="flex items-center gap-1 font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            {counts.critical} Critical
          </span>
          <span className="flex items-center gap-1 font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            {counts.high} High
          </span>
          <span className="flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {counts.medium} Medium
          </span>
          <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {counts.passed} Passed
          </span>
        </div>
      )}

      {/* Optional breakdown */}
      {breakdown && breakdown.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          {breakdown.map((item, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-50/80 rounded-lg px-2.5 py-1 border border-gray-100">
              <span className="text-[10px] text-gray-600 font-medium truncate">{item.label}</span>
              <span className="text-[10px] font-bold text-gray-900 ml-1">+{item.value}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
