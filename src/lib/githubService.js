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
 * Route GitHub API requests through the background service worker to bypass webpage CORS/CSP
 */
export async function githubApiRequest({ url, method = 'GET', headers = {}, body }) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(
        {
          type: 'GITHUB_API_REQUEST',
          url,
          method,
          headers,
          body
        },
        (res) => {
          if (chrome.runtime.lastError || !res) {
            // Direct fetch fallback if background worker is temporarily unavailable
            fetch(url, {
              method,
              headers,
              body: body ? JSON.stringify(body) : undefined
            })
              .then(async (r) => {
                const text = await r.text()
                let data = null
                try { data = JSON.parse(text) } catch { data = text }
                resolve({ ok: r.ok, status: r.status, data, statusText: r.statusText })
              })
              .catch((err) => {
                resolve({ ok: false, status: 0, error: err?.message || 'Network request failed', data: {} })
              })
            return
          }
          resolve(res)
        }
      )
    } catch {
      fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      })
        .then(async (r) => {
          const text = await r.text()
          let data = null
          try { data = JSON.parse(text) } catch { data = text }
          resolve({ ok: r.ok, status: r.status, data, statusText: r.statusText })
        })
        .catch((err) => {
          resolve({ ok: false, status: 0, error: err?.message || 'Network request failed', data: {} })
        })
    }
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
  const prRes = await githubApiRequest({
    url: `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
    headers
  })

  if (!prRes.ok) {
    throw new Error(prRes.data?.message || prRes.error || 'Failed to fetch PR branch details. Check GitHub token permissions.')
  }

  const prData = prRes.data || {}
  const branch = prData.head?.ref
  const headRepo = prData.head?.repo?.full_name || repoIdentifier

  if (!branch) {
    throw new Error('Could not determine PR target branch.')
  }

  const committedFiles = []

  // 2. Group fixes by file so each file is updated once with all its changes
  const fixesByFile = new Map()
  for (const fix of codeFixes) {
    if (!fix.file || !fix.fixedCode) continue
    if (!fixesByFile.has(fix.file)) {
      fixesByFile.set(fix.file, [])
    }
    fixesByFile.get(fix.file).push(fix)
  }

  const fileEntries = Array.from(fixesByFile.entries())
  if (fileEntries.length === 0) {
    throw new Error('No valid files to update in this commit.')
  }

  const reqHeaders = {
    ...headers,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache'
  }

  for (let idx = 0; idx < fileEntries.length; idx++) {
    const [filePath, fileFixes] = fileEntries[idx]

    if (onProgress) {
      onProgress(`Updating ${filePath} (${idx + 1}/${fileEntries.length})...`)
    }

    // Function to fetch latest file data with cache busting
    const fetchLatestFile = async () => {
      const cacheBuster = Date.now() + Math.random().toString(36).substring(2, 7)
      const res = await githubApiRequest({
        url: `https://api.github.com/repos/${headRepo}/contents/${filePath}?ref=${encodeURIComponent(branch)}&_cb=${cacheBuster}`,
        headers: reqHeaders
      })
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(`File '${filePath}' not found on branch '${branch}'. Ensure you have push write permissions to ${headRepo}.`)
        } else if (res.status === 403) {
          throw new Error(`Permission denied committing to ${headRepo}. Your token needs 'repo' write access or fork permissions.`)
        }
        throw new Error(res.data?.message || res.error || `Could not fetch ${filePath}`)
      }
      return res.data
    }

    // Apply all fixes for this file onto its raw content
    const applyReplacements = (rawContent) => {
      let updated = rawContent
      for (const fix of fileFixes) {
        const normRaw = updated.replace(/\r\n/g, '\n')
        const normOrig = fix.originalCode ? fix.originalCode.trim().replace(/\r\n/g, '\n') : ''
        const normFixed = fix.fixedCode ? fix.fixedCode.trim() : ''

        if (normOrig && normRaw.includes(normOrig)) {
          updated = normRaw.replace(normOrig, normFixed)
        } else if (fix.originalCode && updated.includes(fix.originalCode.trim())) {
          updated = updated.replace(fix.originalCode.trim(), normFixed)
        } else if (normFixed && !updated.includes(normFixed)) {
          updated = updated + '\n\n' + normFixed
        }
      }
      return updated
    }

    let fileData = await fetchLatestFile()
    let sha = fileData.sha
    let updatedContent = applyReplacements(decodeBase64Utf8(fileData.content))

    const commitMsg = commitMessage || `refactor: apply AI fix for ${filePath}`

    // Attempt to commit with automatic retry on SHA mismatch (409 Conflict)
    let putRes = await githubApiRequest({
      url: `https://api.github.com/repos/${headRepo}/contents/${filePath}`,
      method: 'PUT',
      headers: reqHeaders,
      body: {
        message: commitMsg,
        content: encodeBase64Utf8(updatedContent),
        sha,
        branch
      }
    })

    // If SHA mismatch occurs (409 Conflict), re-fetch latest SHA and retry once
    if (!putRes.ok && putRes.status === 409) {
      await new Promise(r => setTimeout(r, 400)) // brief backoff
      fileData = await fetchLatestFile()
      sha = fileData.sha
      updatedContent = applyReplacements(decodeBase64Utf8(fileData.content))

      putRes = await githubApiRequest({
        url: `https://api.github.com/repos/${headRepo}/contents/${filePath}`,
        method: 'PUT',
        headers: reqHeaders,
        body: {
          message: commitMsg,
          content: encodeBase64Utf8(updatedContent),
          sha,
          branch
        }
      })
    }

    if (!putRes.ok) {
      if (putRes.status === 403) {
        throw new Error(`Write permission denied on branch '${branch}'. You can only commit to branches on repos where you have write access.`)
      }
      throw new Error(`Failed to commit fix for ${filePath}: ${putRes.data?.message || putRes.error || putRes.statusText}`)
    }

    const commitResult = putRes.data || {}
    committedFiles.push({
      file: filePath,
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

  const res = await githubApiRequest({
    url: `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
    method: 'POST',
    headers,
    body: {
      body: bodyContent,
      event
    }
  })

  if (!res.ok) {
    // If GitHub rejects APPROVE/REQUEST_CHANGES (e.g. you are the author), fallback to COMMENT
    if (res.status === 422 && event !== 'COMMENT') {
      const retryRes = await githubApiRequest({
        url: `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
        method: 'POST',
        headers,
        body: {
          body: bodyContent,
          event: 'COMMENT'
        }
      })
      
      if (!retryRes.ok) {
        throw new Error(retryRes.data?.message || retryRes.error || 'Failed to post review comment to GitHub.')
      }
      return retryRes.data
    }
    
    throw new Error(res.data?.message || res.error || 'Failed to post review comment to GitHub.')
  }

  return res.data
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
