import { useState, useMemo } from 'react'

export default function DiffPreviewPanel({ prDetails }) {
  const [selectedFile, setSelectedFile] = useState('all')
  const [copied, setCopied] = useState(false)

  // Parse rawDiff into file sections
  const fileDiffs = useMemo(() => {
    const raw = prDetails?.rawDiff || ''
    if (!raw.trim()) return []

    const chunks = raw.split(/^diff --git a\//m).filter(Boolean)
    return chunks.map(chunk => {
      const firstLine = chunk.split('\n')[0] || ''
      const parts = firstLine.split(' b/')
      const filePath = parts[1] || parts[0] || 'Unknown File'
      
      const lines = chunk.split('\n')
      let additions = 0
      let deletions = 0

      lines.forEach(line => {
        if (line.startsWith('+') && !line.startsWith('+++')) additions++
        else if (line.startsWith('-') && !line.startsWith('---')) deletions++
      })

      return {
        path: filePath,
        raw: chunk,
        lines,
        additions,
        deletions
      }
    })
  }, [prDetails?.rawDiff])

  const totalStats = useMemo(() => {
    let additions = 0
    let deletions = 0
    fileDiffs.forEach(f => {
      additions += f.additions
      deletions += f.deletions
    })
    return { additions, deletions }
  }, [fileDiffs])

  const displayedDiffs = selectedFile === 'all'
    ? fileDiffs
    : fileDiffs.filter(f => f.path === selectedFile)

  function handleCopyDiff() {
    if (!prDetails?.rawDiff) return
    navigator.clipboard.writeText(prDetails.rawDiff)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!prDetails?.rawDiff) {
    return (
      <div className="p-6 text-center text-gray-500 space-y-2">
        <span className="text-2xl">📄</span>
        <p className="font-semibold text-xs text-gray-700">No Diff Available</p>
        <p className="text-[11px] text-gray-500">Could not extract diff lines for this PR.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 text-xs text-gray-800">
      {/* Diff Header Bar */}
      <div className="flex items-center justify-between p-2.5 bg-gradient-to-r from-gray-50 to-indigo-50/40 border border-gray-200 rounded-xl shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base">🔀</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-xs">PR Code Diff</span>
              <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 rounded">
                +{totalStats.additions}
              </span>
              <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-rose-100 text-rose-800 rounded">
                -{totalStats.deletions}
              </span>
            </div>
            <p className="text-[10px] text-gray-500 truncate">
              {fileDiffs.length} file{fileDiffs.length !== 1 ? 's' : ''} modified in PR #{prDetails?.prNumber}
            </p>
          </div>
        </div>

        <button
          onClick={handleCopyDiff}
          className="px-2.5 py-1 text-[10.5px] font-semibold bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer shrink-0"
        >
          {copied ? '✓ Copied' : '📋 Copy Diff'}
        </button>
      </div>

      {/* File filter selector */}
      {fileDiffs.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedFile('all')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap transition cursor-pointer ${
              selectedFile === 'all'
                ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Files ({fileDiffs.length})
          </button>
          {fileDiffs.map(f => (
            <button
              key={f.path}
              onClick={() => setSelectedFile(f.path)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono whitespace-nowrap transition flex items-center gap-1 cursor-pointer ${
                selectedFile === f.path
                  ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{f.path.split('/').pop()}</span>
              <span className="text-[9px] opacity-75">
                (+{f.additions}/-{f.deletions})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Diff Code Viewer */}
      <div className="space-y-3 max-h-[460px] overflow-y-auto pr-0.5">
        {displayedDiffs.map((fileDiff, idx) => (
          <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs bg-white">
            {/* File Header */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-gray-900 text-gray-200 text-[11px] font-mono">
              <span className="font-semibold truncate">{fileDiff.path}</span>
              <div className="flex items-center gap-1.5 text-[10px] shrink-0">
                <span className="text-emerald-400 font-bold">+{fileDiff.additions}</span>
                <span className="text-rose-400 font-bold">-{fileDiff.deletions}</span>
              </div>
            </div>

            {/* Code Lines */}
            <div className="font-mono text-[10.5px] leading-relaxed overflow-x-auto bg-slate-950 text-slate-200">
              {fileDiff.lines.map((line, lIdx) => {
                const isAdd = line.startsWith('+') && !line.startsWith('+++')
                const isDel = line.startsWith('-') && !line.startsWith('---')
                const isHunk = line.startsWith('@@')

                let rowBg = 'hover:bg-slate-900/60'
                let textColor = 'text-slate-300'
                let markerBg = ''

                if (isAdd) {
                  rowBg = 'bg-emerald-950/40 hover:bg-emerald-950/60'
                  textColor = 'text-emerald-300'
                  markerBg = 'bg-emerald-500/20'
                } else if (isDel) {
                  rowBg = 'bg-rose-950/40 hover:bg-rose-950/60'
                  textColor = 'text-rose-300'
                  markerBg = 'bg-rose-500/20'
                } else if (isHunk) {
                  rowBg = 'bg-indigo-950/70 text-indigo-300 font-semibold'
                  textColor = 'text-indigo-300'
                }

                return (
                  <div
                    key={lIdx}
                    className={`flex items-start px-2 py-0.5 border-l-2 ${
                      isAdd
                        ? 'border-emerald-500'
                        : isDel
                        ? 'border-rose-500'
                        : isHunk
                        ? 'border-indigo-400'
                        : 'border-transparent'
                    } ${rowBg}`}
                  >
                    <span className="w-8 shrink-0 select-none text-[9.5px] text-slate-500 text-right pr-2">
                      {lIdx + 1}
                    </span>
                    <span className={`w-4 shrink-0 select-none text-center font-bold ${markerBg} ${textColor}`}>
                      {isAdd ? '+' : isDel ? '-' : isHunk ? '@' : ' '}
                    </span>
                    <span className={`pl-2 whitespace-pre break-all ${textColor}`}>
                      {line.slice(isAdd || isDel ? 1 : 0)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
