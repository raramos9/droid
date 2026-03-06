import { describe, it, expect, vi } from "vitest";
import { buildTools } from "../../src/tools/registry";
import type { ToolName } from "../../src/agents/base";

function makeSandbox() {
  return {
    exec: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  } as any;
}

describe("buildTools", () => {
  it("returns empty array for empty names list", () => {
    const tools = buildTools([], makeSandbox());
    expect(tools).toHaveLength(0);
  });

  it("returns one tool for one name", () => {
    const tools = buildTools(["readFile"], makeSandbox());
    expect(tools).toHaveLength(1);
  });

  it("returns correct count for multiple names", () => {
    const names: ToolName[] = ["readFile", "writeFile", "runTests", "createDirectory"];
    const tools = buildTools(names, makeSandbox());
    expect(tools).toHaveLength(4);
  });

  it("each tool has a name property", () => {
    const tools = buildTools(["readFile", "writeFile"], makeSandbox());
    for (const tool of tools) {
      expect(typeof (tool as any).name).toBe("string");
    }
  });

  it("readFile tool is named readFile", () => {
    const tools = buildTools(["readFile"], makeSandbox());
    expect((tools[0] as any).name).toBe("readFile");
  });

  it("runTests tool is named runTests", () => {
    const tools = buildTools(["runTests"], makeSandbox());
    expect((tools[0] as any).name).toBe("runTests");
  });
});
