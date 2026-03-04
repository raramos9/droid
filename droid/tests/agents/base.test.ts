import { describe, it, expect } from "vitest";
import type { AgentContext, AgentResult, Agent, ToolName } from "../../src/agents/base";
import { agentResultSchema } from "../../src/agents/base";

describe("AgentResult schema", () => {
  it("accepts a successful result", () => {
    const result = agentResultSchema.parse({
      success: true,
      artifacts: ["PR #1 created"],
    });
    expect(result.success).toBe(true);
    expect(result.artifacts).toEqual(["PR #1 created"]);
  });

  it("accepts a failed result with error", () => {
    const result = agentResultSchema.parse({
      success: false,
      artifacts: [],
      error: "Clone failed",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe("Clone failed");
  });

  it("accepts usage metadata", () => {
    const result = agentResultSchema.parse({
      success: true,
      artifacts: [],
      usage: { inputTokens: 100, outputTokens: 200 },
    });
    expect(result.usage?.inputTokens).toBe(100);
  });

  it("rejects missing success field", () => {
    expect(() => agentResultSchema.parse({ artifacts: [] })).toThrow();
  });

  it("rejects missing artifacts field", () => {
    expect(() => agentResultSchema.parse({ success: true })).toThrow();
  });
});

describe("ToolName type", () => {
  it("covers all four tool names", () => {
    const names: ToolName[] = ["readFile", "writeFile", "runTests", "createDirectory"];
    expect(names).toHaveLength(4);
  });
});
