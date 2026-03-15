import { getSandbox } from "@cloudflare/sandbox";
import { Octokit } from "@octokit/rest";
import { runAgent } from "../agent/index";
import { loadCheckpoint } from "../agent/checkpoint";
import { loadRepoConfig } from "../agent/config";
import { buildSystemPrompt } from "../agent/prompt";
import { cloneRepo } from "../lib/cloneRepo";
import type { Goal, AgentRun, MessageParam } from "../types/agent";
import type { Env } from "../types/env";

interface ResumeOpts {
  existingRunId?: string;
  initialMessages?: MessageParam[];
  startIteration?: number;
}

export async function runDroidAgent(goal: Goal, env: Env, resumeOpts: ResumeOpts = {}): Promise<AgentRun> {
  const sandboxId = `droid-${goal.repo.owner}-${goal.repo.name}-${Date.now()}`;
  const sandbox = getSandbox(env.Sandbox as Parameters<typeof getSandbox>[0], sandboxId);
  const octokit = new Octokit({ auth: env.GITHUB_TOKEN });

  let existingRun: AgentRun | undefined;
  if (resumeOpts.existingRunId) {
    const checkpoint = await loadCheckpoint(resumeOpts.existingRunId, env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
    existingRun = {
      ...checkpoint,
      messages: resumeOpts.initialMessages ?? checkpoint.messages,
      iteration: resumeOpts.startIteration ?? checkpoint.iteration,
      status: "running",
    };
  }

  try {
    // For push events, clone the specific branch that was pushed to
    const ref = goal.type === "push" && typeof goal.context.ref === "string" ? goal.context.ref : "";
    const branch = ref.startsWith("refs/heads/") ? ref.slice("refs/heads/".length) : undefined;
    await cloneRepo(sandbox, goal.repo.owner, goal.repo.name, env.GITHUB_TOKEN, branch);

    let systemPrompt: string | undefined;
    try {
      const repoConfig = await loadRepoConfig(
        goal.repo.owner,
        goal.repo.name,
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_KEY,
      );
      systemPrompt = buildSystemPrompt(repoConfig.userConfig, repoConfig.repoOverrides);
    } catch (configErr) {
      console.error("loadRepoConfig failed, falling back to base prompt:", configErr);
    }

    const ctx = {
      sandbox,
      octokit,
      anthropicApiKey: env.ANTHROPIC_API_KEY,
      supabaseUrl: env.SUPABASE_URL,
      supabaseKey: env.SUPABASE_SERVICE_KEY,
    };
    const agentOpts = { systemPrompt, ...(existingRun && { existingRun }) };
    return await runAgent(goal, ctx, agentOpts);
  } catch (error) {
    return {
      runId: resumeOpts.existingRunId ?? crypto.randomUUID(),
      goal,
      status: "failed",
      messages: [],
      iteration: 0,
      artifacts: [],
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await sandbox.destroy();
  }
}
