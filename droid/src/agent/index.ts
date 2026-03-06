import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import type { Goal, AgentRun, ToolContext } from "../types/agent";
import { buildAllTools, GatedActionError, type DroidTool } from "./tools/index";
import { buildGoalMessage, SYSTEM_PROMPT } from "./prompt";
import { saveCheckpoint, savePendingAction } from "./checkpoint";

const MAX_ITERATIONS = 10;

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

async function executeToolCalls(
  toolUseBlocks: Array<{ type: string; id: string; name: string; input: Record<string, unknown> }>,
  tools: DroidTool[],
  run: AgentRun,
  ctx: AgentContext,
): Promise<ToolCallResult> {
  const toolResults: Array<{ type: "tool_result"; tool_use_id: string; content: string }> = [];

  for (const b of toolUseBlocks) {
    const tool = tools.find((t) => t.name === b.name);
    if (!tool) continue;

    try {
      const result = await tool.execute(b.input, b.id);
      toolResults.push({ type: "tool_result", tool_use_id: b.id, content: result });
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
      toolResults.push({ type: "tool_result", tool_use_id: b.id, content: `Error: ${(err as Error).message}` });
    }
  }

  const messages: MessageParam[] =
    toolResults.length > 0
      ? [...run.messages, { role: "user", content: toolResults } as MessageParam]
      : run.messages;

  return { messages, hitGate: false, run };
}

export async function runAgent(
  goal: Goal,
  ctx: AgentContext,
  opts: { existingRun?: AgentRun } = {},
): Promise<AgentRun> {
  const anthropic = new Anthropic({ apiKey: ctx.anthropicApiKey });
  const tools = buildAllTools(ctx.sandbox, ctx.octokit);
  const toolDefs = tools.map((t) => t.definition);

  let run: AgentRun = opts.existingRun ?? newRun(goal);
  if (!opts.existingRun) {
    run = { ...run, messages: [{ role: "user", content: buildGoalMessage(goal) }] };
  }

  try {
    while (run.iteration < MAX_ITERATIONS) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        tools: toolDefs as Parameters<typeof anthropic.messages.create>[0]["tools"],
        messages: run.messages,
      });

      run = {
        ...run,
        messages: [...run.messages, { role: "assistant", content: response.content } as MessageParam],
      };

      if (response.stop_reason === "end_turn") break;

      const toolUseBlocks = (
        response.content.filter((b) => b.type === "tool_use") as Array<{
          type: "tool_use";
          id: string;
          name: string;
          input: Record<string, unknown>;
        }>
      );

      const result = await executeToolCalls(toolUseBlocks, tools, run, ctx);
      if (result.hitGate) return result.run;

      run = {
        ...result.run,
        messages: result.messages,
        iteration: run.iteration + 1,
        status: "running",
      };
      await saveCheckpoint({ ...run }, ctx.supabaseUrl, ctx.supabaseKey);
    }

    run = { ...run, status: "completed" };
    await saveCheckpoint(run, ctx.supabaseUrl, ctx.supabaseKey);
  } catch (err) {
    run = { ...run, status: "failed", error: (err as Error).message };
    await saveCheckpoint(run, ctx.supabaseUrl, ctx.supabaseKey);
  }

  return run;
}
