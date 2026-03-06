import { describe, it, expect, vi } from "vitest";
import {
  MAX_ISSUES,
  buildSandboxId,
  buildFileList,
  hasGitChanges,
  findPackageJson,
} from "../../src/lib/repoHelpers";

describe("MAX_ISSUES", () => {
  it("equals 3", () => {
    expect(MAX_ISSUES).toBe(3);
  });
});

describe("buildSandboxId", () => {
  it("uses first 8 chars of sha", () => {
    expect(buildSandboxId("abc12345xyz")).toBe("issue-analysis-abc12345");
  });

  it("handles short shas gracefully", () => {
    expect(buildSandboxId("ab12")).toBe("issue-analysis-ab12");
  });
});

describe("buildFileList", () => {
  const files = [
    { status: "added", filename: "a.ts", patch: "patch-a" },
    { status: "removed", filename: "b.ts", patch: "patch-b" },
    { status: "modified", filename: "c.ts", patch: "patch-c" },
    { status: "added", filename: "d.ts", patch: undefined },
  ] as any[];

  it("excludes removed files", () => {
    const result = buildFileList(files);
    expect(result.every((f) => f.path !== "b.ts")).toBe(true);
  });

  it("respects limit", () => {
    const result = buildFileList(files, 2);
    expect(result).toHaveLength(2);
  });

  it("defaults patch to empty string when undefined", () => {
    const result = buildFileList(files);
    const d = result.find((f) => f.path === "d.ts");
    expect(d?.patch).toBe("");
  });

  it("maps filename to path", () => {
    const result = buildFileList(files);
    expect(result[0].path).toBe("a.ts");
  });
});

describe("hasGitChanges", () => {
  it("returns true when stdout is non-empty", async () => {
    const sandbox = {
      exec: vi.fn().mockResolvedValue({ stdout: " M src/foo.ts", exitCode: 0 }),
    };
    const result = await hasGitChanges(sandbox as any, "/workspace/repo");
    expect(result).toBe(true);
  });

  it("returns false when stdout is empty", async () => {
    const sandbox = {
      exec: vi.fn().mockResolvedValue({ stdout: "", exitCode: 0 }),
    };
    const result = await hasGitChanges(sandbox as any, "/workspace/repo");
    expect(result).toBe(false);
  });
});

describe("findPackageJson", () => {
  it("returns first path from find output", async () => {
    const sandbox = {
      exec: vi.fn().mockResolvedValue({
        stdout: "/workspace/repo/droid/package.json\n",
        exitCode: 0,
      }),
    };
    const result = await findPackageJson(sandbox as any);
    expect(result).toBe("/workspace/repo/droid/package.json");
  });

  it("returns null when no package.json found", async () => {
    const sandbox = {
      exec: vi.fn().mockResolvedValue({ stdout: "", exitCode: 0 }),
    };
    const result = await findPackageJson(sandbox as any);
    expect(result).toBeNull();
  });
});
