import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function AuthPanel({ onAuthenticated }) {
  const { signInWithPassword, signUp, error, loading } = useAuth()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [infoMessage, setInfoMessage] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    setInfoMessage(null)

    if (!email.trim() || !password.trim()) {
      setFormError('Email and password are required.')
      return
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.')
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'signin') {
        const result = await signInWithPassword(email.trim(), password)
        if (!result.success) {
          setFormError(result.error)
        } else if (onAuthenticated) {
          onAuthenticated()
        }
      } else {
        const result = await signUp(email.trim(), password)
        if (!result.success) {
          setFormError(result.error)
        } else if (result.needsEmailConfirmation) {
          setInfoMessage('Account created. Check your email to confirm before signing in.')
          setMode('signin')
        } else if (onAuthenticated) {
          onAuthenticated()
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center p-6 text-sm text-gray-500">Loading session...</div>
  }

  return (
    <div className="w-full max-w-sm mx-auto p-4 bg-white rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        {mode === 'signin' ? 'Sign in' : 'Create account'}
      </h2>
      <p className="text-xs text-gray-500 mb-4">
        AI PR Copilot uses your account to store review history and project rules.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="you@company.com"
            disabled={submitting}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="••••••••"
            disabled={submitting}
          />
        </div>

        {(formError || error) && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1.5">
            {formError || error}
          </p>
        )}

        {infoMessage && (
          <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-md px-2 py-1.5">
            {infoMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {submitting ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Sign up'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === 'signin' ? 'signup' : 'signin')
          setFormError(null)
          setInfoMessage(null)
        }}
        className="w-full mt-3 text-xs text-indigo-600 hover:text-indigo-800"
      >
        {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
      </button>
    </div>
  )
}
