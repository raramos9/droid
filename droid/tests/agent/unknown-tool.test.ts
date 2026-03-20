import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Goal } from "../../src/types/agent";

const mockMessagesCreate = vi.hoisted(() => vi.fn());

vi.mock("@anthropic-ai/sdk", () => {
  const Anthropic = vi.fn().mockImplementation(function () {
    return { messages: { create: mockMessagesCreate } };
  });
  return { default: Anthropic };
});

const mockSaveCheckpoint2 = vi.hoisted(() => vi.fn());
vi.mock("../../src/agent/checkpoint", () => ({
  saveCheckpoint: mockSaveCheckpoint2,
  loadCheckpoint: vi.fn(),
  savePendingAction: vi.fn(),
  createPendingRun: vi.fn(),
}));

import { runAgent } from "../../src/agent/index";

function makeGoal(): Goal {
  return {
    type: "issue_created",
    repo: { owner: "acme", name: "app" },
    context: {},
  };
}

function makeCtx() {
  return {
    sandbox: {
      exec: vi.fn().mockResolvedValue({ stdout: "ok", stderr: "", exitCode: 0 }),
      readFile: vi.fn().mockResolvedValue({ content: "content" }),
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
  mockSaveCheckpoint2.mockReset();
  mockSaveCheckpoint2.mockResolvedValue(undefined);
});

describe("unknown tool error feedback", () => {
  it("returns error result listing available tools for unknown tool", async () => {
    mockMessagesCreate.mockResolvedValueOnce({
      stop_reason: "tool_use",
      content: [
        { type: "tool_use", id: "tu-unknown", name: "nonExistentTool", input: {} },
      ],
    });
    mockMessagesCreate.mockResolvedValueOnce({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "understood" }],
    });

    const run = await runAgent(makeGoal(), makeCtx());

    const toolResultMsg = run.messages.find(
      (m) => m.role === "user" && Array.isArray(m.content) &&
        (m.content as any[]).some((b: any) => b.type === "tool_result"),
    );
    expect(toolResultMsg).toBeDefined();
    const resultContent = (toolResultMsg!.content as any[]).find(
      (b: any) => b.tool_use_id === "tu-unknown",
    )?.content;
    expect(resultContent).toBeDefined();
    expect(resultContent).toMatch(/unknown tool|not found|available/i);
  });

  it("other tools in same batch still execute when one is unknown", async () => {
    const ctx = makeCtx();
    ctx.sandbox.readFile.mockResolvedValue({ content: "file content" });

    mockMessagesCreate.mockResolvedValueOnce({
      stop_reason: "tool_use",
      content: [
        { type: "tool_use", id: "tu-unknown", name: "phantomTool", input: {} },
        { type: "tool_use", id: "tu-read", name: "readFile", input: { filePath: "/workspace/repo/a.ts" } },
      ],
    });
    mockMessagesCreate.mockResolvedValueOnce({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "done" }],
    });

    const run = await runAgent(makeGoal(), ctx);
    expect(run.status).toBe("completed");
    expect(ctx.sandbox.readFile).toHaveBeenCalled();
  });

  it("run does not abort on unknown tool", async () => {
    mockMessagesCreate.mockResolvedValueOnce({
      stop_reason: "tool_use",
      content: [{ type: "tool_use", id: "tu-unknown", name: "nope", input: {} }],
    });
    mockMessagesCreate.mockResolvedValueOnce({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "ok" }],
    });

    const run = await runAgent(makeGoal(), makeCtx());
    expect(run.status).toBe("completed");
  });
});
