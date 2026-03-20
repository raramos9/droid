import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Goal } from "../../src/types/agent";

const mockMessagesCreate = vi.hoisted(() => vi.fn());

vi.mock("@anthropic-ai/sdk", () => {
  const Anthropic = vi.fn().mockImplementation(function () {
    return { messages: { create: mockMessagesCreate } };
  });
  return { default: Anthropic };
});

const mockSaveCheckpoint = vi.hoisted(() => vi.fn());

vi.mock("../../src/agent/checkpoint", () => ({
  saveCheckpoint: mockSaveCheckpoint,
  loadCheckpoint: vi.fn(),
  savePendingAction: vi.fn().mockResolvedValue(undefined),
  createPendingRun: vi.fn().mockResolvedValue("pending-run-id"),
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
  mockSaveCheckpoint.mockReset();
  mockSaveCheckpoint.mockResolvedValue(undefined);
});

describe("mid-loop checkpoint save failure", () => {
  it("aborts the loop and sets status to failed", async () => {
    mockMessagesCreate.mockResolvedValue({
      stop_reason: "tool_use",
      content: [
        { type: "tool_use", id: "tu-1", name: "readFile", input: { filePath: "/workspace/repo/a.ts" } },
      ],
    });

    // First call (mid-loop checkpoint) fails; subsequent calls (error checkpoint) succeeds
    mockSaveCheckpoint
      .mockRejectedValueOnce(new Error("DB unavailable"))
      .mockResolvedValue(undefined);

    const run = await runAgent(makeGoal(), makeCtx());
    expect(run.status).toBe("failed");
    expect(run.error).toMatch(/checkpoint|fatal/i);
  });

  it("does not continue iterating after mid-loop checkpoint failure", async () => {
    mockMessagesCreate.mockResolvedValue({
      stop_reason: "tool_use",
      content: [
        { type: "tool_use", id: "tu-1", name: "readFile", input: { filePath: "/workspace/repo/a.ts" } },
      ],
    });

    mockSaveCheckpoint
      .mockRejectedValueOnce(new Error("DB unavailable"))
      .mockResolvedValue(undefined);

    await runAgent(makeGoal(), makeCtx());
    // Only 1 iteration ran (the one that failed) + 1 final error checkpoint
    expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
  });

  it("final error checkpoint failure is logged but does not throw", async () => {
    mockMessagesCreate.mockRejectedValueOnce(new Error("API error"));

    // Both the error checkpoint and any others fail
    mockSaveCheckpoint.mockRejectedValue(new Error("DB unavailable"));

    const run = await runAgent(makeGoal(), makeCtx());
    // Should complete without throwing despite checkpoint failure
    expect(run.status).toBe("failed");
  });
});
