import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function AuthPanel({ onAuthenticated }) {
  const { signInWithGoogle, signInWithPassword, signUp, error, loading } = useAuth()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [infoMessage, setInfoMessage] = useState(null)

  const handleGoogleSignIn = async () => {
    setFormError(null)
    setInfoMessage(null)
    setSubmitting(true)

    try {
      const result = await signInWithGoogle()
      if (!result.success) {
        setFormError(result.error)
      } else if (onAuthenticated) {
        onAuthenticated()
      }
    } finally {
      setSubmitting(false)
    }
  }

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

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4">
          <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.3h5.4a4.6 4.6 0 0 1-2 3v2.8h3.3c1.9-1.8 2.9-4.4 2.9-7.9Z" />
          <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.8c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.9A10 10 0 0 0 12 22Z" />
          <path fill="#FBBC05" d="M6.4 13.7A6 6 0 0 1 6.1 12c0-.6.1-1.2.3-1.7V7.4H3A10 10 0 0 0 2 12c0 1.7.4 3.2 1 4.6l3.4-2.9Z" />
          <path fill="#EA4335" d="M12 6.2c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9 5.4l3.4 2.9A6 6 0 0 1 12 6.2Z" />
        </svg>
        {submitting ? 'Opening Google...' : 'Sign in with Google'}
      </button>

      <div className="flex items-center gap-3 my-4" aria-hidden="true">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-[10px] uppercase tracking-wide text-gray-400">or use email</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

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
