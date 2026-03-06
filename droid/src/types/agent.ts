import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

export type TriggerType = "push" | "issue_created" | "issue_comment" | "pull_request";
export type AgentStatus = "running" | "paused" | "completed" | "failed";

export interface Goal {
  type: TriggerType;
  repo: { owner: string; name: string };
  context: Record<string, unknown>;
}

export interface AgentRun {
  runId: string;
  goal: Goal;
  status: AgentStatus;
  messages: MessageParam[];
  iteration: number;
  artifacts: string[];
  error?: string;
}

export interface PendingAction {
  runId: string;
  toolUseId: string;
  tool: string;
  args: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
}

export interface ToolContext {
  sandbox: {
    exec: (cmd: string, opts?: { cwd?: string }) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
    readFile: (path: string) => Promise<{ content: string }>;
    writeFile: (path: string, content: string) => Promise<void>;
    mkdir: (path: string, opts?: { recursive?: boolean }) => Promise<void>;
  };
  octokit: any;
}
