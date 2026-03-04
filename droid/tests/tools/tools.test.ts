import { describe, it, expect, vi } from "vitest";
import { createReadFileTool } from "../../src/tools/readFile";
import { createWriteFileTool } from "../../src/tools/writeFile";
import { createDirectoryTool } from "../../src/tools/createDirectory";

function makeSandbox() {
  return {
    readFile: vi.fn().mockResolvedValue({ content: "hello" }),
    writeFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
  } as any;
}

describe("readFile tool", () => {
  it("returns file content", async () => {
    const sandbox = makeSandbox();
    const tool = createReadFileTool(sandbox);
    const result = await (tool as any).run({ filePath: "/foo.ts" });
    expect(result).toBe("hello");
    expect(sandbox.readFile).toHaveBeenCalledWith("/foo.ts");
  });

  it("throws on read error", async () => {
    const sandbox = makeSandbox();
    sandbox.readFile.mockRejectedValueOnce(new Error("not found"));
    const tool = createReadFileTool(sandbox);
    await expect((tool as any).run({ filePath: "/missing.ts" })).rejects.toThrow("Error reading file");
  });
});

describe("writeFile tool", () => {
  it("returns success message", async () => {
    const sandbox = makeSandbox();
    const tool = createWriteFileTool(sandbox);
    const result = await (tool as any).run({ filePath: "/foo.ts", content: "code" });
    expect(result).toBe("File written successfully");
    expect(sandbox.writeFile).toHaveBeenCalledWith("/foo.ts", "code");
  });

  it("throws on write error", async () => {
    const sandbox = makeSandbox();
    sandbox.writeFile.mockRejectedValueOnce(new Error("disk full"));
    const tool = createWriteFileTool(sandbox);
    await expect((tool as any).run({ filePath: "/foo.ts", content: "" })).rejects.toThrow("Error writing to file");
  });
});

describe("createDirectory tool", () => {
  it("returns success message", async () => {
    const sandbox = makeSandbox();
    const tool = createDirectoryTool(sandbox);
    const result = await (tool as any).run({ dirPath: "/workspace/new" });
    expect(result).toBe("Directory written successfully");
    expect(sandbox.mkdir).toHaveBeenCalledWith("/workspace/new", { recursive: true });
  });

  it("throws on mkdir error", async () => {
    const sandbox = makeSandbox();
    sandbox.mkdir.mockRejectedValueOnce(new Error("permission denied"));
    const tool = createDirectoryTool(sandbox);
    await expect((tool as any).run({ dirPath: "/root/x" })).rejects.toThrow("Error creating directory file");
  });
});
