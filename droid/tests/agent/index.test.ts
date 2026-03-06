import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Goal } from "../../src/types/agent";
import { GatedActionError } from "../../src/agent/tools/index";

// ── Mock Anthropic ────────────────────────────────────────────────────────────

const mockMessagesCreate = vi.hoisted(() => vi.fn());

vi.mock("@anthropic-ai/sdk", () => {
  const Anthropic = vi.fn().mockImplementation(function () {
    return { messages: { create: mockMessagesCreate } };
  });
  return { default: Anthropic };
});

// ── Mock checkpoint ───────────────────────────────────────────────────────────

vi.mock("../../src/agent/checkpoint", () => ({
  saveCheckpoint: vi.fn().mockResolvedValue(undefined),
  loadCheckpoint: vi.fn(),
  savePendingAction: vi.fn().mockResolvedValue(undefined),
}));

import { saveCheckpoint, savePendingAction } from "../../src/agent/checkpoint";
import { runAgent } from "../../src/agent/index";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSandbox() {
  return {
    exec: vi.fn().mockResolvedValue({ stdout: "ok", stderr: "", exitCode: 0 }),
    readFile: vi.fn().mockResolvedValue({ content: "file content" }),
    writeFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
  } as any;
}

function makeOctokit() {
  return {
    issues: { get: vi.fn(), list: vi.fn(), create: vi.fn(), createComment: vi.fn() },
    pulls: { get: vi.fn(), create: vi.fn(), merge: vi.fn() },
    repos: { compareCommits: vi.fn() },
  } as any;
}

function makeCtx() {
  return {
    sandbox: makeSandbox(),
    octokit: makeOctokit(),
    anthropicApiKey: "test-key",
    supabaseUrl: "https://test.supabase.co",
    supabaseKey: "svc-key",
  };
}

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    type: "push",
    repo: { owner: "acme", name: "app" },
    context: { sha: "abc123" },
    ...overrides,
  };
}

// Anthropic response that ends turn immediately (no tool calls)
function endTurnResponse() {
  return {
    stop_reason: "end_turn",
    content: [{ type: "text", text: "Analysis complete." }],
    usage: { input_tokens: 100, output_tokens: 50 },
  };
}

// Anthropic response with a non-gated tool call
function toolUseResponse(toolName: string, toolInput: Record<string, unknown>, toolUseId = "tu-1") {
  return {
    stop_reason: "tool_use",
    content: [{ type: "tool_use", id: toolUseId, name: toolName, input: toolInput }],
    usage: { input_tokens: 100, output_tokens: 50 },
  };
}

// Anthropic response with a gated tool call
function gatedToolResponse(toolName: string, toolInput: Record<string, unknown>, toolUseId = "tu-gated") {
  return toolUseResponse(toolName, toolInput, toolUseId);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── runAgent ──────────────────────────────────────────────────────────────────

describe("runAgent", () => {
  it("returns completed run when Claude ends turn immediately", async () => {
    mockMessagesCreate.mockResolvedValueOnce(endTurnResponse());
    const run = await runAgent(makeGoal(), makeCtx());
    expect(run.status).toBe("completed");
  });

  it("saves checkpoint on completion", async () => {
    mockMessagesCreate.mockResolvedValueOnce(endTurnResponse());
    await runAgent(makeGoal(), makeCtx());
    expect(saveCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed" }),
      expect.any(String),
      expect.any(String),
    );
  });

  it("executes non-gated tool and appends result to messages", async () => {
    mockMessagesCreate
      .mockResolvedValueOnce(
        toolUseResponse("readFile", { filePath: "/workspace/repo/src/index.ts" }),
      )
      .mockResolvedValueOnce(endTurnResponse());

    const ctx = makeCtx();
    const run = await runAgent(makeGoal(), ctx);
    expect(run.status).toBe("completed");
    // Second call should include the tool result in messages
    const secondCallMessages = mockMessagesCreate.mock.calls[1][0].messages;
    const hasToolResult = secondCallMessages.some(
      (m: any) => Array.isArray(m.content) && m.content.some((c: any) => c.type === "tool_result"),
    );
    expect(hasToolResult).toBe(true);
  });

  it("pauses and saves pending action when gated tool is called", async () => {
    mockMessagesCreate.mockResolvedValueOnce(
      gatedToolResponse("createIssue", { owner: "acme", repo: "app", title: "Bug", body: "details" }, "tu-gate-1"),
    );

    const run = await runAgent(makeGoal(), makeCtx());
    expect(run.status).toBe("paused");
    expect(savePendingAction).toHaveBeenCalledWith(
      expect.objectContaining({ tool: "createIssue", toolUseId: "tu-gate-1" }),
      expect.any(String),
      expect.any(String),
    );
  });

  it("saves paused checkpoint before returning on gated action", async () => {
    mockMessagesCreate.mockResolvedValueOnce(
      gatedToolResponse("createPR", { owner: "a", repo: "b", head: "fix", base: "main", title: "T", body: "" }),
    );

    await runAgent(makeGoal(), makeCtx());
    expect(saveCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({ status: "paused" }),
      expect.any(String),
      expect.any(String),
    );
  });

  it("stops after MAX_ITERATIONS (3) even if Claude keeps returning tool_use", async () => {
    // Return tool_use 4 times — should stop at iteration 3
    mockMessagesCreate.mockResolvedValue(
      toolUseResponse("listFiles", { dirPath: "/workspace/repo" }),
    );

    const run = await runAgent(makeGoal(), makeCtx());
    expect(mockMessagesCreate).toHaveBeenCalledTimes(3);
    expect(run.status).toBe("completed");
  });

  it("assigns a unique runId to each run", async () => {
    mockMessagesCreate.mockResolvedValue(endTurnResponse());
    const run1 = await runAgent(makeGoal(), makeCtx());
    const run2 = await runAgent(makeGoal(), makeCtx());
    expect(run1.runId).not.toBe(run2.runId);
  });

  it("carries the goal into the returned run", async () => {
    mockMessagesCreate.mockResolvedValueOnce(endTurnResponse());
    const goal = makeGoal({ type: "pull_request", context: { prNumber: 7 } });
    const run = await runAgent(goal, makeCtx());
    expect(run.goal.type).toBe("pull_request");
    expect(run.goal.context.prNumber).toBe(7);
  });

  it("returns failed status when Claude call throws", async () => {
    mockMessagesCreate.mockRejectedValueOnce(new Error("API down"));
    const run = await runAgent(makeGoal(), makeCtx());
    expect(run.status).toBe("failed");
    expect(run.error).toContain("API down");
  });

  it("saves checkpoint with running status between iterations", async () => {
    mockMessagesCreate
      .mockResolvedValueOnce(toolUseResponse("listFiles", { dirPath: "/workspace/repo" }))
      .mockResolvedValueOnce(endTurnResponse());

    await runAgent(makeGoal(), makeCtx());
    const calls = vi.mocked(saveCheckpoint).mock.calls;
    const statuses = calls.map((c) => c[0].status);
    expect(statuses).toContain("running");
  });
});
