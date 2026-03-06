import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AgentRun, PendingAction } from "../../src/types/agent";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import {
  saveCheckpoint,
  loadCheckpoint,
  savePendingAction,
} from "../../src/agent/checkpoint";

const SUPABASE_URL = "https://test.supabase.co";
const SUPABASE_KEY = "service-key";

function makeRun(overrides: Partial<AgentRun> = {}): AgentRun {
  return {
    runId: "run-1",
    goal: {
      type: "push",
      repo: { owner: "acme", name: "app" },
      context: { sha: "abc123" },
    },
    status: "running",
    messages: [],
    iteration: 0,
    artifacts: [],
    ...overrides,
  };
}

function makePendingAction(overrides: Partial<PendingAction> = {}): PendingAction {
  return {
    runId: "run-1",
    toolUseId: "tu-1",
    tool: "createIssue",
    args: { owner: "acme", repo: "app", title: "Bug", body: "details" },
    status: "pending",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue([]) });
});

// ── saveCheckpoint ────────────────────────────────────────────────────────────

describe("saveCheckpoint", () => {
  it("upserts to agent_runs table via Supabase REST", async () => {
    await saveCheckpoint(makeRun(), SUPABASE_URL, SUPABASE_KEY);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("agent_runs"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("sends Authorization header with service key", async () => {
    await saveCheckpoint(makeRun(), SUPABASE_URL, SUPABASE_KEY);
    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers["Authorization"]).toBe(`Bearer ${SUPABASE_KEY}`);
  });

  it("sends Prefer: resolution=merge-duplicates for upsert", async () => {
    await saveCheckpoint(makeRun(), SUPABASE_URL, SUPABASE_KEY);
    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers["Prefer"]).toContain("resolution=merge-duplicates");
  });

  it("serializes run body as JSON", async () => {
    const run = makeRun({ runId: "run-xyz", status: "paused", iteration: 2 });
    await saveCheckpoint(run, SUPABASE_URL, SUPABASE_KEY);
    const [, opts] = mockFetch.mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.run_id).toBe("run-xyz");
    expect(body.status).toBe("paused");
    expect(body.iteration).toBe(2);
  });

  it("throws when Supabase returns non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, text: vi.fn().mockResolvedValue("error") });
    await expect(saveCheckpoint(makeRun(), SUPABASE_URL, SUPABASE_KEY)).rejects.toThrow();
  });
});

// ── loadCheckpoint ────────────────────────────────────────────────────────────

describe("loadCheckpoint", () => {
  it("queries agent_runs by run_id", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue([
        {
          run_id: "run-1",
          goal: { type: "push", repo: { owner: "acme", name: "app" }, context: {} },
          status: "paused",
          messages: [],
          iteration: 1,
          artifacts: [],
        },
      ]),
    });
    const run = await loadCheckpoint("run-1", SUPABASE_URL, SUPABASE_KEY);
    expect(run.runId).toBe("run-1");
    expect(run.status).toBe("paused");
    expect(run.iteration).toBe(1);
  });

  it("queries with run_id filter in URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue([
        {
          run_id: "run-42",
          goal: { type: "push", repo: { owner: "a", name: "b" }, context: {} },
          status: "running",
          messages: [],
          iteration: 0,
          artifacts: [],
        },
      ]),
    });
    await loadCheckpoint("run-42", SUPABASE_URL, SUPABASE_KEY);
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("run-42");
  });

  it("throws when run not found", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue([]) });
    await expect(loadCheckpoint("missing", SUPABASE_URL, SUPABASE_KEY)).rejects.toThrow();
  });

  it("throws when Supabase returns non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, text: vi.fn().mockResolvedValue("not found") });
    await expect(loadCheckpoint("run-1", SUPABASE_URL, SUPABASE_KEY)).rejects.toThrow();
  });
});

// ── savePendingAction ─────────────────────────────────────────────────────────

describe("savePendingAction", () => {
  it("inserts into pending_actions table", async () => {
    await savePendingAction(makePendingAction(), SUPABASE_URL, SUPABASE_KEY);
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("pending_actions");
  });

  it("sends Authorization header", async () => {
    await savePendingAction(makePendingAction(), SUPABASE_URL, SUPABASE_KEY);
    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers["Authorization"]).toBe(`Bearer ${SUPABASE_KEY}`);
  });

  it("serializes action body correctly", async () => {
    const action = makePendingAction({ tool: "createPR", toolUseId: "tu-99" });
    await savePendingAction(action, SUPABASE_URL, SUPABASE_KEY);
    const [, opts] = mockFetch.mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.tool).toBe("createPR");
    expect(body.tool_use_id).toBe("tu-99");
    expect(body.status).toBe("pending");
  });

  it("throws when Supabase returns non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, text: vi.fn().mockResolvedValue("error") });
    await expect(savePendingAction(makePendingAction(), SUPABASE_URL, SUPABASE_KEY)).rejects.toThrow();
  });
});
