import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFilesystemTools } from "../../../src/agent/tools/index";

function makeSandbox() {
  return {
    exec: vi.fn().mockResolvedValue({ stdout: "match", stderr: "", exitCode: 0 }),
    readFile: vi.fn().mockResolvedValue({ content: "file content" }),
    writeFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
  } as any;
}

describe("searchCode shell injection prevention", () => {
  it("writes query to temp file instead of interpolating into command", async () => {
    const sandbox = makeSandbox();
    const tools = createFilesystemTools(sandbox);
    const searchCode = tools.find((t) => t.name === "searchCode")!;
    await searchCode.execute({ query: "TODO", dirPath: "/workspace/repo" });
    expect(sandbox.writeFile).toHaveBeenCalledWith("/tmp/droid-grep-pattern", "TODO");
  });

  it("uses -f flag pointing to pattern file", async () => {
    const sandbox = makeSandbox();
    const tools = createFilesystemTools(sandbox);
    const searchCode = tools.find((t) => t.name === "searchCode")!;
    await searchCode.execute({ query: "TODO", dirPath: "/workspace/repo" });
    const cmd = sandbox.exec.mock.calls[0][0] as string;
    expect(cmd).toContain("-f /tmp/droid-grep-pattern");
    expect(cmd).not.toContain("-e ");
  });

  it("handles single quotes in query without breaking shell", async () => {
    const sandbox = makeSandbox();
    const tools = createFilesystemTools(sandbox);
    const searchCode = tools.find((t) => t.name === "searchCode")!;
    const query = "it('should work')";
    await searchCode.execute({ query, dirPath: "/workspace/repo" });
    expect(sandbox.writeFile).toHaveBeenCalledWith("/tmp/droid-grep-pattern", query);
    const cmd = sandbox.exec.mock.calls[0][0] as string;
    expect(cmd).not.toContain(query);
  });

  it("handles backticks in query without executing them", async () => {
    const sandbox = makeSandbox();
    const tools = createFilesystemTools(sandbox);
    const searchCode = tools.find((t) => t.name === "searchCode")!;
    const query = "value=`cmd`";
    await searchCode.execute({ query, dirPath: "/workspace/repo" });
    expect(sandbox.writeFile).toHaveBeenCalledWith("/tmp/droid-grep-pattern", query);
    const cmd = sandbox.exec.mock.calls[0][0] as string;
    expect(cmd).not.toContain(query);
  });

  it("$(command) pattern does not appear in exec call", async () => {
    const sandbox = makeSandbox();
    const tools = createFilesystemTools(sandbox);
    const searchCode = tools.find((t) => t.name === "searchCode")!;
    const query = "$(rm -rf /)";
    await searchCode.execute({ query, dirPath: "/workspace/repo" });
    const cmd = sandbox.exec.mock.calls[0][0] as string;
    expect(cmd).not.toContain("$(");
  });

  it("exec command still includes the directory and grep flags", async () => {
    const sandbox = makeSandbox();
    const tools = createFilesystemTools(sandbox);
    const searchCode = tools.find((t) => t.name === "searchCode")!;
    await searchCode.execute({ query: "foo", dirPath: "/workspace/repo" });
    const cmd = sandbox.exec.mock.calls[0][0] as string;
    expect(cmd).toContain("grep");
    expect(cmd).toContain("/workspace/repo");
    expect(cmd).toContain("--include=");
  });
});
