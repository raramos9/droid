import { describe, it, expect, vi, beforeEach } from "vitest";
import { cloneRepo } from "../../src/lib/cloneRepo";

function makeSandbox() {
  return {
    exec: vi.fn().mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 }),
    readFile: vi.fn().mockResolvedValue({ content: "" }),
    writeFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
  } as any;
}

describe("cloneRepo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("writes git credentials file before cloning", async () => {
    const sandbox = makeSandbox();
    await cloneRepo(sandbox, "acme", "repo", "gh-tok");
    expect(sandbox.writeFile).toHaveBeenCalledWith(
      "/root/.git-credentials",
      expect.stringContaining("gh-tok"),
    );
  });

  it("does not include token in any exec command string", async () => {
    const sandbox = makeSandbox();
    await cloneRepo(sandbox, "acme", "repo", "super-secret-token");
    for (const call of sandbox.exec.mock.calls) {
      expect(call[0]).not.toContain("super-secret-token");
    }
  });

  it("configures git credential helper store", async () => {
    const sandbox = makeSandbox();
    await cloneRepo(sandbox, "acme", "repo", "gh-tok");
    const execCmds = sandbox.exec.mock.calls.map((c: any) => c[0] as string);
    expect(execCmds.some((cmd) => cmd.includes("credential.helper"))).toBe(true);
  });

  it("clones repo to /workspace/repo", async () => {
    const sandbox = makeSandbox();
    await cloneRepo(sandbox, "acme", "repo", "gh-tok");
    const execCmds = sandbox.exec.mock.calls.map((c: any) => c[0] as string);
    expect(execCmds.some((cmd) => cmd.includes("git clone") && cmd.includes("acme/repo") && cmd.includes("/workspace/repo"))).toBe(true);
  });

  it("throws a clear error when clone fails", async () => {
    const sandbox = makeSandbox();
    sandbox.exec
      .mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 }) // credential helper
      .mockResolvedValueOnce({ stdout: "", stderr: "Repository not found", exitCode: 128 }); // clone
    await expect(cloneRepo(sandbox, "acme", "repo", "gh-tok")).rejects.toThrow(/clone failed/i);
  });

  it("throws and includes stderr in error message on failure", async () => {
    const sandbox = makeSandbox();
    sandbox.exec
      .mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 })
      .mockResolvedValueOnce({ stdout: "", stderr: "auth error", exitCode: 128 });
    await expect(cloneRepo(sandbox, "acme", "repo", "gh-tok")).rejects.toThrow("auth error");
  });

  it("throws when git credential helper config fails", async () => {
    const sandbox = makeSandbox();
    sandbox.exec.mockResolvedValueOnce({ stdout: "", stderr: "permission denied", exitCode: 1 });
    await expect(cloneRepo(sandbox, "acme", "repo", "gh-tok")).rejects.toThrow(/credential helper/i);
  });

  it("clones the correct owner/repo into the URL", async () => {
    const sandbox = makeSandbox();
    await cloneRepo(sandbox, "myorg", "myproject", "tok");
    const cloneCmd = sandbox.exec.mock.calls
      .map((c: any) => c[0] as string)
      .find((cmd) => cmd.includes("git clone"))!;
    expect(cloneCmd).toContain("myorg/myproject");
  });
});
