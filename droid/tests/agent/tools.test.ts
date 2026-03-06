import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createFilesystemTools,
  createShellTools,
  createGithubReadTools,
  createGatedTools,
  GatedActionError,
  buildAllTools,
} from "../../src/agent/tools/index";

function makeSandbox() {
  return {
    exec: vi.fn().mockResolvedValue({ stdout: "ok", stderr: "", exitCode: 0 }),
    readFile: vi.fn().mockResolvedValue({ content: "file content" }),
    writeFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
  } as any;
}

function makeOctokit() {
  return {
    issues: {
      get: vi.fn().mockResolvedValue({ data: { number: 1, title: "Bug", body: "details" } }),
      list: vi.fn().mockResolvedValue({ data: [] }),
      create: vi.fn().mockResolvedValue({ data: { number: 42 } }),
      createComment: vi.fn().mockResolvedValue({ data: { id: 1 } }),
    },
    pulls: {
      get: vi.fn().mockResolvedValue({ data: { number: 1, title: "PR" } }),
      create: vi.fn().mockResolvedValue({ data: { number: 99 } }),
      merge: vi.fn().mockResolvedValue({ data: { merged: true } }),
    },
    repos: {
      compareCommits: vi.fn().mockResolvedValue({ data: { files: [] } }),
    },
  } as any;
}

// ── Filesystem tools ──────────────────────────────────────────────────────────

describe("filesystem tools", () => {
  it("readFile returns file content", async () => {
    const sandbox = makeSandbox();
    const tools = createFilesystemTools(sandbox);
    const readFile = tools.find((t) => t.name === "readFile")!;
    const result = await readFile.execute({ filePath: "/workspace/foo.ts" });
    expect(result).toBe("file content");
    expect(sandbox.readFile).toHaveBeenCalledWith("/workspace/foo.ts");
  });

  it("readFile throws on sandbox error", async () => {
    const sandbox = makeSandbox();
    sandbox.readFile.mockRejectedValueOnce(new Error("not found"));
    const tools = createFilesystemTools(sandbox);
    const readFile = tools.find((t) => t.name === "readFile")!;
    await expect(readFile.execute({ filePath: "/missing.ts" })).rejects.toThrow("Error reading file");
  });

  it("writeFile writes content and returns confirmation", async () => {
    const sandbox = makeSandbox();
    const tools = createFilesystemTools(sandbox);
    const writeFile = tools.find((t) => t.name === "writeFile")!;
    const result = await writeFile.execute({ filePath: "/workspace/out.ts", content: "const x = 1" });
    expect(result).toContain("written");
    expect(sandbox.writeFile).toHaveBeenCalledWith("/workspace/out.ts", "const x = 1");
  });

  it("writeFile throws on sandbox error", async () => {
    const sandbox = makeSandbox();
    sandbox.writeFile.mockRejectedValueOnce(new Error("disk full"));
    const tools = createFilesystemTools(sandbox);
    const writeFile = tools.find((t) => t.name === "writeFile")!;
    await expect(writeFile.execute({ filePath: "/foo.ts", content: "" })).rejects.toThrow();
  });

  it("listFiles executes ls and returns stdout", async () => {
    const sandbox = makeSandbox();
    sandbox.exec.mockResolvedValueOnce({ stdout: "a.ts\nb.ts\n", stderr: "", exitCode: 0 });
    const tools = createFilesystemTools(sandbox);
    const listFiles = tools.find((t) => t.name === "listFiles")!;
    const result = await listFiles.execute({ dirPath: "/workspace" });
    expect(result).toContain("a.ts");
    expect(sandbox.exec).toHaveBeenCalledWith(expect.stringContaining("/workspace"));
  });

  it("searchCode runs grep and returns matches", async () => {
    const sandbox = makeSandbox();
    sandbox.exec.mockResolvedValueOnce({ stdout: "foo.ts:1:match\n", stderr: "", exitCode: 0 });
    const tools = createFilesystemTools(sandbox);
    const searchCode = tools.find((t) => t.name === "searchCode")!;
    const result = await searchCode.execute({ query: "TODO", dirPath: "/workspace" });
    expect(result).toContain("foo.ts");
  });

  it("each filesystem tool has a name and definition", () => {
    const tools = createFilesystemTools(makeSandbox());
    for (const tool of tools) {
      expect(typeof tool.name).toBe("string");
      expect(tool.definition).toBeDefined();
      expect(tool.definition.input_schema).toBeDefined();
    }
  });
});

// ── Shell tools ───────────────────────────────────────────────────────────────

describe("shell tools", () => {
  it("runCommand executes command and returns stdout", async () => {
    const sandbox = makeSandbox();
    sandbox.exec.mockResolvedValueOnce({ stdout: "Tests passed\n", stderr: "", exitCode: 0 });
    const tools = createShellTools(sandbox);
    const runCommand = tools.find((t) => t.name === "runCommand")!;
    const result = await runCommand.execute({ command: "npm test", cwd: "/workspace/repo" });
    expect(result).toContain("Tests passed");
  });

  it("runCommand includes stderr and exit code in result", async () => {
    const sandbox = makeSandbox();
    sandbox.exec.mockResolvedValueOnce({ stdout: "", stderr: "FAIL", exitCode: 1 });
    const tools = createShellTools(sandbox);
    const runCommand = tools.find((t) => t.name === "runCommand")!;
    const result = await runCommand.execute({ command: "npm test", cwd: "/workspace/repo" });
    expect(result).toContain("FAIL");
    expect(result).toContain("1");
  });

  it("runCommand has definition with command and cwd properties", () => {
    const tools = createShellTools(makeSandbox());
    const runCommand = tools.find((t) => t.name === "runCommand")!;
    expect(runCommand.definition.input_schema.properties).toHaveProperty("command");
    expect(runCommand.definition.input_schema.properties).toHaveProperty("cwd");
  });
});

// ── GitHub read tools ─────────────────────────────────────────────────────────

describe("github read tools", () => {
  it("getIssue fetches and returns issue details", async () => {
    const octokit = makeOctokit();
    const tools = createGithubReadTools(octokit);
    const getIssue = tools.find((t) => t.name === "getIssue")!;
    const result = await getIssue.execute({ owner: "acme", repo: "app", issueNumber: 1 });
    expect(result).toContain("Bug");
    expect(octokit.issues.get).toHaveBeenCalled();
  });

  it("listIssues returns list of open issues", async () => {
    const octokit = makeOctokit();
    octokit.issues.list.mockResolvedValueOnce({ data: [{ number: 1, title: "Issue A" }] });
    const tools = createGithubReadTools(octokit);
    const listIssues = tools.find((t) => t.name === "listIssues")!;
    const result = await listIssues.execute({ owner: "acme", repo: "app" });
    expect(result).toContain("Issue A");
  });

  it("getPR fetches and returns PR details", async () => {
    const octokit = makeOctokit();
    const tools = createGithubReadTools(octokit);
    const getPR = tools.find((t) => t.name === "getPR")!;
    const result = await getPR.execute({ owner: "acme", repo: "app", pullNumber: 1 });
    expect(result).toContain("PR");
    expect(octokit.pulls.get).toHaveBeenCalled();
  });

  it("getFileDiff returns diff between commits", async () => {
    const octokit = makeOctokit();
    octokit.repos.compareCommits.mockResolvedValueOnce({
      data: { files: [{ filename: "src/index.ts", patch: "@@ -1 +1 @@" }] },
    });
    const tools = createGithubReadTools(octokit);
    const getFileDiff = tools.find((t) => t.name === "getFileDiff")!;
    const result = await getFileDiff.execute({ owner: "acme", repo: "app", base: "abc", head: "def" });
    expect(result).toContain("src/index.ts");
  });

  it("each github read tool has a definition", () => {
    const tools = createGithubReadTools(makeOctokit());
    for (const tool of tools) {
      expect(tool.definition).toBeDefined();
      expect(typeof tool.name).toBe("string");
    }
  });
});

// ── Gated tools ───────────────────────────────────────────────────────────────

describe("gated tools", () => {
  it("createIssue throws GatedActionError instead of executing", async () => {
    const tools = createGatedTools(makeOctokit(), makeSandbox());
    const createIssue = tools.find((t) => t.name === "createIssue")!;
    await expect(
      createIssue.execute({ owner: "acme", repo: "app", title: "Bug", body: "details" }, "tool-use-123")
    ).rejects.toThrow(GatedActionError);
  });

  it("GatedActionError carries tool name and args", async () => {
    const tools = createGatedTools(makeOctokit(), makeSandbox());
    const createIssue = tools.find((t) => t.name === "createIssue")!;
    try {
      await createIssue.execute({ owner: "acme", repo: "app", title: "Bug", body: "details" }, "tu-1");
    } catch (err) {
      expect(err).toBeInstanceOf(GatedActionError);
      expect((err as GatedActionError).tool).toBe("createIssue");
      expect((err as GatedActionError).toolUseId).toBe("tu-1");
      expect((err as GatedActionError).args).toMatchObject({ title: "Bug" });
    }
  });

  it("createComment throws GatedActionError", async () => {
    const tools = createGatedTools(makeOctokit(), makeSandbox());
    const createComment = tools.find((t) => t.name === "createComment")!;
    await expect(
      createComment.execute({ owner: "acme", repo: "app", issueNumber: 1, body: "hi" }, "tu-2")
    ).rejects.toThrow(GatedActionError);
  });

  it("createPR throws GatedActionError", async () => {
    const tools = createGatedTools(makeOctokit(), makeSandbox());
    const createPR = tools.find((t) => t.name === "createPR")!;
    await expect(
      createPR.execute({ owner: "acme", repo: "app", head: "fix/foo", base: "main", title: "Fix", body: "" }, "tu-3")
    ).rejects.toThrow(GatedActionError);
  });

  it("pushCode throws GatedActionError", async () => {
    const tools = createGatedTools(makeOctokit(), makeSandbox());
    const pushCode = tools.find((t) => t.name === "pushCode")!;
    await expect(
      pushCode.execute({ repoPath: "/workspace/repo", branch: "fix/foo", message: "fix: bug" }, "tu-4")
    ).rejects.toThrow(GatedActionError);
  });

  it("mergePR throws GatedActionError", async () => {
    const tools = createGatedTools(makeOctokit(), makeSandbox());
    const mergePR = tools.find((t) => t.name === "mergePR")!;
    await expect(
      mergePR.execute({ owner: "acme", repo: "app", pullNumber: 1 }, "tu-5")
    ).rejects.toThrow(GatedActionError);
  });

  it("all 5 gated tools are present", () => {
    const tools = createGatedTools(makeOctokit(), makeSandbox());
    const names = tools.map((t) => t.name);
    expect(names).toContain("createIssue");
    expect(names).toContain("createComment");
    expect(names).toContain("createPR");
    expect(names).toContain("pushCode");
    expect(names).toContain("mergePR");
  });
});

// ── buildAllTools ─────────────────────────────────────────────────────────────

describe("buildAllTools", () => {
  it("returns all tools combined", () => {
    const tools = buildAllTools(makeSandbox(), makeOctokit());
    const names = tools.map((t) => t.name);
    expect(names).toContain("readFile");
    expect(names).toContain("writeFile");
    expect(names).toContain("listFiles");
    expect(names).toContain("searchCode");
    expect(names).toContain("runCommand");
    expect(names).toContain("getIssue");
    expect(names).toContain("listIssues");
    expect(names).toContain("getPR");
    expect(names).toContain("getFileDiff");
    expect(names).toContain("createIssue");
    expect(names).toContain("createComment");
    expect(names).toContain("createPR");
    expect(names).toContain("pushCode");
    expect(names).toContain("mergePR");
  });

  it("every tool has a definition with input_schema", () => {
    const tools = buildAllTools(makeSandbox(), makeOctokit());
    for (const tool of tools) {
      expect(tool.definition).toBeDefined();
      expect(tool.definition.name).toBe(tool.name);
      expect(tool.definition.input_schema.type).toBe("object");
    }
  });
});
