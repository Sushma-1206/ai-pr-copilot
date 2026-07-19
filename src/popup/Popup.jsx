import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import AuthPanel from '../components/AuthPanel'
import ApiKeyModal from '../components/ApiKeyModal'

export default function Popup() {
  const { isAuthenticated, user, loading, signOut } = useAuth()
  const [showKeyModal, setShowKeyModal] = useState(false)

  return (
    <div className="p-4 bg-gray-50 min-h-[240px] w-80 text-xs font-sans">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <h1 className="text-sm font-bold text-gray-900">AI PR Copilot</h1>
        </div>
        <button
          onClick={() => setShowKeyModal(true)}
          className="text-xs text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-2 py-1 rounded shadow-sm transition"
        >
          ⚙️ API Key
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500 text-center py-8">Loading session...</div>
      ) : isAuthenticated ? (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">👤</span>
            <div>
              <p className="text-xs font-semibold text-gray-900">{user.email}</p>
              <span className="text-[10px] text-emerald-600 font-medium">Session Active</span>
            </div>
          </div>

          <p className="text-[11px] text-gray-500 leading-relaxed border-t pt-2">
            Open any GitHub or GitLab pull request page to view AI reviews, custom rules, and audit logs.
          </p>

          <button
            onClick={signOut}
            className="w-full py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition"
          >
            Sign out
          </button>
        </div>
      ) : (
        <AuthPanel />
      )}

      <ApiKeyModal isOpen={showKeyModal} onClose={() => setShowKeyModal(false)} />
    </div>
  )
}
