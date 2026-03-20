import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MessageParam } from "../../src/types/agent";

const mockMessagesCreate = vi.hoisted(() => vi.fn());

vi.mock("@anthropic-ai/sdk", () => {
  const Anthropic = vi.fn().mockImplementation(function () {
    return { messages: { create: mockMessagesCreate } };
  });
  return { default: Anthropic };
});

import { summarizeMessages } from "../../src/agent/summarize";

function makeMessages(count: number): MessageParam[] {
  const messages: MessageParam[] = [];
  for (let i = 0; i < count; i++) {
    messages.push({ role: i % 2 === 0 ? "user" : "assistant", content: `message ${i}` });
  }
  return messages;
}

function makeLargeMessages(totalChars: number): MessageParam[] {
  const content = "x".repeat(totalChars);
  return [{ role: "user", content }];
}

beforeEach(() => {
  mockMessagesCreate.mockReset();
});

describe("summarizeMessages", () => {
  it("returns messages unchanged when below token threshold", async () => {
    const messages = makeMessages(4);
    const result = await summarizeMessages(messages, "test-key");
    expect(result).toEqual(messages);
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });

  it("triggers compression when message JSON exceeds threshold", async () => {
    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Summary of prior conversation." }],
    });

    const largeMessages = makeLargeMessages(130_000); // > 120k chars threshold
    const result = await summarizeMessages(largeMessages, "test-key");

    expect(mockMessagesCreate).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it("preserves last 6 turns verbatim when compressing", async () => {
    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Summary of early messages." }],
    });

    const messages = makeMessages(20);
    const lastSix = messages.slice(-6);

    // Make it large enough to trigger compression
    const largeContent = "x".repeat(7000); // each message
    const bigMessages: MessageParam[] = messages.map((m) => ({
      ...m,
      content: largeContent,
    }));

    const result = await summarizeMessages(bigMessages, "test-key");

    const resultLast6 = result.slice(-6);
    // The last 6 turns should have the same roles (content was replaced with large content)
    for (let i = 0; i < 6; i++) {
      expect(resultLast6[i].role).toBe(lastSix[i].role);
    }
  });

  it("summary message is prepended as first message on compression", async () => {
    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Compressed summary." }],
    });

    const largeMessages = makeLargeMessages(130_000);
    const result = await summarizeMessages(largeMessages, "test-key");

    expect(result[0].role).toBe("user");
    expect(JSON.stringify(result[0].content)).toContain("Compressed summary.");
  });

  it("falls back to truncation when Anthropic summarization fails", async () => {
    mockMessagesCreate.mockRejectedValueOnce(new Error("API error"));

    const messages = makeMessages(20);
    const bigMessages: MessageParam[] = messages.map((m) => ({
      ...m,
      content: "x".repeat(7000),
    }));

    const result = await summarizeMessages(bigMessages, "test-key");
    // Should return something (fallback to last N messages)
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});
