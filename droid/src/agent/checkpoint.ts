import type { AgentRun, PendingAction } from "../types/agent";

function supabaseHeaders(key: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${key}`,
    "apikey": key,
  };
}

function runToRow(run: AgentRun): Record<string, unknown> {
  return {
    run_id: run.runId,
    repo_owner: run.goal.repo.owner,
    repo_name: run.goal.repo.name,
    trigger: run.goal.type,
    goal: run.goal,
    status: run.status,
    messages: run.messages,
    iteration: run.iteration,
    artifacts: run.artifacts,
    error: run.error ?? null,
    updated_at: new Date().toISOString(),
  };
}

function rowToRun(row: Record<string, any>): AgentRun {
  return {
    runId: row.run_id,
    goal: row.goal,
    status: row.status,
    messages: row.messages ?? [],
    iteration: row.iteration ?? 0,
    artifacts: row.artifacts ?? [],
    error: row.error ?? undefined,
  };
}

export async function saveCheckpoint(
  run: AgentRun,
  supabaseUrl: string,
  supabaseKey: string,
): Promise<void> {
  const url = `${supabaseUrl}/rest/v1/agent_runs`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...supabaseHeaders(supabaseKey),
      "Prefer": "return=minimal,resolution=merge-duplicates",
    },
    body: JSON.stringify(runToRow(run)),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`saveCheckpoint failed (${res.status}): ${text}`);
  }
}

export async function loadCheckpoint(
  runId: string,
  supabaseUrl: string,
  supabaseKey: string,
): Promise<AgentRun> {
  const url = `${supabaseUrl}/rest/v1/agent_runs?run_id=eq.${encodeURIComponent(runId)}&limit=1`;
  const res = await fetch(url, {
    method: "GET",
    headers: supabaseHeaders(supabaseKey),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`loadCheckpoint failed (${res.status}): ${text}`);
  }

  const rows: any[] = await res.json();
  if (!rows.length) throw new Error(`No checkpoint found for runId: ${runId}`);
  return rowToRun(rows[0]);
}

export async function savePendingAction(
  action: PendingAction,
  supabaseUrl: string,
  supabaseKey: string,
): Promise<void> {
  const url = `${supabaseUrl}/rest/v1/pending_actions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...supabaseHeaders(supabaseKey),
      "Prefer": "return=minimal",
    },
    body: JSON.stringify({
      run_id: action.runId,
      tool_use_id: action.toolUseId,
      tool: action.tool,
      args: action.args,
      status: action.status,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`savePendingAction failed (${res.status}): ${text}`);
  }
}
