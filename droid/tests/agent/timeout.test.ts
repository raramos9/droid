import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Goal } from "../../src/types/agent";

const mockMessagesCreate = vi.hoisted(() => vi.fn());

vi.mock("@anthropic-ai/sdk", () => {
  const Anthropic = vi.fn().mockImplementation(function () {
    return { messages: { create: mockMessagesCreate } };
  });
  return { default: Anthropic };
});

const mockSaveCheckpointTimeout = vi.hoisted(() => vi.fn());
vi.mock("../../src/agent/checkpoint", () => ({
  saveCheckpoint: mockSaveCheckpointTimeout,
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
  mockSaveCheckpointTimeout.mockReset();
  mockSaveCheckpointTimeout.mockResolvedValue(undefined);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Anthropic API call timeout", () => {
  it("completes normally when response arrives before timeout", async () => {
    mockMessagesCreate.mockResolvedValue({ stop_reason: "end_turn", content: [] });

    const runPromise = runAgent(makeGoal(), makeCtx());
    await vi.advanceTimersByTimeAsync(1_000);
    const run = await runPromise;
    expect(run.status).toBe("completed");
  });

  it("times out and sets run status to failed after 60s", async () => {
    mockMessagesCreate.mockImplementation(() => new Promise(() => {}));

    const runPromise = runAgent(makeGoal(), makeCtx());
    await vi.advanceTimersByTimeAsync(61_000);
    const run = await runPromise;
    expect(run.status).toBe("failed");
    expect(run.error).toMatch(/timeout|timed out/i);
  });

  it("saves failed checkpoint on timeout", async () => {
    mockMessagesCreate.mockImplementation(() => new Promise(() => {}));

    const runPromise = runAgent(makeGoal(), makeCtx());
    await vi.advanceTimersByTimeAsync(61_000);
    await runPromise;
    expect(mockSaveCheckpointTimeout).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed" }),
      expect.any(String),
      expect.any(String),
    );
  });
});
