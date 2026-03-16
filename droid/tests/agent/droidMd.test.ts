import { describe, it, expect, vi } from "vitest";
import { loadDroidMd } from "../../src/agent/droidMd";

function makeSandbox(overrides: Partial<{ readFile: (path: string) => Promise<{ content: string }> }> = {}) {
  return {
    exec: vi.fn(),
    readFile: vi.fn().mockResolvedValue({ content: "" }),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    destroy: vi.fn(),
    ...overrides,
  };
}

describe("loadDroidMd", () => {
  it("returns file content when .droid.md exists", async () => {
    const sandbox = makeSandbox({
      readFile: vi.fn().mockResolvedValue({ content: "# My rules\nBe concise." }),
    });

    const result = await loadDroidMd(sandbox as any);

    expect(result).toBe("# My rules\nBe concise.");
  });

  it("calls readFile with the exact path /workspace/repo/.droid.md", async () => {
    const readFile = vi.fn().mockResolvedValue({ content: "" });
    const sandbox = makeSandbox({ readFile });

    await loadDroidMd(sandbox as any);

    expect(readFile).toHaveBeenCalledWith("/workspace/repo/.droid.md");
  });

  it("returns empty string when readFile throws (file not found)", async () => {
    const sandbox = makeSandbox({
      readFile: vi.fn().mockRejectedValue(new Error("file not found")),
    });

    const result = await loadDroidMd(sandbox as any);

    expect(result).toBe("");
  });

  it("returns empty string when readFile rejects with any error", async () => {
    const sandbox = makeSandbox({
      readFile: vi.fn().mockRejectedValue(new Error("permission denied")),
    });

    const result = await loadDroidMd(sandbox as any);

    expect(result).toBe("");
  });

  it("returns empty string when content is empty", async () => {
    const sandbox = makeSandbox({
      readFile: vi.fn().mockResolvedValue({ content: "" }),
    });

    const result = await loadDroidMd(sandbox as any);

    expect(result).toBe("");
  });
});
