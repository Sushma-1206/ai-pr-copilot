import { useState, useEffect } from 'react'
import IssueCard from './IssueCard'
import FixConfirmation from './FixConfirmation'
import ReadinessScore from './ReadinessScore'
import { postBatchReview, applyFixesAndCommit, getGitHubToken } from '../lib/githubService'

/* ── Lightweight Markdown renderer ──────────────────────────────── */
function renderInline(text) {
  if (!text) return null
  const combinedRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~)/g
  return text.split(combinedRegex).map((token, idx) => {
    if (token.startsWith('**') && token.endsWith('**'))
      return <strong key={idx} className="font-semibold">{token.slice(2, -2)}</strong>
    if (token.startsWith('*') && token.endsWith('*') && token.length > 2)
      return <em key={idx} className="italic">{token.slice(1, -1)}</em>
    if (token.startsWith('`') && token.endsWith('`'))
      return <code key={idx} className="bg-gray-200 text-indigo-700 px-1 py-0.5 rounded text-[10px] font-mono">{token.slice(1, -1)}</code>
    if (token.startsWith('~~') && token.endsWith('~~'))
      return <del key={idx} className="line-through text-gray-400">{token.slice(2, -2)}</del>
    return token
  })
}

function MarkdownText({ content }) {
  if (!content) return null
  const lines = content.split('\n')
  const elements = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('### ')) { elements.push(<p key={i} className="font-bold text-[11px] text-gray-900 mt-2 mb-0.5">{renderInline(line.slice(4))}</p>); i++; continue }
    if (line.startsWith('## '))  { elements.push(<p key={i} className="font-bold text-[12px] text-gray-900 mt-2 mb-1">{renderInline(line.slice(3))}</p>); i++; continue }
    if (line.startsWith('# '))   { elements.push(<p key={i} className="font-extrabold text-[13px] text-gray-900 mt-2 mb-1">{renderInline(line.slice(2))}</p>); i++; continue }
    if (/^[-*+] /.test(line)) {
      const items = []
      while (i < lines.length && /^[-*+] /.test(lines[i])) { items.push(lines[i].slice(2)); i++ }
      elements.push(
        <ul key={i} className="my-1 space-y-0.5 pl-3">
          {items.map((item, li) => <li key={li} className="flex items-start gap-1.5 text-[11px] text-gray-700"><span className="text-indigo-400 mt-0.5 shrink-0">•</span><span>{renderInline(item)}</span></li>)}
        </ul>
      ); continue
    }
    if (/^\d+\. /.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(lines[i].replace(/^\d+\. /, '')); i++ }
      elements.push(
        <ol key={i} className="my-1 space-y-0.5 pl-3">
          {items.map((item, li) => <li key={li} className="flex items-start gap-1.5 text-[11px] text-gray-700"><span className="text-indigo-500 font-semibold shrink-0">{li + 1}.</span><span>{renderInline(item)}</span></li>)}
        </ol>
      ); continue
    }
    if (line.trim() === '') { elements.push(<div key={i} className="h-1.5" />); i++; continue }
    elements.push(<p key={i} className="text-[11px] text-gray-700 leading-relaxed">{renderInline(line)}</p>)
    i++
  }
  return <div className="space-y-0.5">{elements}</div>
}
/* ────────────────────────────────────────────────────────────────── */

export default function ReviewerPanel({
  prDetails,
  onRunCheck,
  loading,
  reviewResult,
  error,
  onOpenApiKeyModal,
  onReAnalyze,   // called after commits to refresh readiness score
  tokenRefreshKey  // incremented by parent when API settings are saved
}) {
  const [posting, setPosting] = useState(false)
  const [postSuccess, setPostSuccess] = useState(false)
  const [postError, setPostError] = useState(null)
  const [editComment, setEditComment] = useState(false)
  const [reviewComment, setReviewComment] = useState('')
  const [activeFix, setActiveFix] = useState(null)
  const [copied, setCopied] = useState(false)
  const [hasToken, setHasToken] = useState(null) // null=checking, true/false

  // Commit state
  const [committing, setCommitting] = useState(false)
  const [commitProgress, setCommitProgress] = useState('')
  const [commitSuccess, setCommitSuccess] = useState(null)
  const [commitError, setCommitError] = useState(null)
  const [fixesToCommit, setFixesToCommit] = useState([])
  const [showCommitPanel, setShowCommitPanel] = useState(false)

  // Re-check GitHub token presence on mount and whenever settings are saved
  useEffect(() => {
    getGitHubToken().then(token => setHasToken(!!token))
  }, [tokenRefreshKey])

  const verdict = reviewResult?.verdict
  const verdictStyle =
    verdict === 'APPROVE' ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
    : verdict === 'REQUEST_CHANGES' ? 'bg-rose-100 text-rose-800 border-rose-300'
    : 'bg-indigo-100 text-indigo-800 border-indigo-300'

  const actionableIssues = (reviewResult?.issues || []).filter(i => i.file && i.suggestedFix)

  async function handlePostReview() {
    if (!reviewResult || !prDetails) return

    // Check token first — show immediate clear message
    const token = await getGitHubToken()
    if (!token) {
      setPostError('GITHUB_TOKEN_MISSING')
      return
    }

    const body = editComment ? reviewComment : reviewResult.recommendedReviewComment
    setPosting(true)
    setPostError(null)
    setPostSuccess(false)
    try {
      await postBatchReview({
        repoIdentifier: prDetails.repoIdentifier,
        prNumber: prDetails.prNumber,
        reviewResult: { ...reviewResult, recommendedReviewComment: body }
      })
      setPostSuccess(true)
    } catch (err) {
      setPostError(err.message === 'GITHUB_TOKEN_MISSING' ? 'GITHUB_TOKEN_MISSING' : (err.message || 'Failed to post review.'))
    } finally {
      setPosting(false)
    }
  }

  async function handleCommitFixes() {
    if (!prDetails || fixesToCommit.length === 0) return

    // Check token first
    const token = await getGitHubToken()
    if (!token) {
      setCommitError('GitHub token required. Click ⚙️ Settings → configure your GitHub Personal Access Token (needs repo scope).')
      return
    }

    setCommitting(true)
    setCommitError(null)
    setCommitSuccess(null)

    const fixes = fixesToCommit.map(issue => ({
      file: issue.file,
      issueTitle: issue.title,
      originalCode: '',
      fixedCode: issue.suggestedFix,
      description: issue.explanation
    }))

    try {
      const res = await applyFixesAndCommit({
        repoIdentifier: prDetails.repoIdentifier,
        prNumber: prDetails.prNumber,
        codeFixes: fixes,
        commitMessage: `fix: apply AI reviewer suggestions (${fixes.length} fix${fixes.length > 1 ? 'es' : ''})`,
        onProgress: (p) => setCommitProgress(p)
      })
      setCommitSuccess(`✅ ${res.committedFiles.length} fix(es) committed to '${res.branch}'! Re-analyzing PR to update score...`)
      setFixesToCommit([])
      setShowCommitPanel(false)

      // Auto re-analyze after 1.5s to update readiness score
      setTimeout(() => {
        onReAnalyze?.()
      }, 1500)

    } catch (err) {
      setCommitError(err.message === 'GITHUB_TOKEN_MISSING'
        ? 'GitHub token required. Click 🔑 in the header → configure your Personal Access Token.'
        : (err.message || 'Commit failed.'))
    } finally {
      setCommitting(false)
      setCommitProgress('')
    }
  }

  function toggleFixToCommit(issue) {
    setFixesToCommit(prev =>
      prev.some(f => (f.id && f.id === issue.id) || f.title === issue.title)
        ? prev.filter(f => !((f.id && f.id === issue.id) || f.title === issue.title))
        : [...prev, issue]
    )
  }

  function handleCopyComment() {
    const body = reviewResult?.recommendedReviewComment
    if (body) { navigator.clipboard.writeText(body); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  // Token missing warning banner (shown prominently when token not set)
  const TokenWarning = () => (
    <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-[11px] space-y-1.5">
      <p className="font-semibold">⚠️ GitHub Token Not Configured</p>
      <p className="leading-relaxed">Posting reviews and committing fixes requires a GitHub Personal Access Token with <code className="bg-amber-100 px-1 rounded">repo</code> scope.</p>
      <button
        onClick={onOpenApiKeyModal}
        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded text-[10px] transition"
      >
        🔑 Configure GitHub Token
      </button>
    </div>
  )

  return (
    <div className="space-y-3 text-xs text-gray-800">
      {/* Header & Run */}
      <div className="flex items-center justify-between bg-purple-50 border border-purple-100 p-3 rounded-lg">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
            <span>📋</span> Reviewer Mode
          </h3>
          <p className="text-[11px] text-gray-600 mt-0.5">
            {prDetails?.filesCount ? `${prDetails.filesCount} file(s) under review` : 'Reading PR diff...'}
          </p>
        </div>
        <button
          onClick={onRunCheck}
          disabled={loading || posting}
          className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow transition flex items-center gap-1.5"
        >
          {loading ? <><span className="animate-spin">🌀</span><span>Analyzing...</span></> : <><span>📋</span><span>{reviewResult ? 'Re-run' : 'Generate Summary'}</span></>}
        </button>
      </div>

      {/* Token missing — show upfront */}
      {hasToken === false && <TokenWarning />}

      {/* AI errors */}
      {error === 'API_KEY_MISSING' && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 space-y-1.5">
          <p className="font-semibold">⚠️ Groq API Key Required</p>
          <button onClick={onOpenApiKeyModal} className="px-3 py-1 bg-amber-600 text-white rounded text-[11px]">Configure API Key</button>
        </div>
      )}
      {error && error !== 'API_KEY_MISSING' && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700">❌ {error}</div>
      )}

      {loading && (
        <div className="space-y-2 animate-pulse">
          <div className="h-16 bg-gray-100 rounded-lg" />
          <div className="h-10 bg-gray-100 rounded-lg" />
          <div className="h-24 bg-gray-100 rounded-lg" />
        </div>
      )}

      {!loading && reviewResult && (
        <div className="space-y-3">
          {/* Score + Verdict */}
          <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-sm space-y-2">
            <ReadinessScore score={reviewResult.readinessScore} riskLevel={reviewResult.riskLevel} />
            {verdict && (
              <div className={`p-2 border rounded-lg flex items-center justify-between ${verdictStyle}`}>
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-wider">Recommended Verdict</span>
                  <p className="text-sm font-bold uppercase">{verdict.replace('_', ' ')}</p>
                </div>
                <span className="text-xl">{verdict === 'APPROVE' ? '✅' : verdict === 'REQUEST_CHANGES' ? '❌' : '💬'}</span>
              </div>
            )}
          </div>

          {/* Review Priority */}
          {reviewResult.reviewPriority?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-gray-600 uppercase">Review Priority</p>
              {reviewResult.reviewPriority.map((item, i) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="text-xs font-bold text-amber-600 shrink-0">{i + 1}.</span>
                  <div>
                    <p className="text-[10px] font-mono text-indigo-700 font-medium">{item.file}</p>
                    {item.reason && <p className="text-[10px] text-amber-800">{item.reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Overview */}
          {(reviewResult.overview || reviewResult.summary) && (
            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Executive Overview</p>
              <MarkdownText content={reviewResult.overview || reviewResult.summary} />
            </div>
          )}

          {/* Issues */}
          {reviewResult.issues?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-gray-600 uppercase">Issues ({reviewResult.issues.length})</p>
              {reviewResult.issues.slice(0, 5).map((issue, i) => (
                <IssueCard key={issue.id || i} issue={issue} onFixThis={(iss) => setActiveFix(iss)} />
              ))}
            </div>
          )}

          {/* Breaking Changes */}
          {reviewResult.breakingChanges?.length > 0 && (
            <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-lg space-y-1">
              <p className="text-[10px] font-bold text-orange-800 uppercase">💥 Breaking Changes</p>
              {reviewResult.breakingChanges.map((bc, i) => {
                const c = typeof bc === 'string' ? { title: bc } : bc
                return <p key={i} className="text-[11px] text-orange-800">• {c.title}</p>
              })}
            </div>
          )}

          {/* Security */}
          {reviewResult.securityFindings?.length > 0 && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg space-y-1">
              <p className="text-[10px] font-bold text-red-800 uppercase">🔒 Security</p>
              {reviewResult.securityFindings.map((f, i) => (
                <p key={i} className="text-[11px] text-red-800">• [{f.severity}] {f.title}</p>
              ))}
            </div>
          )}

          {/* Questions for Author */}
          {reviewResult.targetedQuestions?.length > 0 && (
            <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg space-y-1">
              <p className="text-[10px] font-bold text-purple-800 uppercase">❓ Questions for Author</p>
              {reviewResult.targetedQuestions.map((q, i) => (
                <p key={i} className="text-[11px] text-purple-800">• {q}</p>
              ))}
            </div>
          )}

          {/* ── Review Comment + Post ─────────────────── */}
          {reviewResult.recommendedReviewComment && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gray-600 uppercase">Suggested Review Comment</p>
              {editComment ? (
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={6}
                  className="w-full px-2.5 py-1.5 text-[11px] border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              ) : (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg max-h-44 overflow-y-auto">
                  <MarkdownText content={reviewResult.recommendedReviewComment} />
                </div>
              )}

              {/* Action buttons row */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => { if (!editComment) setReviewComment(reviewResult.recommendedReviewComment); setEditComment(!editComment) }}
                  className="px-2.5 py-1.5 border border-gray-200 rounded text-[10px] text-gray-700 hover:bg-gray-50"
                >
                  {editComment ? '👁 Preview' : '✏️ Edit'}
                </button>
                <button onClick={handleCopyComment} className="px-2.5 py-1.5 border border-gray-200 rounded text-[10px] text-gray-700 hover:bg-gray-50">
                  {copied ? '✓ Copied' : '📋 Copy'}
                </button>
                <button
                  onClick={handlePostReview}
                  disabled={posting || hasToken === false}
                  className={`flex-1 py-1.5 font-semibold text-[10px] rounded transition flex items-center justify-center gap-1 ${
                    hasToken === false
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-700 hover:bg-purple-800 text-white'
                  }`}
                  title={hasToken === false ? 'Configure GitHub token first' : 'Post review comment to GitHub'}
                >
                  {posting ? '🌀 Posting...' : hasToken === false ? '🔒 Token Required' : '💬 Post to GitHub'}
                </button>
              </div>

              {/* Post result banners — shown right below the buttons */}
              {postSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] font-medium">
                  ✅ Review comment posted to GitHub PR!
                </div>
              )}
              {postError === 'GITHUB_TOKEN_MISSING' && (
                <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-[11px] space-y-1.5">
                  <p className="font-semibold">⚠️ GitHub Token Not Configured</p>
                  <p>A Personal Access Token with <code className="bg-amber-100 px-1 rounded">repo</code> scope is needed to post reviews.</p>
                  <button onClick={onOpenApiKeyModal} className="px-2.5 py-1 bg-amber-700 text-white font-medium rounded text-[10px]">
                    🔑 Configure Token
                  </button>
                </div>
              )}
              {postError && postError !== 'GITHUB_TOKEN_MISSING' && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[11px]">
                  ❌ {postError}
                </div>
              )}
            </div>
          )}

          {/* ── Apply & Commit Panel ─────────────────── */}
          {actionableIssues.length > 0 && (
            <div className="border border-indigo-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowCommitPanel(!showCommitPanel)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 transition"
              >
                <div className="flex items-center gap-2">
                  <span>🚀</span>
                  <div className="text-left">
                    <p className="text-[11px] font-semibold text-indigo-900">Apply & Commit AI Fixes</p>
                    <p className="text-[10px] text-indigo-600">
                      {actionableIssues.length} fix(es) available • Score updates automatically after commit
                    </p>
                  </div>
                </div>
                <span className="text-indigo-500 text-xs">{showCommitPanel ? '▲' : '▼'}</span>
              </button>

              {showCommitPanel && (
                <div className="p-3 space-y-2.5 bg-white">
                  {hasToken === false && <TokenWarning />}

                  <p className="text-[10px] text-gray-500">
                    Select fixes to commit. After committing, the PR readiness score updates automatically.
                  </p>

                  {actionableIssues.map((issue, i) => (
                    <label key={issue.id || i} className="flex items-start gap-2 cursor-pointer group p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-indigo-100">
                      <input
                        type="checkbox"
                        checked={fixesToCommit.some(f => (f.id && f.id === issue.id) || f.title === issue.title)}
                        onChange={() => toggleFixToCommit(issue)}
                        className="mt-0.5 accent-indigo-600"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-gray-800 group-hover:text-indigo-700">{issue.title}</p>
                        <p className="text-[10px] font-mono text-gray-500 truncate">{issue.file}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{issue.suggestedFix?.substring(0, 80)}...</p>
                      </div>
                    </label>
                  ))}

                  {commitSuccess && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] font-medium">
                      {commitSuccess}
                    </div>
                  )}
                  {commitError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[11px]">
                      ❌ {commitError}
                    </div>
                  )}

                  <button
                    onClick={handleCommitFixes}
                    disabled={committing || fixesToCommit.length === 0 || hasToken === false}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1.5"
                    title={hasToken === false ? 'Configure GitHub token first' : ''}
                  >
                    {committing ? (
                      <><span className="animate-spin">🌀</span><span>{commitProgress || 'Committing...'}</span></>
                    ) : hasToken === false ? (
                      <><span>🔒</span><span>Token Required</span></>
                    ) : (
                      <><span>🚀</span><span>Commit {fixesToCommit.length > 0 ? `${fixesToCommit.length} Fix${fixesToCommit.length > 1 ? 'es' : ''} → Update Score` : 'Selected Fixes'}</span></>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Architectural impact */}
          {reviewResult.architecturalImpact && (
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-[10px] font-semibold text-blue-900 mb-1">Architectural Impact</p>
              <MarkdownText content={reviewResult.architecturalImpact} />
            </div>
          )}
        </div>
      )}

      {activeFix && (
        <FixConfirmation
          issue={activeFix}
          prDetails={prDetails}
          onClose={() => setActiveFix(null)}
          onApplied={() => { setActiveFix(null); setTimeout(() => onReAnalyze?.(), 1500) }}
          onOpenApiKeyModal={onOpenApiKeyModal}
        />
      )}
    </div>
  )
}
