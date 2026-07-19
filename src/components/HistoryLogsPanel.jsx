import { useState, useEffect } from 'react'
import { getReviewLogs } from '../lib/rulesService'

export default function HistoryLogsPanel({ repoIdentifier }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    loadLogs()
  }, [repoIdentifier])

  async function loadLogs() {
    if (!repoIdentifier) return
    setLoading(true)
    try {
      const data = await getReviewLogs(repoIdentifier)
      setLogs(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3 text-sm text-gray-800">
      <div>
        <h3 className="font-semibold text-gray-900 text-base flex items-center gap-1.5">
          <span>📜</span> Review Audit Logs
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Recent AI checks saved in Supabase for <span className="font-mono text-indigo-600 font-medium">{repoIdentifier}</span>.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-6 text-xs text-gray-400">Loading audit history...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-6 text-xs text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-md">
          No past review logs found for this repository.
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {logs.map((log) => {
            const isExpanded = expandedId === log.id
            const dateStr = new Date(log.created_at).toLocaleString()

            return (
              <div
                key={log.id}
                className="border border-gray-200 rounded-md bg-white overflow-hidden text-xs"
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  className="flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 cursor-pointer transition"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded font-semibold uppercase text-[10px] ${
                        log.mode === 'developer'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {log.mode}
                    </span>
                    <span className="text-gray-700 font-medium truncate max-w-[150px]">
                      {log.summary}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400">{dateStr}</span>
                </div>

                {isExpanded && (
                  <div className="p-3 bg-white border-t border-gray-200 space-y-2">
                    <p className="text-gray-800 font-medium">{log.summary}</p>
                    {log.raw_response && (
                      <pre className="p-2 bg-gray-900 text-green-400 rounded text-[11px] overflow-x-auto max-h-40">
                        {JSON.stringify(log.raw_response, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
