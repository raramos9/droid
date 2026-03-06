import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSandbox = vi.hoisted(() => ({
  exec: vi.fn().mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 }),
  readFile: vi.fn().mockResolvedValue({ content: "" }),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  destroy: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@cloudflare/sandbox", () => ({
  getSandbox: vi.fn().mockReturnValue(mockSandbox),
}));

const mockRunAgent = vi.hoisted(() => vi.fn());
vi.mock("../../src/agent/index", () => ({
  runAgent: mockRunAgent,
}));

import { getSandbox } from "@cloudflare/sandbox";
import { runDroidAgent } from "../../src/harness/index";

const env = {
  Sandbox: {} as any,
  GITHUB_TOKEN: "tok",
  ANTHROPIC_API_KEY: "ak",
  WEBHOOK_SECRET: "sec",
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_SERVICE_KEY: "svc-key",
};

const pushGoal = {
  type: "push" as const,
  repo: { owner: "acme", name: "repo" },
  context: { sha: "abc123", ref: "refs/heads/main" },
};

const prGoal = {
  type: "pull_request" as const,
  repo: { owner: "acme", name: "repo" },
  context: { prNumber: 42, title: "Fix auth" },
};

const completedRun = {
  runId: "run-1",
  goal: pushGoal,
  status: "completed" as const,
  messages: [],
  iteration: 1,
  artifacts: ["Issue #1 created"],
};

describe("runDroidAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunAgent.mockResolvedValue(completedRun);
  });

  it("calls runAgent with the goal", async () => {
    await runDroidAgent(pushGoal, env);
    expect(mockRunAgent).toHaveBeenCalledWith(
      pushGoal,
      expect.objectContaining({ anthropicApiKey: "ak" }),
    );
  });

  it("passes supabaseUrl and supabaseKey from env", async () => {
    await runDroidAgent(pushGoal, env);
    const ctx = mockRunAgent.mock.calls[0][1];
    expect(ctx.supabaseUrl).toBe("https://test.supabase.co");
    expect(ctx.supabaseKey).toBe("svc-key");
  });

  it("passes sandbox from getSandbox", async () => {
    await runDroidAgent(pushGoal, env);
    const ctx = mockRunAgent.mock.calls[0][1];
    expect(ctx.sandbox).toBe(mockSandbox);
  });

  it("calls sandbox.destroy after agent run", async () => {
    await runDroidAgent(pushGoal, env);
    expect(mockSandbox.destroy).toHaveBeenCalledOnce();
  });

  it("calls sandbox.destroy even when agent throws", async () => {
    mockRunAgent.mockRejectedValueOnce(new Error("agent crashed"));
    await runDroidAgent(pushGoal, env);
    expect(mockSandbox.destroy).toHaveBeenCalledOnce();
  });

  it("returns the AgentRun from runAgent", async () => {
    const result = await runDroidAgent(pushGoal, env);
    expect(result.status).toBe("completed");
    expect(result.artifacts).toContain("Issue #1 created");
  });

  it("returns a failed run when agent throws", async () => {
    mockRunAgent.mockRejectedValueOnce(new Error("boom"));
    const result = await runDroidAgent(pushGoal, env);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("boom");
  });

  it("works for pull_request goal", async () => {
    mockRunAgent.mockResolvedValueOnce({ ...completedRun, goal: prGoal });
    await runDroidAgent(prGoal, env);
    expect(mockRunAgent).toHaveBeenCalledWith(prGoal, expect.anything());
  });
});
