/**
 * Diff & Metadata Extractor for GitHub and GitLab PR pages.
 */
import { getGitHubToken } from './githubService'

export async function extractPRDetails() {
  const url = window.location.href
  const pathname = window.location.pathname

  if (url.includes('github.com')) {
    return await extractGitHubPRDetails(pathname)
  } else if (url.includes('gitlab.com')) {
    return await extractGitLabMRDetails(pathname)
  }

  throw new Error('Unsupported host. Open a pull request page on GitHub or GitLab.')
}

/**
 * Extract GitHub PR details
 */
async function extractGitHubPRDetails(pathname) {
  // Path format: /owner/repo/pull/123 or /owner/repo/compare/branch
  const prMatch = pathname.match(/^\/([^/]+)\/([^/]+)\/pull\/(\d+)/)
  const compareMatch = pathname.match(/^\/([^/]+)\/([^/]+)\/compare\/(.+)/)

  let owner = ''
  let repo = ''
  let prNumber = ''

  if (prMatch) {
    owner = prMatch[1]
    repo = prMatch[2]
    prNumber = prMatch[3]
  } else if (compareMatch) {
    owner = compareMatch[1]
    repo = compareMatch[2]
    prNumber = compareMatch[3]
  } else {
    throw new Error('Not on a valid GitHub pull request or compare page.')
  }

  const repoIdentifier = `${owner}/${repo}`

  // 1. Title Extraction
  let title = ''
  const titleEl = document.querySelector(
    '.js-issue-title, [data-component="title"], .gh-header-title bdi, h1.gh-header-title'
  )
  if (titleEl) {
    title = titleEl.textContent.trim()
  } else {
    title = document.title.replace(/·.*$/, '').replace(/Pull Request #\d+.*$/, '').trim()
  }

  // 2. Description Extraction
  let description = ''
  const bodyEl = document.querySelector(
    '.comment-body, .js-comment-body, [data-component="PH_CommentBody"]'
  )
  if (bodyEl) {
    description = bodyEl.textContent.trim()
  }

  // 3. Raw Diff Extraction with Multi-tier Resilience
  let rawDiff = ''
  const githubToken = await getGitHubToken().catch(() => '')
  const authHeaders = githubToken
    ? { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.v3.diff' }
    : { Accept: 'application/vnd.github.v3.diff' }

  // Strategy 1: GitHub API diff endpoint via background service worker (bypasses webpage CSP)
  try {
    const apiDiffUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`
    rawDiff = await fetchDiffViaBackground(apiDiffUrl, authHeaders)
  } catch (err) {
    console.warn('[AI PR Copilot] Background API diff fetch failed', err)
  }

  // Strategy 2: Web .diff endpoint via background (bypasses 60 req/hr API limit completely!)
  if (!rawDiff) {
    try {
      const webDiffUrl = `https://github.com/${owner}/${repo}/pull/${prNumber}.diff`
      rawDiff = await fetchDiffViaBackground(webDiffUrl, githubToken ? { Authorization: `Bearer ${githubToken}` } : {})
    } catch (err) {
      console.warn('[AI PR Copilot] Background web .diff fetch failed', err)
    }
  }

  // Strategy 3: Direct patch-diff URL via background service worker
  if (!rawDiff) {
    try {
      const patchDiffUrl = `https://patch-diff.githubusercontent.com/raw/${owner}/${repo}/pull/${prNumber}.diff`
      rawDiff = await fetchDiffViaBackground(patchDiffUrl, {})
    } catch (err) {
      console.warn('[AI PR Copilot] Background patch-diff fetch failed', err)
    }
  }

  // Strategy 4: Content-script direct fetch fallback
  if (!rawDiff) {
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, { headers: authHeaders })
      if (res.ok) rawDiff = await res.text()
    } catch (err) {
      console.warn('[AI PR Copilot] Direct content-script API fetch failed', err)
    }
  }

  // Strategy 5: Content-script web .diff fallback
  if (!rawDiff) {
    try {
      const res = await fetch(`https://github.com/${owner}/${repo}/pull/${prNumber}.diff`)
      if (res.ok) rawDiff = await res.text()
    } catch (err) {
      console.warn('[AI PR Copilot] Direct content-script web .diff failed', err)
    }
  }

  // Strategy 6: DOM Parsing Fallback
  if (!rawDiff) {
    rawDiff = extractGitHubDOMDiff()
  }

  // Parse file list from raw diff
  let files = parseDiffFileList(rawDiff)
  const domFilesCount = getGitHubDOMFilesCount()
  const filesCount = files.length > 0 ? files.length : (domFilesCount || 0)

  // Limit rawDiff length to avoid exceeding API context limits (~45,000 chars)
  const MAX_DIFF_CHARS = 45000
  let truncatedDiff = rawDiff || ''
  let isTruncated = false
  if (truncatedDiff.length > MAX_DIFF_CHARS) {
    truncatedDiff = truncatedDiff.substring(0, MAX_DIFF_CHARS) + '\n\n...[Diff truncated due to size limits]'
    isTruncated = true
  }

  return {
    platform: 'github',
    repoIdentifier,
    prNumber,
    title: title || `PR #${prNumber}`,
    description: description || 'No description provided.',
    rawDiff: truncatedDiff,
    isTruncated,
    filesCount,
    files
  }
}

/**
 * Fetch diff through background service worker to bypass page CSP & CORS
 */
async function fetchDiffViaBackground(url, headers) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: 'FETCH_PR_DIFF', url, headers }, (res) => {
        if (chrome.runtime.lastError || !res || !res.success || !res.text) {
          resolve(null)
        } else {
          resolve(res.text)
        }
      })
    } catch {
      resolve(null)
    }
  })
}

/**
 * Read files changed count from GitHub's tab bar DOM
 */
function getGitHubDOMFilesCount() {
  const counterEl = document.querySelector(
    '#files_tab_counter, a[data-tab-item="files-tab"] .Counter, a[href$="/files"] .Counter, a[href*="/files"] span.Counter'
  )
  if (counterEl) {
    const num = parseInt(counterEl.textContent.trim(), 10)
    if (!isNaN(num)) return num
  }
  return 0
}

/**
 * Extract GitLab MR details
 */
async function extractGitLabMRDetails(pathname) {
  const mrMatch = pathname.match(/^\/(.+?)\/-\/merge_requests\/(\d+)/)
  if (!mrMatch) {
    throw new Error('Not on a valid GitLab merge request page.')
  }

  const repoIdentifier = mrMatch[1]
  const mrNumber = mrMatch[2]

  let title = ''
  const titleEl = document.querySelector('.merge-request-details .title, h1.title')
  if (titleEl) {
    title = titleEl.textContent.trim()
  } else {
    title = document.title.trim()
  }

  let description = ''
  const descEl = document.querySelector('.description .md, .js-task-list-container')
  if (descEl) {
    description = descEl.textContent.trim()
  }

  let rawDiff = ''
  try {
    const diffUrl = `https://gitlab.com/${repoIdentifier}/-/merge_requests/${mrNumber}.diff`
    const res = await fetch(diffUrl)
    if (res.ok) {
      rawDiff = await res.text()
    }
  } catch (e) {
    console.warn('[AI PR Copilot] GitLab .diff fetch failed', e)
  }

  const files = parseDiffFileList(rawDiff)
  const MAX_DIFF_CHARS = 45000
  let truncatedDiff = rawDiff
  let isTruncated = false
  if (rawDiff.length > MAX_DIFF_CHARS) {
    truncatedDiff = rawDiff.substring(0, MAX_DIFF_CHARS) + '\n\n...[Diff truncated due to size limits]'
    isTruncated = true
  }

  return {
    platform: 'gitlab',
    repoIdentifier,
    prNumber: mrNumber,
    title: title || `MR !${mrNumber}`,
    description: description || 'No description provided.',
    rawDiff: truncatedDiff,
    isTruncated,
    filesCount: files.length,
    files
  }
}

/**
 * DOM Fallback for GitHub diff
 */
function extractGitHubDOMDiff() {
  const fileContainers = document.querySelectorAll('.file, .js-file-content, [data-file-path]')
  if (!fileContainers.length) return ''

  const chunks = []
  fileContainers.forEach((container) => {
    const filePath = container.getAttribute('data-file-path') || container.querySelector('.file-header')?.textContent?.trim()
    if (filePath) {
      chunks.push(`--- a/${filePath}\n+++ b/${filePath}`)
      const lines = container.querySelectorAll('.js-file-line, .blob-code-inner')
      lines.forEach((line) => {
        chunks.push(line.textContent)
      })
    }
  })
  return chunks.join('\n')
}

/**
 * Helper to parse changed file names from a raw git diff
 */
function parseDiffFileList(rawDiff) {
  if (!rawDiff) return []

  const files = []
  const diffFileRegex = /^diff --git a\/(.+) b\/(.+)$/gm
  let match

  while ((match = diffFileRegex.exec(rawDiff)) !== null) {
    const filename = match[2] || match[1]
    if (!files.some((f) => f.filename === filename)) {
      files.push({ filename })
    }
  }

  return files
}
