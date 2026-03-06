import { describe, it, expect, vi, beforeEach } from "vitest";
import { setupGitCredentials } from "../../src/lib/gitCredentials";

function makeSandbox(overrides: Partial<{ writeFile: any; exec: any }> = {}) {
  return {
    writeFile: vi.fn().mockResolvedValue(undefined),
    exec: vi.fn().mockResolvedValue({ exitCode: 0, stdout: "", stderr: "" }),
    ...overrides,
  };
}

describe("setupGitCredentials", () => {
  const TOKEN = "ghp_testtoken123";
  const OWNER = "acme";
  const REPO = "my-repo";

  it("writes credentials to /root/.git-credentials", async () => {
    const sandbox = makeSandbox();
    await setupGitCredentials(sandbox as any, TOKEN, OWNER, REPO);
    expect(sandbox.writeFile).toHaveBeenCalledWith(
      "/root/.git-credentials",
      `https://x-access-token:${TOKEN}@github.com\n`,
    );
  });

  it("configures credential.helper store", async () => {
    const sandbox = makeSandbox();
    await setupGitCredentials(sandbox as any, TOKEN, OWNER, REPO);
    const execCalls = sandbox.exec.mock.calls.map((c: any[]) => c[0]);
    expect(execCalls.some((cmd: string) => cmd.includes("credential.helper") && cmd.includes("store"))).toBe(true);
  });

  it("returns a clone URL with no token", async () => {
    const sandbox = makeSandbox();
    const url = await setupGitCredentials(sandbox as any, TOKEN, OWNER, REPO);
    expect(url).toBe(`https://github.com/${OWNER}/${REPO}.git`);
    expect(url).not.toContain(TOKEN);
  });

  it("throws if sandbox.writeFile fails", async () => {
    const sandbox = makeSandbox({
      writeFile: vi.fn().mockRejectedValue(new Error("disk full")),
    });
    await expect(
      setupGitCredentials(sandbox as any, TOKEN, OWNER, REPO),
    ).rejects.toThrow("disk full");
  });
});
