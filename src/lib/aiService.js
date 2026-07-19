import { getProjectRules, saveReviewLog } from './rulesService'

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile'
const DEFAULT_GROQ_API_KEY = ''

/**
 * Get configured AI settings / API key from storage
 */
export async function getAISettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['ai-pr-copilot-settings'], (res) => {
      resolve(res['ai-pr-copilot-settings'] || {})
    })
  })
}

/**
 * Save AI settings / API key to storage
 */
export async function saveAISettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['ai-pr-copilot-settings'], (res) => {
      const current = res['ai-pr-copilot-settings'] || {}
      const updated = { ...current, ...settings }
      chrome.storage.local.set({ 'ai-pr-copilot-settings': updated }, () => {
        resolve(updated)
      })
    })
  })
}

/**
 * Run AI Analysis for Developer or Reviewer Mode using Groq API
 */
export async function runAIReview({ prDetails, mode = 'developer' }) {
  if (!prDetails || !prDetails.rawDiff) {
    throw new Error('No diff found to review.')
  }

  // 1. Fetch custom repository rules
  const rules = await getProjectRules(prDetails.repoIdentifier)
  const rulesList = rules.map((r) => r.rule_text).join('\n- ')

  // 2. Fetch API key from settings or fallback to provided Groq key
  const settings = await getAISettings()
  const apiKey = settings.groqApiKey || settings.geminiApiKey || DEFAULT_GROQ_API_KEY

  if (!apiKey) {
    throw new Error('API_KEY_MISSING')
  }

  // 3. Construct system prompt & user prompt
  const systemPrompt = mode === 'developer'
    ? getDeveloperSystemPrompt(rulesList)
    : getReviewerSystemPrompt(rulesList)

  const userPrompt = `
PR Title: ${prDetails.title}
Repository: ${prDetails.repoIdentifier}
PR Description: ${prDetails.description}
Files Changed: ${prDetails.filesCount}

--- RAW GIT DIFF ---
${prDetails.rawDiff}
`

  // 4. Call Groq API endpoint
  const response = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: DEFAULT_GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    })
  })

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    const msg = errData?.error?.message || response.statusText
    throw new Error(`Groq AI Request failed: ${msg}`)
  }

  const data = await response.json()
  const rawText = data?.choices?.[0]?.message?.content

  if (!rawText) {
    throw new Error('Received empty response from Groq AI model.')
  }

  let parsed
  try {
    parsed = JSON.parse(rawText)
  } catch (err) {
    console.warn('[aiService] Failed to parse JSON response, formatting fallback', err)
    parsed = createFallbackResponse(rawText, mode)
  }

  // 5. Persist log in Supabase
  await saveReviewLog({
    repoIdentifier: prDetails.repoIdentifier,
    prUrl: window.location.href,
    mode,
    summary: parsed.summary || parsed.overview || 'Completed Groq AI review.',
    rawResponse: parsed
  })

  return parsed
}

function getDeveloperSystemPrompt(rulesList) {
  return `You are an expert Senior Staff Software Engineer running a Pre-Flight Check on a Pull Request.

Analyze the code diff provided. You MUST respond with ONLY valid JSON matching this schema:
{
  "readinessScore": 85,
  "summary": "Short 2-sentence summary of findings",
  "bugRisks": [
    { "severity": "high", "file": "src/App.js", "description": "Explanation of potential bug or edge case" }
  ],
  "securityConcerns": [
    { "severity": "medium", "file": "src/api.js", "description": "Security vulnerability explanation" }
  ],
  "testCoverageGaps": [
    "Suggested missing test case"
  ],
  "customRulesViolations": [
    "Violation explanation if any custom rules were broken"
  ],
  "codeFixes": [
    {
      "file": "src/api.js",
      "issueTitle": "Unchecked Null Access",
      "description": "Safely handle undefined user object",
      "originalCode": "const name = res.data.user.name;",
      "fixedCode": "const name = res.data?.user?.name ?? 'Guest';",
      "githubSuggestionMarkdown": "\`\`\`suggestion\\n  const name = res.data?.user?.name ?? 'Guest';\\n\`\`\`"
    }
  ],
  "keyImprovements": [
    "Actionable refactoring suggestion"
  ],
  "suggestedPrDescription": "Clean, markdown formatted PR description suitable to paste into GitHub"
}

CUSTOM REPOSITORY RULES TO ENFORCE:
${rulesList ? `- ${rulesList}` : 'None specified.'}
`
}

function getReviewerSystemPrompt(rulesList) {
  return `You are a Principal Code Reviewer conducting a verification review of a Pull Request.

Analyze the code diff provided. You MUST respond with ONLY valid JSON matching this schema:
{
  "verdict": "APPROVE",
  "overview": "Clear 2-3 sentence overview of what this PR introduces",
  "breakingChanges": [
    "Detail any breaking changes"
  ],
  "architecturalImpact": "Summary of architectural and system impact",
  "targetedQuestions": [
    "Insightful question to ask the PR author"
  ],
  "codeFixes": [
    {
      "file": "src/App.js",
      "issueTitle": "Optimization Suggestion",
      "description": "Use memoized callback to avoid unnecessary re-renders",
      "originalCode": "const handleClick = () => doSomething();",
      "fixedCode": "const handleClick = useCallback(() => doSomething(), []);",
      "githubSuggestionMarkdown": "\`\`\`suggestion\\n  const handleClick = useCallback(() => doSomething(), []);\\n\`\`\`"
    }
  ],
  "recommendedReviewComment": "Constructive, professional markdown review comment ready to paste into GitHub review box"
}

Note: "verdict" MUST be one of: "APPROVE", "REQUEST_CHANGES", or "COMMENT".

CUSTOM REPOSITORY RULES TO ENFORCE:
${rulesList ? `- ${rulesList}` : 'None specified.'}
`
}

function createFallbackResponse(text, mode) {
  if (mode === 'developer') {
    return {
      readinessScore: 75,
      summary: text.substring(0, 200) + '...',
      bugRisks: [],
      securityConcerns: [],
      testCoverageGaps: [],
      customRulesViolations: [],
      codeFixes: [],
      keyImprovements: [text],
      suggestedPrDescription: text
    }
  } else {
    return {
      verdict: 'COMMENT',
      overview: text.substring(0, 200) + '...',
      breakingChanges: [],
      architecturalImpact: 'Review complete.',
      targetedQuestions: [],
      codeFixes: [],
      recommendedReviewComment: text
    }
  }
}
