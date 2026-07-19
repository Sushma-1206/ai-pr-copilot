import { supabase } from './supabaseClient'

/**
 * Fetch project rules for a specific repository and current authenticated user.
 */
export async function getProjectRules(repoIdentifier) {
  const { data: sessionData } = await supabase.auth.getSession()
  const user = sessionData?.session?.user
  if (!user) return []

  const { data, error } = await supabase
    .from('project_rules')
    .select('*')
    .eq('user_id', user.id)
    .eq('repo_identifier', repoIdentifier)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[rulesService] Error fetching rules:', error)
    return []
  }

  return data || []
}

/**
 * Add a new custom project rule for a repository.
 */
export async function addProjectRule(repoIdentifier, ruleText) {
  const { data: sessionData } = await supabase.auth.getSession()
  const user = sessionData?.session?.user
  if (!user) throw new Error('User must be logged in to save project rules.')

  const { data, error } = await supabase
    .from('project_rules')
    .insert([
      {
        user_id: user.id,
        repo_identifier: repoIdentifier,
        rule_text: ruleText.trim()
      }
    ])
    .select()

  if (error) {
    throw new Error(error.message || 'Failed to insert project rule.')
  }

  return data?.[0]
}

/**
 * Delete a project rule by ID.
 */
export async function deleteProjectRule(ruleId) {
  const { error } = await supabase.from('project_rules').delete().eq('id', ruleId)

  if (error) {
    throw new Error(error.message || 'Failed to delete project rule.')
  }

  return true
}

/**
 * Fetch saved review logs for a repository and user.
 */
export async function getReviewLogs(repoIdentifier) {
  const { data: sessionData } = await supabase.auth.getSession()
  const user = sessionData?.session?.user
  if (!user) return []

  const { data, error } = await supabase
    .from('review_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('repo_identifier', repoIdentifier)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('[rulesService] Error fetching review logs:', error)
    return []
  }

  return data || []
}

/**
 * Save an AI review log to Supabase.
 */
export async function saveReviewLog({ repoIdentifier, prUrl, mode, summary, rawResponse }) {
  const { data: sessionData } = await supabase.auth.getSession()
  const user = sessionData?.session?.user
  if (!user) return null

  const { data, error } = await supabase
    .from('review_logs')
    .insert([
      {
        user_id: user.id,
        repo_identifier: repoIdentifier,
        pr_url: prUrl,
        mode,
        summary: summary || 'AI PR Review completed.',
        raw_response: rawResponse
      }
    ])
    .select()

  if (error) {
    console.error('[rulesService] Error saving review log:', error)
    return null
  }

  return data?.[0]
}
