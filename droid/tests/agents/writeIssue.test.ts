import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@octokit/rest", () => {
  const Octokit = vi.fn().mockImplementation(function () {
    return {
      repos: { compareCommits: vi.fn().mockResolvedValue({ data: { files: [] } }) },
      issues: { create: vi.fn().mockResolvedValue({ data: { number: 1 } }) },
      pulls: { create: vi.fn().mockResolvedValue({ data: { number: 2 } }) },
    };
  });
  return { Octokit };
});

vi.mock("@anthropic-ai/sdk", () => {
  const Anthropic = vi.fn().mockImplementation(function () {
    return {
      messages: {
        parse: vi.fn().mockResolvedValue({
          parsed_output: [],
          usage: { input_tokens: 10, output_tokens: 20 },
        }),
      },
      beta: {
        messages: { toolRunner: vi.fn().mockResolvedValue({}) },
      },
    };
  });
  return { default: Anthropic };
});

vi.mock("../../src/lib/gitCredentials", () => ({
  setupGitCredentials: vi.fn().mockResolvedValue("https://github.com/acme/repo.git"),
}));

vi.mock("../../src/lib/repoHelpers", () => ({
  MAX_ISSUES: 3,
  buildSandboxId: vi.fn((after: string) => `issue-analysis-${after.slice(0, 8)}`),
  buildFileList: vi.fn().mockReturnValue([]),
  hasGitChanges: vi.fn().mockResolvedValue(false),
  findPackageJson: vi.fn().mockResolvedValue(null),
}));

import { writeIssueAgent } from "../../src/agents/writeIssue";
import { setupGitCredentials } from "../../src/lib/gitCredentials";

function makeSandbox() {
  return {
    exec: vi.fn().mockResolvedValue({ exitCode: 0, stdout: "", stderr: "" }),
    readFile: vi.fn().mockResolvedValue({ content: "code" }),
    writeFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
  } as any;
}

function makeCtx(sandbox = makeSandbox()) {
  return { sandbox, githubToken: "tok", anthropicApiKey: "ak" };
}

const pushPayload = {
  repository: { owner: { login: "acme" }, name: "repo" },
  ref: "refs/heads/main",
  before: "aaa",
  after: "def12345xyz",
};

describe("writeIssueAgent", () => {
  it("has name writeIssue", () => {
    expect(writeIssueAgent.name).toBe("writeIssue");
  });

  it("declares expected tools", () => {
    expect(writeIssueAgent.tools).toContain("readFile");
    expect(writeIssueAgent.tools).toContain("writeFile");
    expect(writeIssueAgent.tools).toContain("runTests");
    expect(writeIssueAgent.tools).toContain("createDirectory");
  });

  it("inputSchema accepts valid push payload", () => {
    expect(() => writeIssueAgent.inputSchema.parse(pushPayload)).not.toThrow();
  });

  it("inputSchema rejects missing after field", () => {
    const bad = { repository: { owner: { login: "a" }, name: "b" }, ref: "r", before: "x" };
    expect(() => writeIssueAgent.inputSchema.parse(bad)).toThrow();
  });

  it("uses setupGitCredentials — not a raw token URL", async () => {
    const ctx = makeCtx();
    await writeIssueAgent.run(pushPayload, ctx);
    expect(setupGitCredentials).toHaveBeenCalledWith(
      ctx.sandbox,
      "tok",
      "acme",
      "repo",
    );
  });

  it("does NOT call sandbox.destroy (harness owns lifecycle)", async () => {
    const sandbox = makeSandbox();
    await writeIssueAgent.run(pushPayload, makeCtx(sandbox));
    expect(sandbox.destroy).not.toHaveBeenCalled();
  });

  it("returns AgentResult with success true when no issues found", async () => {
    const result = await writeIssueAgent.run(pushPayload, makeCtx());
    expect(result.success).toBe(true);
    expect(Array.isArray(result.artifacts)).toBe(true);
  });

  it("returns success false on error", async () => {
    const sandbox = makeSandbox();
    sandbox.exec.mockRejectedValueOnce(new Error("clone failed"));
    const result = await writeIssueAgent.run(pushPayload, makeCtx(sandbox));
    expect(result.success).toBe(false);
    expect(result.error).toContain("clone failed");
  });
});
