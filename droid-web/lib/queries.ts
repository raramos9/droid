import { supabase } from "./supabase"
import type { AgentRun, EnrolledRepo, PendingAction } from "./types"

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

  const orFilter = repos
    .map((r) => `and(repo_owner.eq.${r.owner},repo_name.eq.${r.repo})`)
    .join(",")

  const { data: runs, error: runsError } = await supabase
    .from("agent_runs")
    .select("run_id")
    .or(orFilter)

  if (runsError) throw new Error(runsError.message)
  if (!runs?.length) return 0

  const runIds = runs.map((r) => r.run_id)

  const { count, error: countError } = await supabase
    .from("pending_actions")
    .select("id", { count: "exact", head: true })
    .in("run_id", runIds)
    .eq("status", "pending")

  if (countError) throw new Error(countError.message)
  return count ?? 0
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
