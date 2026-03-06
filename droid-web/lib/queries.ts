import { supabase } from "./supabase"
import type { AgentRun, EnrolledRepo, PendingAction } from "./types"

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
    .filter("goal->>context", "cs", `{"issueNumber":${issueNumber}}`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw new Error(error.message)
  }

  return data as AgentRun
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
