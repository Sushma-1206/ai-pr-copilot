import { useState, useEffect } from 'react'
import { getProjectRules, addProjectRule, deleteProjectRule } from '../lib/rulesService'

export default function RulesPanel({ repoIdentifier }) {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [newRule, setNewRule] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadRules()
  }, [repoIdentifier])

  async function loadRules() {
    if (!repoIdentifier) return
    setLoading(true)
    setError(null)
    try {
      const data = await getProjectRules(repoIdentifier)
      setRules(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddRule(e) {
    e.preventDefault()
    if (!newRule.trim()) return
    setAdding(true)
    setError(null)
    try {
      const added = await addProjectRule(repoIdentifier, newRule)
      if (added) {
        setRules([added, ...rules])
        setNewRule('')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  async function handleDeleteRule(id) {
    try {
      await deleteProjectRule(id)
      setRules(rules.filter((r) => r.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-4 text-sm text-gray-800">
      <div>
        <h3 className="font-semibold text-gray-900 text-base flex items-center gap-1.5">
          <span>⚙️</span> Repository Custom Rules
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Rules defined here will be enforced during AI reviews for <span className="font-mono text-indigo-600 font-medium">{repoIdentifier || 'this repo'}</span>.
        </p>
      </div>

      {error && (
        <div className="p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleAddRule} className="flex gap-2">
        <input
          type="text"
          value={newRule}
          onChange={(e) => setNewRule(e.target.value)}
          placeholder="e.g. Always use TypeScript or handle errors explicitly..."
          className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
          disabled={adding}
        />
        <button
          type="submit"
          disabled={adding || !newRule.trim()}
          className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-md transition"
        >
          {adding ? 'Adding...' : 'Add Rule'}
        </button>
      </form>

      {loading ? (
        <div className="text-center py-6 text-xs text-gray-400">Loading custom rules...</div>
      ) : rules.length === 0 ? (
        <div className="text-center py-6 text-xs text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-md">
          No custom rules set for this repo yet.
        </div>
      ) : (
        <ul className="space-y-2 max-h-56 overflow-y-auto">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="flex items-start justify-between gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-md text-xs"
            >
              <span className="text-gray-700 leading-relaxed flex-1">📌 {rule.rule_text}</span>
              <button
                onClick={() => handleDeleteRule(rule.id)}
                className="text-gray-400 hover:text-red-600 transition"
                title="Delete rule"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
