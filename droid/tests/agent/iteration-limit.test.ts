import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Goal } from "../../src/types/agent";

const mockMessagesCreate = vi.hoisted(() => vi.fn());

vi.mock("@anthropic-ai/sdk", () => {
  const Anthropic = vi.fn().mockImplementation(function () {
    return { messages: { create: mockMessagesCreate } };
  });
  return { default: Anthropic };
});

const mockSaveCheckpointIter = vi.hoisted(() => vi.fn());
vi.mock("../../src/agent/checkpoint", () => ({
  saveCheckpoint: mockSaveCheckpointIter,
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
  mockSaveCheckpointIter.mockReset();
  mockSaveCheckpointIter.mockResolvedValue(undefined);
});

describe("iteration limit artifact", () => {
  it("pushes iteration_limit_reached artifact when limit hit and stop was not end_turn", async () => {
    // Always returns tool_use (never end_turn), exhausting MAX_ITERATIONS
    mockMessagesCreate.mockResolvedValue({
      stop_reason: "tool_use",
      content: [
        { type: "tool_use", id: "tu-1", name: "readFile", input: { filePath: "/workspace/repo/a.ts" } },
      ],
    });

    const run = await runAgent(makeGoal(), makeCtx());
    expect(run.status).toBe("completed");
    expect(run.artifacts).toContain("iteration_limit_reached");
  });

  it("does not push iteration_limit_reached artifact on normal end_turn completion", async () => {
    mockMessagesCreate.mockResolvedValueOnce({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "done" }],
    });

    const run = await runAgent(makeGoal(), makeCtx());
    expect(run.status).toBe("completed");
    expect(run.artifacts).not.toContain("iteration_limit_reached");
  });
});
