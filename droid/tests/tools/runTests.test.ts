import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/lib/repoHelpers", () => ({
  findPackageJson: vi.fn(),
}));

import { findPackageJson } from "../../src/lib/repoHelpers";
import { createrunTestsTool } from "../../src/tools/runTests";

function makeSandbox(pkgContent: object | null, execResult = { exitCode: 0, stdout: "ok", stderr: "" }) {
  return {
    readFile: vi.fn().mockImplementation((path: string) => {
      if (pkgContent === null) throw new Error("not found");
      return Promise.resolve({ content: JSON.stringify(pkgContent) });
    }),
    exec: vi.fn().mockResolvedValue(execResult),
  };
}

describe("runTests tool", () => {
  beforeEach(() => {
    vi.mocked(findPackageJson).mockReset();
  });

  it("returns message when no package.json found", async () => {
    vi.mocked(findPackageJson).mockResolvedValue(null);
    const sandbox = makeSandbox(null);
    const tool = createrunTestsTool(sandbox as any);
    const result = await (tool as any).run({});
    expect(result).toMatch(/no package\.json/i);
  });

  it("returns message when package.json has no test script", async () => {
    vi.mocked(findPackageJson).mockResolvedValue("/workspace/repo/droid/package.json");
    const sandbox = makeSandbox({ scripts: {} });
    const tool = createrunTestsTool(sandbox as any);
    const result = await (tool as any).run({});
    expect(result).toMatch(/no test script/i);
  });

  it("calls exec with correct cwd derived from package.json path", async () => {
    vi.mocked(findPackageJson).mockResolvedValue("/workspace/repo/droid/package.json");
    const sandbox = makeSandbox({ scripts: { test: "vitest run" } });
    const tool = createrunTestsTool(sandbox as any);
    await (tool as any).run({});
    expect(sandbox.exec).toHaveBeenCalledWith("vitest run", {
      cwd: "/workspace/repo/droid",
    });
  });

  it("returns output without throwing when exit code is non-zero", async () => {
    vi.mocked(findPackageJson).mockResolvedValue("/workspace/repo/droid/package.json");
    const sandbox = makeSandbox(
      { scripts: { test: "vitest run" } },
      { exitCode: 1, stdout: "", stderr: "test failed" },
    );
    const tool = createrunTestsTool(sandbox as any);
    const result = await (tool as any).run({});
    expect(result).toContain("Exit code: 1");
    expect(result).toContain("test failed");
  });
});
