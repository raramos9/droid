import { getSandbox } from "@cloudflare/sandbox";
import { Octokit } from "@octokit/rest";
import { runAgent } from "../agent/index";
import { loadCheckpoint } from "../agent/checkpoint";
import { loadRepoConfig } from "../agent/config";
import { loadDroidMd } from "../agent/droidMd";
import { buildSystemPrompt } from "../agent/prompt";
import { cloneRepo } from "../lib/cloneRepo";
import { getUserToken } from "../lib/userToken";
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
  const resolvedToken =
    (await getUserToken(goal.repo.owner, goal.repo.name, env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, env.TOKEN_ENCRYPTION_KEY)) ??
    env.GITHUB_TOKEN;
  const octokit = new Octokit({ auth: resolvedToken });

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
    await cloneRepo(sandbox, goal.repo.owner, goal.repo.name, resolvedToken, branch);

    const fallbackConfig = { userConfig: "", repoOverrides: "" };
    const [repoConfig, droidMdContent] = await Promise.all([
      loadRepoConfig(goal.repo.owner, goal.repo.name, env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY).catch(
        (err) => { console.error("loadRepoConfig failed, using empty config:", err); return fallbackConfig; },
      ),
      loadDroidMd(sandbox).catch(
        (err) => { console.error("loadDroidMd failed, skipping .droid.md:", err); return ""; },
      ),
    ]);
    const systemPrompt = buildSystemPrompt(repoConfig.userConfig, droidMdContent, repoConfig.repoOverrides);

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
