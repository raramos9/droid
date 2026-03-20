import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import type { Goal, AgentRun, ToolContext } from "../types/agent";
import { buildAllTools, GatedActionError, type DroidTool } from "./tools/index";
import { buildGoalMessage, SYSTEM_PROMPT } from "./prompt";
import { saveCheckpoint, savePendingAction } from "./checkpoint";
import { summarizeMessages } from "./summarize";

const MAX_ITERATIONS = 10;
const API_TIMEOUT_MS = 60_000;

const READ_ONLY_TOOLS = new Set([
  "readFile", "listFiles", "searchCode",
  "getIssue", "listIssues", "getPR", "getFileDiff",
]);

export interface AgentContext {
  sandbox: ToolContext["sandbox"];
  octokit: ToolContext["octokit"];
  anthropicApiKey: string;
  supabaseUrl: string;
  supabaseKey: string;
}

interface ToolCallResult {
  messages: MessageParam[];
  hitGate: boolean;
  run: AgentRun;
}

type ToolUseBlock = { type: string; id: string; name: string; input: Record<string, unknown> };
type ToolResult = { type: "tool_result"; tool_use_id: string; content: string };

function newRun(goal: Goal): AgentRun {
  return {
    runId: crypto.randomUUID(),
    goal,
    status: "running",
    messages: [],
    iteration: 0,
    artifacts: [],
  };
}

function unknownToolResult(id: string, name: string, tools: DroidTool[]): ToolResult {
  const available = tools.map((t) => t.name).join(", ");
  return {
    type: "tool_result",
    tool_use_id: id,
    content: `Unknown tool "${name}". Available tools: ${available}`,
  };
}

async function executeReadOnly(
  blocks: ToolUseBlock[],
  tools: DroidTool[],
): Promise<Map<string, ToolResult>> {
  const resultMap = new Map<string, ToolResult>();

  await Promise.all(
    blocks.map(async (b) => {
      const tool = tools.find((t) => t.name === b.name);
      if (!tool) {
        resultMap.set(b.id, unknownToolResult(b.id, b.name, tools));
        return;
      }
      try {
        const content = await tool.execute(b.input, b.id);
        resultMap.set(b.id, { type: "tool_result", tool_use_id: b.id, content });
      } catch (err) {
        resultMap.set(b.id, {
          type: "tool_result",
          tool_use_id: b.id,
          content: `Error: ${(err as Error).message}`,
        });
      }
    }),
  );

  return resultMap;
}

async function executeToolCalls(
  toolUseBlocks: ToolUseBlock[],
  tools: DroidTool[],
  run: AgentRun,
  ctx: AgentContext,
): Promise<ToolCallResult> {
  const readOnly = toolUseBlocks.filter((b) => READ_ONLY_TOOLS.has(b.name));
  const writable = toolUseBlocks.filter((b) => !READ_ONLY_TOOLS.has(b.name));

  const resultMap = await executeReadOnly(readOnly, tools);

  for (const b of writable) {
    const tool = tools.find((t) => t.name === b.name);
    if (!tool) {
      resultMap.set(b.id, unknownToolResult(b.id, b.name, tools));
      continue;
    }

    try {
      const content = await tool.execute(b.input, b.id);
      resultMap.set(b.id, { type: "tool_result", tool_use_id: b.id, content });
    } catch (err) {
      if (err instanceof GatedActionError) {
        const paused = { ...run, status: "paused" as const };
        await saveCheckpoint(paused, ctx.supabaseUrl, ctx.supabaseKey);
        await savePendingAction(
          {
            runId: run.runId,
            toolUseId: err.toolUseId,
            tool: err.tool,
            args: err.args,
            status: "pending",
          },
          ctx.supabaseUrl,
          ctx.supabaseKey,
        );
        return { messages: run.messages, hitGate: true, run: paused };
      }
      resultMap.set(b.id, {
        type: "tool_result",
        tool_use_id: b.id,
        content: `Error: ${(err as Error).message}`,
      });
    }
  }

  const toolResults = toolUseBlocks.map((b) => resultMap.get(b.id)!).filter(Boolean);
  const messages: MessageParam[] =
    toolResults.length > 0
      ? [...run.messages, { role: "user", content: toolResults } as MessageParam]
      : run.messages;

  return { messages, hitGate: false, run };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  const timeoutPromise = new Promise<never>((_, reject) => {
    controller.signal.addEventListener("abort", () =>
      reject(new Error(`Anthropic API call timed out after ${ms / 1000}s`)),
    );
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

export async function runAgent(
  goal: Goal,
  ctx: AgentContext,
  opts: { existingRun?: AgentRun; systemPrompt?: string } = {},
): Promise<AgentRun> {
  const anthropic = new Anthropic({ apiKey: ctx.anthropicApiKey });
  const tools = buildAllTools(ctx.sandbox, ctx.octokit);
  const toolDefs = tools.map((t) => t.definition);

  let run: AgentRun = opts.existingRun ?? newRun(goal);
  if (!opts.existingRun) {
    run = { ...run, messages: [{ role: "user", content: buildGoalMessage(goal) }] };
  }

  let lastStopReason: string | null = null;

  try {
    while (run.iteration < MAX_ITERATIONS) {
      const compressedMessages = await summarizeMessages(run.messages, ctx.anthropicApiKey);

      const response = await withTimeout(
        anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 8192,
          system: opts.systemPrompt ?? SYSTEM_PROMPT,
          tools: toolDefs as Parameters<typeof anthropic.messages.create>[0]["tools"],
          messages: compressedMessages,
        }),
        API_TIMEOUT_MS,
      );

      lastStopReason = response.stop_reason;
      run = {
        ...run,
        messages: [...run.messages, { role: "assistant", content: response.content } as MessageParam],
      };

      if (response.stop_reason === "end_turn") break;

      const toolUseBlocks = response.content.filter((b) => b.type === "tool_use") as ToolUseBlock[];
      const result = await executeToolCalls(toolUseBlocks, tools, run, ctx);
      if (result.hitGate) return result.run;

      run = {
        ...result.run,
        messages: result.messages,
        iteration: run.iteration + 1,
        status: "running",
      };

      try {
        await saveCheckpoint({ ...run }, ctx.supabaseUrl, ctx.supabaseKey);
      } catch (err) {
        throw new Error(`Fatal: checkpoint save failed, aborting agent run: ${(err as Error).message}`);
      }
    }

    if (run.iteration >= MAX_ITERATIONS && lastStopReason !== "end_turn") {
      run = { ...run, artifacts: [...run.artifacts, "iteration_limit_reached"] };
    }

    run = { ...run, status: "completed" };
    try {
      await saveCheckpoint(run, ctx.supabaseUrl, ctx.supabaseKey);
    } catch {
      console.error("Final checkpoint save failed");
    }
  } catch (err) {
    run = { ...run, status: "failed", error: (err as Error).message };
    try {
      await saveCheckpoint(run, ctx.supabaseUrl, ctx.supabaseKey);
    } catch {
      console.error("Error checkpoint save failed");
    }
  }

  return run;
}
