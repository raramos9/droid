import { getSandbox } from "@cloudflare/sandbox";
import { type Agent, type AgentResult } from "../agents/base";
import { type Dispatch } from "../triggers/github";
import { writeIssueAgent } from "../agents/writeIssue";
import { reviewPRAgent } from "../agents/reviewPR";
import { buildSandboxId } from "../lib/repoHelpers";

interface Env {
  Sandbox: DurableObjectNamespace;
  GITHUB_TOKEN: string;
  ANTHROPIC_API_KEY: string;
  WEBHOOK_SECRET: string;
}

const AGENT_REGISTRY: Record<string, Agent<any>> = {
  writeIssue: writeIssueAgent,
  reviewPR: reviewPRAgent,
};

export async function runAgent(dispatch: Dispatch, env: Env): Promise<AgentResult> {
  const agent = AGENT_REGISTRY[dispatch.agent];
  const sandboxId = dispatch.agent === "writeIssue"
    ? buildSandboxId((dispatch.payload as any).after)
    : `review-${(dispatch.payload as any).pull_request?.number ?? Date.now()}`;

  const sandbox = getSandbox(env.Sandbox as any, sandboxId);

  try {
    const ctx = {
      sandbox,
      githubToken: env.GITHUB_TOKEN,
      anthropicApiKey: env.ANTHROPIC_API_KEY,
    };
    const input = agent.inputSchema.parse(dispatch.payload);
    return await agent.run(input, ctx);
  } catch (error: any) {
    console.error(`${dispatch.agent} harness error:`, error);
    return { success: false, artifacts: [], error: error.message };
  } finally {
    await sandbox.destroy();
  }
}
