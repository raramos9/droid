import { describe, it, expect, vi } from "vitest";
import { createFilesystemTools, createShellTools } from "../../../src/agent/tools/index";

function makeSandbox() {
  return {
    exec: vi.fn().mockResolvedValue({ stdout: "ok", stderr: "", exitCode: 0 }),
    readFile: vi.fn().mockResolvedValue({ content: "file content" }),
    writeFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
  } as any;
}

describe("workspace root boundary enforcement", () => {
  describe("readFile", () => {
    it("allows path within /workspace/repo", async () => {
      const sandbox = makeSandbox();
      const tools = createFilesystemTools(sandbox);
      const readFile = tools.find((t) => t.name === "readFile")!;
      await readFile.execute({ filePath: "/workspace/repo/src/foo.ts" });
      expect(sandbox.readFile).toHaveBeenCalledWith("/workspace/repo/src/foo.ts");
    });

    it("allows exactly /workspace/repo", async () => {
      const sandbox = makeSandbox();
      const tools = createFilesystemTools(sandbox);
      const readFile = tools.find((t) => t.name === "readFile")!;
      await readFile.execute({ filePath: "/workspace/repo" });
      expect(sandbox.readFile).toHaveBeenCalledWith("/workspace/repo");
    });

    it("resolves relative path to /workspace/repo prefix", async () => {
      const sandbox = makeSandbox();
      const tools = createFilesystemTools(sandbox);
      const readFile = tools.find((t) => t.name === "readFile")!;
      await readFile.execute({ filePath: "src/foo.ts" });
      expect(sandbox.readFile).toHaveBeenCalledWith("/workspace/repo/src/foo.ts");
    });

    it("rejects /etc/passwd", async () => {
      const sandbox = makeSandbox();
      const tools = createFilesystemTools(sandbox);
      const readFile = tools.find((t) => t.name === "readFile")!;
      const result = await readFile.execute({ filePath: "/etc/passwd" });
      expect(result).toMatch(/unsafe|outside/i);
      expect(sandbox.readFile).not.toHaveBeenCalled();
    });

    it("rejects /workspace/repo-evil/foo (prefix must be exact)", async () => {
      const sandbox = makeSandbox();
      const tools = createFilesystemTools(sandbox);
      const readFile = tools.find((t) => t.name === "readFile")!;
      const result = await readFile.execute({ filePath: "/workspace/repo-evil/foo" });
      expect(result).toMatch(/unsafe|outside/i);
      expect(sandbox.readFile).not.toHaveBeenCalled();
    });
  });

  describe("writeFile", () => {
    it("allows path within /workspace/repo", async () => {
      const sandbox = makeSandbox();
      const tools = createFilesystemTools(sandbox);
      const writeFile = tools.find((t) => t.name === "writeFile")!;
      await writeFile.execute({ filePath: "/workspace/repo/out.ts", content: "x" });
      expect(sandbox.writeFile).toHaveBeenCalledWith("/workspace/repo/out.ts", "x");
    });

    it("rejects /etc/shadow", async () => {
      const sandbox = makeSandbox();
      const tools = createFilesystemTools(sandbox);
      const writeFile = tools.find((t) => t.name === "writeFile")!;
      await expect(writeFile.execute({ filePath: "/etc/shadow", content: "x" })).rejects.toThrow(/unsafe|outside/i);
    });
  });

  describe("listFiles", () => {
    it("allows /workspace/repo", async () => {
      const sandbox = makeSandbox();
      const tools = createFilesystemTools(sandbox);
      const listFiles = tools.find((t) => t.name === "listFiles")!;
      await listFiles.execute({ dirPath: "/workspace/repo" });
      expect(sandbox.exec).toHaveBeenCalledWith(expect.stringContaining("/workspace/repo"));
    });

    it("rejects /tmp", async () => {
      const sandbox = makeSandbox();
      const tools = createFilesystemTools(sandbox);
      const listFiles = tools.find((t) => t.name === "listFiles")!;
      await expect(listFiles.execute({ dirPath: "/tmp" })).rejects.toThrow(/unsafe|outside/i);
    });
  });

  describe("runCommand cwd", () => {
    it("allows cwd within /workspace/repo", async () => {
      const sandbox = makeSandbox();
      const tools = createShellTools(sandbox);
      const runCommand = tools.find((t) => t.name === "runCommand")!;
      await runCommand.execute({ command: "ls", cwd: "/workspace/repo" });
      expect(sandbox.exec).toHaveBeenCalledWith("ls", { cwd: "/workspace/repo" });
    });

    it("rejects cwd outside workspace", async () => {
      const sandbox = makeSandbox();
      const tools = createShellTools(sandbox);
      const runCommand = tools.find((t) => t.name === "runCommand")!;
      await expect(runCommand.execute({ command: "ls", cwd: "/etc" })).rejects.toThrow(/unsafe|outside/i);
    });
  });
});
