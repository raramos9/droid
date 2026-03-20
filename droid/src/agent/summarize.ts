import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "../types/agent";

const TOKEN_THRESHOLD = 120_000;
const RECENT_TURNS = 6;

export async function summarizeMessages(
  messages: MessageParam[],
  anthropicApiKey: string,
): Promise<MessageParam[]> {
  if (JSON.stringify(messages).length < TOKEN_THRESHOLD) {
    return messages;
  }

  const toSummarize = messages.slice(0, -RECENT_TURNS);
  const recent = messages.slice(-RECENT_TURNS);
  const anthropic = new Anthropic({ apiKey: anthropicApiKey });

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Summarize the following conversation history concisely, preserving key decisions, file changes, and current task status:\n\n${JSON.stringify(toSummarize)}`,
        },
      ],
    });

    const summaryText = (response.content[0] as { type: "text"; text: string }).text;
    const summaryMessage: MessageParam = {
      role: "user",
      content: `[Previous conversation summary]: ${summaryText}`,
    };

    return [summaryMessage, ...recent];
  } catch {
    return messages.slice(-RECENT_TURNS);
  }
}
