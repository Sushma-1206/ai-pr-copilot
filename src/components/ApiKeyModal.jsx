import { useState, useEffect } from 'react'
import { getAISettings, saveAISettings } from '../lib/aiService'

const DEFAULT_GROQ_API_KEY = ''
const DEFAULT_GITHUB_TOKEN = ''

export default function ApiKeyModal({ isOpen, onClose, onSaveSuccess }) {
  const [apiKey, setApiKey] = useState('')
  const [githubToken, setGithubToken] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      getAISettings().then((s) => {
        setApiKey(s.groqApiKey || s.geminiApiKey || DEFAULT_GROQ_API_KEY)
        setGithubToken(s.githubToken || DEFAULT_GITHUB_TOKEN)
      })
    }
  }, [isOpen])

  if (!isOpen) return null

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await saveAISettings({
        groqApiKey: apiKey.trim(),
        githubToken: githubToken.trim()
      })
      if (onSaveSuccess) onSaveSuccess()
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4 space-y-3 text-xs text-gray-800">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
            <span>⚙️</span> API & Integration Settings
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">
              ⚡ Groq API Key (Pre-configured)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-0.5">
              🐙 GitHub Access Token (Pre-configured)
            </label>
            <p className="text-[10px] text-gray-500 mb-1">
              Grants permission to commit AI fixes directly to your PR branch (requires <code className="bg-gray-100 px-1 py-0.5 rounded">repo</code> scope).
            </p>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_... or github_pat_..."
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !apiKey.trim()}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-md"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
