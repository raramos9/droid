import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Goal } from "../../src/types/agent";

// ── Mock Anthropic ────────────────────────────────────────────────────────────

const mockMessagesCreate = vi.hoisted(() => vi.fn());

vi.mock("@anthropic-ai/sdk", () => {
  const Anthropic = vi.fn().mockImplementation(function () {
    return { messages: { create: mockMessagesCreate } };
  });
  return { default: Anthropic };
});

// ── Mock checkpoint ───────────────────────────────────────────────────────────

const mockSaveCheckpoint = vi.hoisted(() => vi.fn());
const mockSavePendingAction = vi.hoisted(() => vi.fn());

vi.mock("../../src/agent/checkpoint", () => ({
  saveCheckpoint: mockSaveCheckpoint,
  loadCheckpoint: vi.fn(),
  savePendingAction: mockSavePendingAction,
  createPendingRun: vi.fn(),
}));

import { runAgent } from "../../src/agent/index";

function makeGoal(): Goal {
  return {
    type: "issue_created",
    repo: { owner: "acme", name: "app" },
    context: { issueNumber: 1 },
  };
}

function makeCtx() {
  return {
    sandbox: {
      exec: vi.fn().mockResolvedValue({ stdout: "ok", stderr: "", exitCode: 0 }),
      readFile: vi.fn().mockResolvedValue({ content: "file content" }),
      writeFile: vi.fn().mockResolvedValue(undefined),
      mkdir: vi.fn().mockResolvedValue(undefined),
    } as any,
    octokit: {
      issues: { get: vi.fn(), list: vi.fn(), create: vi.fn(), createComment: vi.fn() },
      pulls: { get: vi.fn(), create: vi.fn(), merge: vi.fn() },
      repos: { compareCommits: vi.fn() },
    } as any,
    anthropicApiKey: "test-key",
    supabaseUrl: "https://test.supabase.co",
    supabaseKey: "svc-key",
  };
}

beforeEach(() => {
  mockMessagesCreate.mockReset();
  mockMessagesCreate.mockResolvedValue({ stop_reason: "end_turn", content: [] });
  mockSaveCheckpoint.mockReset();
  mockSaveCheckpoint.mockResolvedValue(undefined);
  mockSavePendingAction.mockReset();
  mockSavePendingAction.mockResolvedValue(undefined);
});

describe("parallel read-only tool execution", () => {
  it("both read-only tools in a batch produce results", async () => {
    const ctx = makeCtx();
    ctx.sandbox.readFile.mockResolvedValue({ content: "content" });

    mockMessagesCreate
      .mockResolvedValueOnce({
        stop_reason: "tool_use",
        content: [
          { type: "tool_use", id: "tu-1", name: "readFile", input: { filePath: "/workspace/repo/a.ts" } },
          { type: "tool_use", id: "tu-2", name: "readFile", input: { filePath: "/workspace/repo/b.ts" } },
        ],
      })
      .mockResolvedValueOnce({
        stop_reason: "end_turn",
        content: [{ type: "text", text: "done" }],
      });

    const run = await runAgent(makeGoal(), ctx);

    expect(run.status).toBe("completed");
    expect(ctx.sandbox.readFile).toHaveBeenCalledTimes(2);
  });

  it("result ordering matches original tool_use block order", async () => {
    const ctx = makeCtx();
    ctx.sandbox.readFile
      .mockResolvedValueOnce({ content: "content-a" })
      .mockResolvedValueOnce({ content: "content-b" });

    mockMessagesCreate
      .mockResolvedValueOnce({
        stop_reason: "tool_use",
        content: [
          { type: "tool_use", id: "tu-1", name: "readFile", input: { filePath: "/workspace/repo/a.ts" } },
          { type: "tool_use", id: "tu-2", name: "readFile", input: { filePath: "/workspace/repo/b.ts" } },
        ],
      })
      .mockResolvedValueOnce({
        stop_reason: "end_turn",
        content: [{ type: "text", text: "done" }],
      });

    const run = await runAgent(makeGoal(), ctx);

    const toolResultMsg = run.messages.find(
      (m) => m.role === "user" && Array.isArray(m.content) &&
        (m.content as any[]).some((b: any) => b.type === "tool_result"),
    );
    const results = toolResultMsg!.content as any[];
    expect(results[0].tool_use_id).toBe("tu-1");
    expect(results[1].tool_use_id).toBe("tu-2");
  });

  it("write tool runs after read-only tools complete", async () => {
    const ctx = makeCtx();
    ctx.sandbox.readFile.mockResolvedValue({ content: "content" });
    ctx.sandbox.writeFile.mockResolvedValue(undefined);

    mockMessagesCreate
      .mockResolvedValueOnce({
        stop_reason: "tool_use",
        content: [
          { type: "tool_use", id: "tu-read", name: "readFile", input: { filePath: "/workspace/repo/a.ts" } },
          { type: "tool_use", id: "tu-write", name: "writeFile", input: { filePath: "/workspace/repo/b.ts", content: "x" } },
        ],
      })
      .mockResolvedValueOnce({
        stop_reason: "end_turn",
        content: [{ type: "text", text: "done" }],
      });

    const run = await runAgent(makeGoal(), ctx);
    expect(run.status).toBe("completed");
    expect(ctx.sandbox.readFile).toHaveBeenCalled();
    expect(ctx.sandbox.writeFile).toHaveBeenCalled();
  });

  it("gated tool returns paused status with read-only tools in same batch", async () => {
    const ctx = makeCtx();
    ctx.sandbox.readFile.mockResolvedValue({ content: "content" });

    mockMessagesCreate.mockResolvedValueOnce({
      stop_reason: "tool_use",
      content: [
        { type: "tool_use", id: "tu-read", name: "readFile", input: { filePath: "/workspace/repo/a.ts" } },
        { type: "tool_use", id: "tu-push", name: "pushCode", input: { repoPath: "/workspace/repo", branch: "main", message: "feat" } },
      ],
    });

    const run = await runAgent(makeGoal(), ctx);
    expect(run.status).toBe("paused");
    expect(mockSavePendingAction).toHaveBeenCalled();
  });

  it("one read-only error does not prevent other read-only tools from completing", async () => {
    const ctx = makeCtx();
    ctx.sandbox.readFile
      .mockRejectedValueOnce(new Error("file not found"))
      .mockResolvedValueOnce({ content: "content" });

    mockMessagesCreate
      .mockResolvedValueOnce({
        stop_reason: "tool_use",
        content: [
          { type: "tool_use", id: "tu-1", name: "readFile", input: { filePath: "/workspace/repo/a.ts" } },
          { type: "tool_use", id: "tu-2", name: "readFile", input: { filePath: "/workspace/repo/b.ts" } },
        ],
      })
      .mockResolvedValueOnce({
        stop_reason: "end_turn",
        content: [{ type: "text", text: "done" }],
      });

    const run = await runAgent(makeGoal(), ctx);
    expect(run.status).toBe("completed");

    const toolResultMsg = run.messages.find(
      (m) => m.role === "user" && Array.isArray(m.content) &&
        (m.content as any[]).some((b: any) => b.type === "tool_result"),
    );
    const results = toolResultMsg!.content as any[];
    expect(results.some((r: any) => r.content.includes("file not found"))).toBe(true);
    expect(results.some((r: any) => r.content === "content")).toBe(true);
  });
});
