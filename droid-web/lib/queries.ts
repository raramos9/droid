import { supabase } from "./supabase"
import type { AgentRun, EnrolledRepo, PendingAction, PendingActionWithContext } from "./types"

export async function getRunsMapByIssueNumber(
  owner: string,
  repo: string
): Promise<Map<number, AgentRun>> {
  const runs = await getRunsForRepo(owner, repo)
  const map = new Map<number, AgentRun>()
  for (const run of runs) {
    const issueNumber = run.goal?.context?.issueNumber
    if (typeof issueNumber === "number" && !map.has(issueNumber)) {
      map.set(issueNumber, run)
    }
  }
  return map
}

export async function getEnrolledRepos(installedBy: string): Promise<EnrolledRepo[]> {
  const { data, error } = await supabase
    .from("enrolled_repos")
    .select("*")
    .eq("installed_by", installedBy)

  if (error) throw new Error(error.message)
  return data as EnrolledRepo[]
}

export async function getRunsForRepo(owner: string, repo: string): Promise<AgentRun[]> {
  const { data, error } = await supabase
    .from("agent_runs")
    .select("*")
    .eq("repo_owner", owner)
    .eq("repo_name", repo)
    .order("updated_at", { ascending: false })
    .limit(100)

  if (error) throw new Error(error.message)
  return data as AgentRun[]
}

export async function getRunForIssue(
  owner: string,
  repo: string,
  issueNumber: number
): Promise<AgentRun | null> {
  const { data, error } = await supabase
    .from("agent_runs")
    .select("*")
    .eq("repo_owner", owner)
    .eq("repo_name", repo)
    .filter("goal->context", "cs", `{"issueNumber":${issueNumber}}`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw new Error(error.message)
  }

  return data as AgentRun
}

export async function getPendingActionsCount(installedBy: string): Promise<number> {
  const repos = await getEnrolledRepos(installedBy)
  if (!repos.length) return 0

  const enrolledSet = new Set(repos.map((r) => `${r.owner}/${r.repo}`))

  const { data, error } = await supabase
    .from("pending_actions")
    .select("id, agent_runs!inner(repo_owner, repo_name)")
    .eq("status", "pending")

  if (error) throw new Error(error.message)

  return (data ?? []).filter((a) => {
    const run = (a as { agent_runs: { repo_owner: string; repo_name: string } }).agent_runs
    return enrolledSet.has(`${run.repo_owner}/${run.repo_name}`)
  }).length
}

export async function getAllPendingActionsWithContext(
  installedBy: string
): Promise<PendingActionWithContext[]> {
  const repos = await getEnrolledRepos(installedBy)
  if (!repos.length) return []

  const enrolledSet = new Set(repos.map((r) => `${r.owner}/${r.repo}`))

  const { data: actions, error } = await supabase
    .from("pending_actions")
    .select("*, agent_runs!inner(run_id, repo_owner, repo_name, goal)")
    .eq("status", "pending")
    .order("created_at", { ascending: true })

  if (error) throw new Error(error.message)

  return (actions ?? [])
    .filter((a) => {
      const run = (a as { agent_runs: { repo_owner: string; repo_name: string } }).agent_runs
      return enrolledSet.has(`${run.repo_owner}/${run.repo_name}`)
    })
    .map((a) => {
      const run = (a as { agent_runs: { repo_owner: string; repo_name: string; goal: { context?: { issueNumber?: number; title?: string } } } }).agent_runs
      return {
        ...a,
        repo_owner: run.repo_owner,
        repo_name: run.repo_name,
        issue_number: run.goal?.context?.issueNumber,
        issue_title: run.goal?.context?.title,
      } as PendingActionWithContext
    })
}

export async function getPendingActions(runId: string): Promise<PendingAction[]> {
  const { data, error } = await supabase
    .from("pending_actions")
    .select("*")
    .eq("run_id", runId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })

  if (error) throw new Error(error.message)
  return data as PendingAction[]
}

// Called by both the API route (user-facing) and the droid worker (no user context).
// Ownership verification must be enforced at the API route layer.
export async function getRepoConfigOverrides(owner: string, repo: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("enrolled_repos")
    .select("config_overrides")
    .eq("owner", owner)
    .eq("repo", repo)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw new Error(error.message)
  }
  return data?.config_overrides ?? null
}

// installedBy is required to scope the update to repos the user enrolled.
// Input length validation (max 20KB) must be enforced by the calling API route.
export async function updateRepoConfigOverrides(
  owner: string,
  repo: string,
  overrides: string,
  installedBy: string
): Promise<void> {
  const { data, error } = await supabase
    .from("enrolled_repos")
    .update({ config_overrides: overrides })
    .eq("owner", owner)
    .eq("repo", repo)
    .eq("installed_by", installedBy)
    .select()

  if (error) throw new Error(error.message)
  if (!data?.length) throw new Error("Repo not found or not enrolled by this user")
}
