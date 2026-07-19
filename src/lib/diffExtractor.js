/**
 * Diff & Metadata Extractor for GitHub and GitLab PR pages.
 */

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

  // 3. Raw Diff Extraction Strategy
  let rawDiff = ''

  // Strategy A: GitHub API diff endpoint (works for all public repos)
  try {
    const apiDiffUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`
    const res = await fetch(apiDiffUrl, {
      headers: { Accept: 'application/vnd.github.v3.diff' }
    })
    if (res.ok) {
      rawDiff = await res.text()
    }
  } catch (err) {
    console.warn('[AI PR Copilot] GitHub API diff fetch failed', err)
  }

  // Strategy B: Direct absolute web URL .diff endpoint fallback
  if (!rawDiff) {
    try {
      const webDiffUrl = `https://github.com/${owner}/${repo}/pull/${prNumber}.diff`
      const res = await fetch(webDiffUrl)
      if (res.ok) {
        rawDiff = await res.text()
      }
    } catch (err) {
      console.warn('[AI PR Copilot] Direct web .diff fetch failed', err)
    }
  }

  // Strategy C: DOM Parsing Fallback
  if (!rawDiff) {
    rawDiff = extractGitHubDOMDiff()
  }

  // Parse file list from raw diff
  const files = parseDiffFileList(rawDiff)

  // Limit rawDiff length to avoid exceeding API context limits (~45,000 chars)
  const MAX_DIFF_CHARS = 45000
  let truncatedDiff = rawDiff
  let isTruncated = false
  if (rawDiff.length > MAX_DIFF_CHARS) {
    truncatedDiff = rawDiff.substring(0, MAX_DIFF_CHARS) + '\n\n...[Diff truncated due to size limits]'
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
    filesCount: files.length,
    files
  }
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
