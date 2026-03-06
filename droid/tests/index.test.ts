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
import { loadCheckpoint } from "../src/agent/checkpoint";

const env = {
  Sandbox: {} as any,
  GITHUB_TOKEN: "tok",
  ANTHROPIC_API_KEY: "ak",
  WEBHOOK_SECRET: "sec",
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_SERVICE_KEY: "svc-key",
  RESUME_API_KEY: "resume-secret",
  ENVIRONMENT: "production",
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

const pausedCheckpoint = {
  runId: "run-1",
  goal: { type: "push" as const, repo: { owner: "acme", name: "app" }, context: {} },
  status: "paused" as const,
  messages: [],
  iteration: 1,
  artifacts: [],
};

describe("fetch handler — webhook", () => {
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

  it("returns 400 for malformed JSON body", async () => {
    const req = new Request("https://droid.dev/webhook", {
      method: "POST",
      body: "not-json",
      headers: {
        "content-type": "application/json",
        "x-github-event": "push",
        "x-hub-signature-256": "sha256=abc",
      },
    });
    const res = await worker.fetch(req, env, makeCtx());
    expect(res.status).toBe(400);
  });
});

describe("fetch handler — dev bypass", () => {
  beforeEach(() => vi.clearAllMocks());

  it("x-dev-bypass is ignored in production (verifySignature is still called)", async () => {
    vi.mocked(verifySignature).mockResolvedValueOnce(false);
    const ctx = makeCtx();
    const req = makeRequest("push", pushBody, { "x-dev-bypass": "true" });
    const res = await worker.fetch(req, { ...env, ENVIRONMENT: "production" }, ctx);
    expect(res.status).toBe(401);
    expect(verifySignature).toHaveBeenCalledOnce();
  });

  it("x-dev-bypass works when ENVIRONMENT is development", async () => {
    const ctx = makeCtx();
    const res = await worker.fetch(makeRequest("push", pushBody, { "x-dev-bypass": "true" }), { ...env, ENVIRONMENT: "development" }, ctx);
    expect(verifySignature).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });
});

describe("fetch handler — /resume", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadCheckpoint).mockResolvedValue(pausedCheckpoint as any);
  });

  function makeResumeRequest(body: object, headers: Record<string, string> = {}) {
    return new Request("https://droid.dev/resume/run-1", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json", ...headers },
    });
  }

  const authHeader = { authorization: `Bearer ${env.RESUME_API_KEY}` };

  it("returns 401 when Authorization header is missing", async () => {
    const res = await worker.fetch(makeResumeRequest({ toolUseId: "tu-1", result: "ok" }), env, makeCtx());
    expect(res.status).toBe(401);
  });

  it("returns 401 when Authorization header is wrong", async () => {
    const res = await worker.fetch(
      makeResumeRequest({ toolUseId: "tu-1", result: "ok" }, { authorization: "Bearer wrong-key" }),
      env,
      makeCtx(),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for malformed JSON body", async () => {
    const res = await worker.fetch(
      new Request("https://droid.dev/resume/run-1", {
        method: "POST",
        body: "not-json",
        headers: { "content-type": "application/json", ...authHeader },
      }),
      env,
      makeCtx(),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when toolUseId is missing", async () => {
    const res = await worker.fetch(
      makeResumeRequest({ result: "approved" }, authHeader),
      env,
      makeCtx(),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when result is missing", async () => {
    const res = await worker.fetch(
      makeResumeRequest({ toolUseId: "tu-1" }, authHeader),
      env,
      makeCtx(),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when checkpoint is not paused", async () => {
    vi.mocked(loadCheckpoint).mockResolvedValueOnce({ ...pausedCheckpoint, status: "completed" } as any);
    const res = await worker.fetch(
      makeResumeRequest({ toolUseId: "tu-1", result: "ok" }, authHeader),
      env,
      makeCtx(),
    );
    expect(res.status).toBe(400);
  });

  it("proceeds and calls waitUntil with correct auth and paused checkpoint", async () => {
    const ctx = makeCtx();
    const res = await worker.fetch(
      makeResumeRequest({ toolUseId: "tu-1", result: "approved" }, authHeader),
      env,
      ctx,
    );
    expect(res.status).toBe(200);
    expect(ctx.waitUntil).toHaveBeenCalledOnce();
  });
});
