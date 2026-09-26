/**
 * GitHub API Service for 1-Click Auto-Committing Fixes & Batch Reviews
 */

const DEFAULT_GITHUB_TOKEN = ''

export async function getGitHubToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['ai-pr-copilot-settings'], (res) => {
      const settings = res['ai-pr-copilot-settings'] || {}
      resolve(settings.githubToken || DEFAULT_GITHUB_TOKEN)
    })
  })
}

export async function saveGitHubToken(githubToken) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['ai-pr-copilot-settings'], (res) => {
      const current = res['ai-pr-copilot-settings'] || {}
      const updated = { ...current, githubToken: githubToken.trim() }
      chrome.storage.local.set({ 'ai-pr-copilot-settings': updated }, () => {
        resolve(updated)
      })
    })
  })
}

/**
 * 1-Click Auto-Commit Code Fixes directly to GitHub PR branch
 */
export async function applyFixesAndCommit({
  repoIdentifier,
  prNumber,
  codeFixes,
  commitMessage,
  onProgress
}) {
  const token = await getGitHubToken()
  if (!token) {
    throw new Error('GITHUB_TOKEN_MISSING')
  }

  const [owner, repo] = repoIdentifier.split('/')
  if (!owner || !repo) {
    throw new Error('Invalid repository identifier.')
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  }

  // 1. Fetch PR details to get branch name
  if (onProgress) onProgress('Fetching PR branch info...')
  const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, { headers })
  if (!prRes.ok) {
    const err = await prRes.json().catch(() => ({}))
    throw new Error(err.message || 'Failed to fetch PR branch details. Check GitHub token permissions.')
  }

  const prData = await prRes.json()
  const branch = prData.head?.ref
  const headRepo = prData.head?.repo?.full_name || repoIdentifier

  if (!branch) {
    throw new Error('Could not determine PR target branch.')
  }

  const committedFiles = []

  // 2. Process each code fix
  for (let i = 0; i < codeFixes.length; i++) {
    const fix = codeFixes[i]
    if (!fix.file || !fix.fixedCode) continue

    if (onProgress) onProgress(`Updating ${fix.file} (${i + 1}/${codeFixes.length})...`)

    // Fetch existing file content & SHA from the PR head repo
    const fileRes = await fetch(
      `https://api.github.com/repos/${headRepo}/contents/${fix.file}?ref=${encodeURIComponent(branch)}`,
      { headers }
    )

    if (!fileRes.ok) {
      const err = await fileRes.json().catch(() => ({}))
      if (fileRes.status === 404) {
        throw new Error(`File '${fix.file}' not found on branch '${branch}'. Ensure you have push write permissions to ${headRepo}.`)
      } else if (fileRes.status === 403) {
        throw new Error(`Permission denied committing to ${headRepo}. Your token needs 'repo' write access or fork permissions.`)
      }
      throw new Error(err.message || `Could not fetch ${fix.file}`)
    }

    const fileData = await fileRes.json()
    const sha = fileData.sha
    const rawContent = decodeBase64Utf8(fileData.content)

    // Replace originalCode with fixedCode
    let updatedContent = rawContent
    const normRaw = rawContent.replace(/\r\n/g, '\n')
    const normOrig = fix.originalCode ? fix.originalCode.trim().replace(/\r\n/g, '\n') : ''
    
    if (normOrig && normRaw.includes(normOrig)) {
      updatedContent = normRaw.replace(normOrig, fix.fixedCode.trim())
    } else if (fix.originalCode && rawContent.includes(fix.originalCode.trim())) {
      updatedContent = rawContent.replace(fix.originalCode.trim(), fix.fixedCode.trim())
    } else {
      // If exact original snippet is not matched, append or patch
      updatedContent = rawContent + '\n\n' + fix.fixedCode.trim()
    }

    // Submit commit for this file
    const commitMsg = commitMessage || `refactor: apply AI fix for ${fix.file}`
    const putRes = await fetch(
      `https://api.github.com/repos/${headRepo}/contents/${fix.file}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: commitMsg,
          content: encodeBase64Utf8(updatedContent),
          sha,
          branch
        })
      }
    )

    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}))
      if (putRes.status === 403) {
        throw new Error(`Write permission denied on branch '${branch}'. You can only commit to branches on repos where you have write access.`)
      }
      throw new Error(`Failed to commit fix for ${fix.file}: ${err.message || putRes.statusText}`)
    }

    const commitResult = await putRes.json()
    committedFiles.push({
      file: fix.file,
      commitUrl: commitResult.commit?.html_url
    })
  }

  if (committedFiles.length === 0) {
    throw new Error('No valid files were updated in this commit.')
  }

  if (onProgress) onProgress('All fixes committed successfully!')

  return {
    success: true,
    branch,
    committedFiles
  }
}

/**
 * 1-Click Post Batch Review Comments on GitHub PR
 */
export async function postBatchReview({ repoIdentifier, prNumber, reviewResult }) {
  const token = await getGitHubToken()
  if (!token) {
    throw new Error('GITHUB_TOKEN_MISSING')
  }

  const [owner, repo] = repoIdentifier.split('/')
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  }

  const bodyContent =
    reviewResult.recommendedReviewComment ||
    `### 🤖 AI PR Review Summary\n\n**Verdict**: ${reviewResult.verdict || 'COMMENT'}\n\n${reviewResult.overview || ''}`

  const event =
    reviewResult.verdict === 'APPROVE'
      ? 'APPROVE'
      : reviewResult.verdict === 'REQUEST_CHANGES'
      ? 'REQUEST_CHANGES'
      : 'COMMENT'

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        body: bodyContent,
        event
      })
    }
  )

  if (!res.ok) {
    // If GitHub rejects APPROVE/REQUEST_CHANGES (e.g. you are the author), fallback to COMMENT
    if (res.status === 422 && event !== 'COMMENT') {
      const retryRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            body: bodyContent,
            event: 'COMMENT'
          })
        }
      )
      
      if (!retryRes.ok) {
        const err = await retryRes.json().catch(() => ({}))
        throw new Error(err.message || 'Failed to post review comment to GitHub.')
      }
      return await retryRes.json()
    }
    
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'Failed to post review comment to GitHub.')
  }

  return await res.json()
}

function decodeBase64Utf8(base64Str) {
  const clean = base64Str.replace(/\n/g, '')
  return decodeURIComponent(
    Array.prototype.map
      .call(atob(clean), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  )
}

function encodeBase64Utf8(str) {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (_match, p1) {
      return String.fromCharCode(parseInt(p1, 16))
    })
  )
}
