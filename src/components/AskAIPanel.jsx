import { useState, useRef, useEffect } from 'react'
import { runAIChat } from '../lib/aiService'

const SUGGESTIONS = [
  'Explain this PR simply.',
  'What is the riskiest part?',
  'Could this cause a race condition?',
  'What should I test manually?',
  'Are there any security issues?',
  'Which file should I review first?',
  'Explain changes to someone new to the repo.',
  'What happens if this API fails?'
]

export default function AskAIPanel({ prDetails, analysisResult, onOpenApiKeyModal }) {
  const [question, setQuestion] = useState('')
  const [chatHistory, setChatHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  async function handleAsk(q) {
    const text = q || question.trim()
    if (!text || !prDetails) return
    setQuestion('')
    setError(null)
    setLoading(true)

    const newUserMsg = { role: 'user', content: text }
    const updatedHistory = [...chatHistory, newUserMsg]
    setChatHistory(updatedHistory)

    try {
      const reply = await runAIChat({
        prDetails,
        question: text,
        chatHistory,
        analysisResult
      })
      setChatHistory([...updatedHistory, { role: 'assistant', content: reply }])
    } catch (err) {
      if (err.message === 'API_KEY_MISSING') {
        onOpenApiKeyModal?.()
        setChatHistory(chatHistory) // revert
        return
      }
      setError(err.message || 'Chat request failed.')
      setChatHistory([...updatedHistory, { role: 'assistant', content: '⚠️ Error: ' + (err.message || 'Request failed.') }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAsk()
    }
  }

  return (
    <div className="flex flex-col h-full text-xs text-gray-800 space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 p-2.5 rounded-lg">
        <span className="text-base">💬</span>
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">Ask AI About This PR</h3>
          <p className="text-[10px] text-gray-500">Questions are answered using the actual PR diff and context.</p>
        </div>
      </div>

      {/* Suggestions (show only when empty) */}
      {chatHistory.length === 0 && !loading && (
        <div className="grid grid-cols-2 gap-1.5">
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => handleAsk(s)}
              className="text-left px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[10px] text-gray-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition leading-snug"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Chat Messages */}
      {chatHistory.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-2 max-h-64 pr-1">
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-xl px-2.5 py-2 text-[11px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-800 border border-gray-200'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 border border-gray-200 rounded-xl px-2.5 py-2 text-[11px] text-gray-500 flex items-center gap-1.5">
                <span className="animate-spin text-xs">🌀</span> Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {error && !loading && (
        <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-700 text-[11px]">
          ❌ {error}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-1.5 pt-1">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about this PR... (Enter to send)"
          rows={2}
          disabled={loading || !prDetails}
          className="flex-1 px-2.5 py-1.5 text-[11px] border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
        />
        <button
          onClick={() => handleAsk()}
          disabled={loading || !question.trim() || !prDetails}
          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-xs rounded-lg transition self-end"
        >
          {loading ? '...' : '↑'}
        </button>
      </div>
    </div>
  )
}
