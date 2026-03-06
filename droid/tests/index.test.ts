import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/lib/verify", () => ({
  verifySignature: vi.fn().mockResolvedValue(true),
}));

vi.mock("../src/harness/index", () => ({
  runDroidAgent: vi.fn().mockResolvedValue({ status: "completed", artifacts: [] }),
}));

vi.mock("@cloudflare/sandbox", () => ({
  proxyToSandbox: vi.fn().mockResolvedValue(null),
  getSandbox: vi.fn(),
}));

vi.mock("../src/agent/checkpoint", () => ({
  loadCheckpoint: vi.fn(),
  savePendingAction: vi.fn(),
}));

import worker from "../src/index";
import { verifySignature } from "../src/lib/verify";
import { runDroidAgent } from "../src/harness/index";

const env = {
  Sandbox: {} as any,
  GITHUB_TOKEN: "tok",
  ANTHROPIC_API_KEY: "ak",
  WEBHOOK_SECRET: "sec",
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_SERVICE_KEY: "svc-key",
};

function makeCtx() {
  return { waitUntil: vi.fn() } as any;
}

function makeRequest(event: string, body: object, headers: Record<string, string> = {}) {
  return new Request("https://droid.dev/webhook", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "x-github-event": event,
      "x-hub-signature-256": "sha256=abc",
      ...headers,
    },
  });
}

const pushBody = {
  repository: { owner: { login: "acme" }, name: "repo" },
  ref: "refs/heads/main",
  before: "aaa",
  after: "bbb12345",
};

const prBody = {
  action: "opened",
  pull_request: { number: 1, title: "Fix bug", head: { ref: "fix", sha: "a" }, base: { ref: "main", sha: "b" } },
  repository: { owner: { login: "acme" }, name: "repo" },
};

describe("fetch handler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 for invalid signature", async () => {
    vi.mocked(verifySignature).mockResolvedValueOnce(false);
    const req = makeRequest("push", pushBody);
    const res = await worker.fetch(req, env, makeCtx());
    expect(res.status).toBe(401);
  });

  it("dispatches push event via waitUntil", async () => {
    const ctx = makeCtx();
    await worker.fetch(makeRequest("push", pushBody), env, ctx);
    expect(ctx.waitUntil).toHaveBeenCalledOnce();
  });

  it("dispatches PR opened event via waitUntil", async () => {
    const ctx = makeCtx();
    await worker.fetch(makeRequest("pull_request", prBody), env, ctx);
    expect(ctx.waitUntil).toHaveBeenCalledOnce();
  });

  it("returns Event ignored for unhandled events", async () => {
    const ctx = makeCtx();
    const req = makeRequest("star", {});
    const res = await worker.fetch(req, env, ctx);
    const json = await res.json() as any;
    expect(json.message).toMatch(/ignored/i);
    expect(ctx.waitUntil).not.toHaveBeenCalled();
  });

  it("returns 200 JSON for valid push", async () => {
    const ctx = makeCtx();
    const res = await worker.fetch(makeRequest("push", pushBody), env, ctx);
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.message).toBeTruthy();
  });

  it("dev bypass skips signature verification", async () => {
    const ctx = makeCtx();
    const res = await worker.fetch(makeRequest("push", pushBody, { "x-dev-bypass": "true" }), env, ctx);
    expect(verifySignature).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });
});
