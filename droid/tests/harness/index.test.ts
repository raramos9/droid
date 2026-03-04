import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSandbox = vi.hoisted(() => ({
  exec: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  destroy: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@cloudflare/sandbox", () => ({
  getSandbox: vi.fn().mockReturnValue(mockSandbox),
}));

vi.mock("../../src/agents/writeIssue", () => ({
  writeIssueAgent: {
    name: "writeIssue",
    inputSchema: { parse: vi.fn((x) => x) },
    tools: [],
    run: vi.fn().mockResolvedValue({ success: true, artifacts: ["done"] }),
  },
}));

vi.mock("../../src/agents/reviewPR", () => ({
  reviewPRAgent: {
    name: "reviewPR",
    inputSchema: { parse: vi.fn((x) => x) },
    tools: [],
    run: vi.fn().mockResolvedValue({ success: true, artifacts: ["review posted"] }),
  },
}));

import { getSandbox } from "@cloudflare/sandbox";
import { runAgent } from "../../src/harness/index";
import { writeIssueAgent } from "../../src/agents/writeIssue";
import { reviewPRAgent } from "../../src/agents/reviewPR";

const env = {
  Sandbox: {} as any,
  GITHUB_TOKEN: "tok",
  ANTHROPIC_API_KEY: "ak",
  WEBHOOK_SECRET: "sec",
};

const pushDispatch = {
  agent: "writeIssue" as const,
  payload: {
    repository: { owner: { login: "acme" }, name: "repo" },
    ref: "refs/heads/main",
    before: "aaa",
    after: "bbb12345",
  },
};

const prDispatch = {
  agent: "reviewPR" as const,
  payload: {
    action: "opened",
    pull_request: { number: 1, head: { ref: "fix", sha: "a" }, base: { ref: "main", sha: "b" } },
    repository: { owner: { login: "acme" }, name: "repo" },
  },
};

describe("runAgent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("routes writeIssue dispatch to writeIssueAgent", async () => {
    await runAgent(pushDispatch, env);
    expect(writeIssueAgent.run).toHaveBeenCalled();
    expect(reviewPRAgent.run).not.toHaveBeenCalled();
  });

  it("routes reviewPR dispatch to reviewPRAgent", async () => {
    await runAgent(prDispatch, env);
    expect(reviewPRAgent.run).toHaveBeenCalled();
    expect(writeIssueAgent.run).not.toHaveBeenCalled();
  });

  it("calls sandbox.destroy in finally — even on success", async () => {
    await runAgent(pushDispatch, env);
    expect(mockSandbox.destroy).toHaveBeenCalledOnce();
  });

  it("calls sandbox.destroy in finally — even on error", async () => {
    vi.mocked(writeIssueAgent.run).mockRejectedValueOnce(new Error("boom"));
    await runAgent(pushDispatch, env);
    expect(mockSandbox.destroy).toHaveBeenCalledOnce();
  });

  it("returns AgentResult from agent", async () => {
    const result = await runAgent(pushDispatch, env);
    expect(result.success).toBe(true);
    expect(result.artifacts).toContain("done");
  });

  it("returns success false when agent throws", async () => {
    vi.mocked(writeIssueAgent.run).mockRejectedValueOnce(new Error("fatal"));
    const result = await runAgent(pushDispatch, env);
    expect(result.success).toBe(false);
    expect(result.error).toContain("fatal");
  });

  it("passes correct AgentContext to agent", async () => {
    await runAgent(pushDispatch, env);
    const ctx = vi.mocked(writeIssueAgent.run).mock.calls[0][1];
    expect(ctx.githubToken).toBe("tok");
    expect(ctx.anthropicApiKey).toBe("ak");
    expect(ctx.sandbox).toBe(mockSandbox);
  });
});
