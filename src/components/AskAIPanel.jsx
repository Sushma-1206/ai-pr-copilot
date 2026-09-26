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

function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="my-2 rounded-lg overflow-hidden border border-gray-800 bg-gray-900 shadow-sm">
      <div className="flex items-center justify-between px-2.5 py-1 bg-gray-950 text-[9px] text-gray-400 border-b border-gray-800">
        <span className="font-mono uppercase tracking-wider">{lang || 'code'}</span>
        <button
          onClick={handleCopy}
          className="hover:text-white transition flex items-center gap-1 cursor-pointer"
        >
          {copied ? '✓ Copied' : '📋 Copy'}
        </button>
      </div>
      <pre className="p-2.5 text-[10.5px] font-mono text-emerald-300 overflow-x-auto whitespace-pre leading-relaxed">
        {code}
      </pre>
    </div>
  )
}

function SectionCard({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="my-1.5 border border-indigo-100/90 rounded-lg overflow-hidden bg-white shadow-2xs">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 bg-indigo-50/40 hover:bg-indigo-50/70 transition text-left cursor-pointer"
      >
        <span className="font-bold text-[11px] text-gray-800 flex items-center gap-1.5">
          <span className="text-[9px] text-indigo-600">▶</span>
          <span>{title}</span>
        </span>
        <span className="text-[10px] text-gray-400 font-bold ml-1">
          {open ? '▴' : '▾'}
        </span>
      </button>
      {open && (
        <div className="p-2.5 pt-2 text-[11px] text-gray-700 space-y-1.5 border-t border-indigo-50">
          {children}
        </div>
      )}
    </div>
  )
}

/**
 * Enhanced markdown renderer for AI chat responses.
 * Handles: headings, bold, italic, inline code, code blocks, tables, lists, line breaks, collapsibles.
 */
function MarkdownMessage({ content }) {
  const lines = content.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <CodeBlock key={i} code={codeLines.join('\n')} lang={lang} />
      )
      i++
      continue
    }

    // Table detection: line has | separators
    if (line.includes('|') && line.trim().startsWith('|')) {
      const tableLines = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      const rows = tableLines.filter(l => !/^\s*\|?[\s\-|:]+\|?\s*$/.test(l))
      if (rows.length > 0) {
        const parseRow = (row) =>
          row.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)

        const headers = parseRow(rows[0])
        const dataRows = rows.slice(1)

        elements.push(
          <div key={i} className="overflow-x-auto my-1.5 rounded-lg border border-gray-200 shadow-2xs">
            <table className="w-full text-[10px] border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  {headers.map((h, hi) => (
                    <th key={hi} className="px-2 py-1 text-left font-semibold text-gray-700 border-b border-gray-200">
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {parseRow(row).map((cell, ci) => (
                      <td key={ci} className="px-2 py-1 text-gray-700 border-b border-gray-100 align-top">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      continue
    }

    // Headings
    if (line.startsWith('### ') || line.startsWith('## ') || line.startsWith('# ')) {
      const headingText = line.replace(/^#+\s*/, '')
      elements.push(
        <div key={i} className="flex items-center gap-1.5 pt-2 pb-0.5 border-b border-gray-100">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          <h4 className="font-bold text-[11.5px] text-gray-900 tracking-tight">
            {renderInline(headingText)}
          </h4>
        </div>
      )
      i++; continue
    }

    // Unordered list item
    if (/^[-*+] /.test(line)) {
      const listItems = []
      while (i < lines.length && /^[-*+] /.test(lines[i])) {
        listItems.push(lines[i].slice(2))
        i++
      }
      elements.push(
        <ul key={i} className="my-1.5 space-y-1 pl-1">
          {listItems.map((item, li) => (
            <li key={li} className="flex items-start gap-1.5 text-[11px] text-gray-700 leading-snug">
              <span className="text-indigo-500 mt-1 shrink-0 text-[8px]">●</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Ordered list item
    if (/^\d+\. /.test(line)) {
      const listItems = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        listItems.push(lines[i].replace(/^\d+\. /, ''))
        i++
      }
      elements.push(
        <ol key={i} className="my-1.5 space-y-1 pl-1">
          {listItems.map((item, li) => (
            <li key={li} className="flex items-start gap-1.5 text-[11px] text-gray-700 leading-snug">
              <span className="text-indigo-600 font-bold shrink-0 text-[10px] w-4">{li + 1}.</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      )
      continue
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      elements.push(<hr key={i} className="border-gray-200 my-2" />)
      i++; continue
    }

    // Blank line
    if (line.trim() === '') {
      elements.push(<div key={i} className="h-1" />)
      i++; continue
    }

    // Normal paragraph
    elements.push(
      <p key={i} className="text-[11px] text-gray-700 leading-relaxed">
        {renderInline(line)}
      </p>
    )
    i++
  }

  return <div className="space-y-0.5">{elements}</div>
}

/**
 * Render inline markdown: **bold**, *italic*, `code`, ~~strikethrough~~
 */
function renderInline(text) {
  if (!text) return null

  // Split by inline patterns and rebuild as React elements
  const parts = []
  let remaining = text
  let key = 0

  // Process inline patterns in order
  const inlinePatterns = [
    { regex: /`([^`]+)`/g, render: (m, g) => <code key={key++} className="bg-gray-200 text-gray-800 px-1 py-0.5 rounded text-[10px] font-mono">{g}</code> },
    { regex: /\*\*([^*]+)\*\*/g, render: (m, g) => <strong key={key++} className="font-semibold text-gray-900">{g}</strong> },
    { regex: /\*([^*]+)\*/g, render: (m, g) => <em key={key++} className="italic">{g}</em> },
    { regex: /~~([^~]+)~~/g, render: (m, g) => <del key={key++} className="line-through text-gray-400">{g}</del> },
  ]

  // Use a simple token-based approach for inline rendering
  // We'll split on the combined pattern and reassemble
  const combinedRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~)/g
  const tokens = text.split(combinedRegex)

  return tokens.map((token, idx) => {
    if (token.startsWith('**') && token.endsWith('**')) {
      return <strong key={idx} className="font-semibold text-gray-900">{token.slice(2, -2)}</strong>
    }
    if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      return <em key={idx} className="italic">{token.slice(1, -1)}</em>
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      return <code key={idx} className="bg-gray-200 text-indigo-700 px-1 py-0.5 rounded text-[10px] font-mono">{token.slice(1, -1)}</code>
    }
    if (token.startsWith('~~') && token.endsWith('~~')) {
      return <del key={idx} className="line-through text-gray-400">{token.slice(2, -2)}</del>
    }
    return token
  })
}

export default function AskAIPanel({ prDetails, analysisResult, onOpenApiKeyModal, initialPrompt, onClearInitialPrompt }) {
  const [question, setQuestion] = useState('')
  const [chatHistory, setChatHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  useEffect(() => {
    if (initialPrompt && prDetails) {
      handleAsk(initialPrompt)
      onClearInitialPrompt?.()
    }
  }, [initialPrompt, prDetails])

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
        setChatHistory(chatHistory)
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

      {/* Suggestions (show only when chat is empty) */}
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
        <div className="flex-1 overflow-y-auto space-y-3 max-h-72 pr-0.5">
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'user' ? (
                /* User bubble — plain text is fine */
                <div className="max-w-[85%] rounded-xl px-3 py-2 text-[11px] leading-relaxed bg-indigo-600 text-white">
                  {msg.content}
                </div>
              ) : (
                /* AI bubble — rendered markdown */
                <div className="max-w-[95%] rounded-xl px-3 py-2.5 bg-white border border-gray-200 shadow-sm">
                  <MarkdownMessage content={msg.content} />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-[11px] text-gray-400 flex items-center gap-1.5 shadow-sm">
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
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-xs rounded-lg transition self-end"
        >
          {loading ? '...' : '↑'}
        </button>
      </div>
    </div>
  )
}
