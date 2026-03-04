import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@octokit/rest", () => {
  const Octokit = vi.fn().mockImplementation(function () {
    return {
      repos: { compareCommits: vi.fn().mockResolvedValue({ data: { files: [] } }) },
      issues: { createComment: vi.fn().mockResolvedValue({}) },
    };
  });
  return { Octokit };
});

vi.mock("@anthropic-ai/sdk", () => {
  const Anthropic = vi.fn().mockImplementation(function () {
    return {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: "LGTM" }],
          usage: { input_tokens: 5, output_tokens: 10 },
        }),
      },
    };
  });
  return { default: Anthropic };
});

vi.mock("../../src/lib/gitCredentials", () => ({
  setupGitCredentials: vi.fn().mockResolvedValue("https://github.com/acme/repo.git"),
}));

vi.mock("../../src/lib/repoHelpers", () => ({
  buildFileList: vi.fn().mockReturnValue([]),
}));

import { reviewPRAgent } from "../../src/agents/reviewPR";
import { setupGitCredentials } from "../../src/lib/gitCredentials";

function makeSandbox() {
  return {
    exec: vi.fn().mockResolvedValue({ exitCode: 0, stdout: "", stderr: "" }),
    readFile: vi.fn().mockResolvedValue({ content: "code" }),
    destroy: vi.fn().mockResolvedValue(undefined),
  } as any;
}

function makeCtx(sandbox = makeSandbox()) {
  return { sandbox, githubToken: "tok", anthropicApiKey: "ak" };
}

const prPayload = {
  action: "opened",
  pull_request: {
    number: 42,
    title: "fix: something",
    head: { ref: "fix/foo", sha: "aaa111bbb" },
    base: { ref: "main", sha: "bbb222ccc" },
  },
  repository: { owner: { login: "acme" }, name: "repo" },
};

describe("reviewPRAgent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("has name reviewPR", () => {
    expect(reviewPRAgent.name).toBe("reviewPR");
  });

  it("inputSchema accepts valid PR payload", () => {
    expect(() => reviewPRAgent.inputSchema.parse(prPayload)).not.toThrow();
  });

  it("inputSchema rejects payload missing pull_request", () => {
    expect(() =>
      reviewPRAgent.inputSchema.parse({ action: "opened", repository: {} }),
    ).toThrow();
  });

  it("uses setupGitCredentials — not a raw token URL", async () => {
    const ctx = makeCtx();
    await reviewPRAgent.run(prPayload, ctx);
    expect(setupGitCredentials).toHaveBeenCalledWith(ctx.sandbox, "tok", "acme", "repo");
  });

  it("does NOT call sandbox.destroy (harness owns lifecycle)", async () => {
    const sandbox = makeSandbox();
    await reviewPRAgent.run(prPayload, makeCtx(sandbox));
    expect(sandbox.destroy).not.toHaveBeenCalled();
  });

  it("returns success true with review in artifacts", async () => {
    const result = await reviewPRAgent.run(prPayload, makeCtx());
    expect(result.success).toBe(true);
    expect(result.artifacts.some((a) => a.includes("LGTM") || a.includes("review"))).toBe(true);
  });

  it("returns success false on clone error", async () => {
    const sandbox = makeSandbox();
    sandbox.exec.mockRejectedValueOnce(new Error("clone failed"));
    const result = await reviewPRAgent.run(prPayload, makeCtx(sandbox));
    expect(result.success).toBe(false);
    expect(result.error).toContain("clone failed");
  });

  it("uses model claude-sonnet-4-6 not 4-5", async () => {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const mockInstance = (Anthropic as any).mock.results[0]?.value;
    // Recreate a fresh instance to capture the call
    const sandbox = makeSandbox();
    await reviewPRAgent.run(prPayload, makeCtx(sandbox));
    const lastInstance = (Anthropic as any).mock.results.at(-1)?.value;
    const createCalls = lastInstance?.messages?.create?.mock?.calls ?? [];
    for (const [args] of createCalls) {
      expect(args.model).not.toBe("claude-sonnet-4-5");
      expect(args.model).toBe("claude-sonnet-4-6");
    }
  });
});
