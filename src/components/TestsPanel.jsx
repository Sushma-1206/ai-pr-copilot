import { useState } from 'react'
import { runAITestGeneration } from '../lib/aiService'

export default function TestsPanel({ prDetails, reviewResult, onOpenApiKeyModal }) {
  const [generating, setGenerating] = useState(false)
  const [generatedTests, setGeneratedTests] = useState(null)
  const [error, setError] = useState(null)
  const [copiedIdx, setCopiedIdx] = useState(null)

  const missingTests = reviewResult?.testAnalysis?.missingTests || []
  const existingTests = reviewResult?.testAnalysis?.existingTests || []

  async function handleGenerate() {
    if (!prDetails) return
    setGenerating(true)
    setError(null)
    try {
      const result = await runAITestGeneration({ prDetails })
      setGeneratedTests(result)
    } catch (err) {
      if (err.message === 'API_KEY_MISSING') {
        onOpenApiKeyModal?.()
        return
      }
      setError(err.message || 'Failed to generate tests.')
    } finally {
      setGenerating(false)
    }
  }

  function handleCopy(code, idx) {
    navigator.clipboard.writeText(code)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  return (
    <div className="space-y-3 text-xs text-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between bg-blue-50 border border-blue-100 p-3 rounded-lg">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
            <span>🧪</span> Test Coverage Analysis
          </h3>
          <p className="text-[11px] text-gray-600 mt-0.5">
            {prDetails?.filesCount ? `${prDetails.filesCount} file(s) changed` : 'Extracting PR diff...'}
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating || !prDetails}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-md shadow transition flex items-center gap-1.5"
        >
          {generating ? (
            <><span className="animate-spin">🌀</span><span>Generating...</span></>
          ) : (
            <><span>✨</span><span>Generate Tests</span></>
          )}
        </button>
      </div>

      {error && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-md text-rose-700">
          ❌ {error}
        </div>
      )}

      {/* No analysis yet */}
      {!reviewResult && !generatedTests && !generating && (
        <div className="text-center py-8 text-gray-400 text-xs space-y-2">
          <p className="text-2xl">🧪</p>
          <p>Run an analysis first to see test coverage insights, then generate tests.</p>
        </div>
      )}

      {/* Analysis results: existing + missing */}
      {reviewResult && (
        <div className="space-y-2">
          {existingTests.length > 0 && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-[10px] font-bold text-emerald-800 uppercase mb-1">✓ Existing Test Coverage</p>
              <ul className="space-y-0.5">
                {existingTests.map((t, i) => (
                  <li key={i} className="text-[11px] text-emerald-700 flex items-start gap-1">
                    <span>•</span><span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {missingTests.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-gray-600 uppercase">Missing Tests</p>
              {missingTests.map((test, i) => {
                const sev = (test.severity || 'MEDIUM').toUpperCase()
                const sevConfig = {
                  HIGH: 'bg-orange-100 text-orange-700',
                  MEDIUM: 'bg-amber-100 text-amber-700',
                  LOW: 'bg-blue-100 text-blue-700'
                }[sev] || 'bg-gray-100 text-gray-600'

                return (
                  <div key={i} className="flex items-start gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${sevConfig}`}>
                      {sev}
                    </span>
                    <p className="text-[11px] text-gray-700">{test.description}</p>
                  </div>
                )
              })}
            </div>
          )}

          {existingTests.length === 0 && missingTests.length === 0 && (
            <div className="text-center py-4 text-gray-400 text-xs">
              No test coverage data in analysis. Re-run analysis to detect.
            </div>
          )}
        </div>
      )}

      {/* Generated tests */}
      {generatedTests && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-600 uppercase">Generated Tests</span>
            <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-semibold rounded uppercase">
              {generatedTests.framework}
            </span>
          </div>

          {generatedTests.summary && (
            <p className="text-[11px] text-gray-600">{generatedTests.summary}</p>
          )}

          {generatedTests.testFiles?.map((file, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-gray-50 border-b border-gray-200">
                <div>
                  <p className="text-[10px] font-mono text-indigo-700 font-medium">{file.filename}</p>
                  {file.description && (
                    <p className="text-[10px] text-gray-500">{file.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleCopy(file.code, idx)}
                  className="px-2 py-0.5 text-[10px] bg-indigo-600 text-white rounded hover:bg-indigo-700 transition shrink-0 ml-2"
                >
                  {copiedIdx === idx ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <pre className="p-2.5 text-[10px] font-mono bg-gray-900 text-green-400 overflow-x-auto max-h-48 whitespace-pre">
                {file.code}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
