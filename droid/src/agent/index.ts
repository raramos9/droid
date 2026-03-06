import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import type { Goal, AgentRun, ToolContext } from "../types/agent";
import { buildAllTools, GatedActionError } from "./tools/index";
import { buildGoalMessage, SYSTEM_PROMPT } from "./prompt";
import { saveCheckpoint, savePendingAction } from "./checkpoint";

const MAX_ITERATIONS = 3;

export interface AgentContext {
  sandbox: ToolContext["sandbox"];
  octokit: ToolContext["octokit"];
  anthropicApiKey: string;
  supabaseUrl: string;
  supabaseKey: string;
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

export async function runAgent(
  goal: Goal,
  ctx: AgentContext,
  opts: { existingRun?: AgentRun } = {},
): Promise<AgentRun> {
  const anthropic = new Anthropic({ apiKey: ctx.anthropicApiKey });
  const tools = buildAllTools(ctx.sandbox, ctx.octokit);
  const toolDefs = tools.map((t) => t.definition);

  const run: AgentRun = opts.existingRun ?? newRun(goal);
  if (!opts.existingRun) {
    run.messages = [{ role: "user", content: buildGoalMessage(goal) }];
  }

  try {
    while (run.iteration < MAX_ITERATIONS) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8096,
        system: SYSTEM_PROMPT,
        tools: toolDefs as any,
        messages: run.messages,
      });

      run.messages = [
        ...run.messages,
        { role: "assistant", content: response.content } as MessageParam,
      ];

      if (response.stop_reason === "end_turn") break;

      const toolUseBlocks = response.content.filter((b: any) => b.type === "tool_use");
      const toolResults: Array<{ type: "tool_result"; tool_use_id: string; content: string }> = [];
      let hitGate = false;

      for (const block of toolUseBlocks) {
        const b = block as any;
        const tool = tools.find((t) => t.name === b.name);
        if (!tool) continue;

        try {
          const result = await tool.execute(b.input, b.id);
          toolResults.push({ type: "tool_result", tool_use_id: b.id, content: result });
        } catch (err) {
          if (err instanceof GatedActionError) {
            run.status = "paused";
            await saveCheckpoint(run, ctx.supabaseUrl, ctx.supabaseKey);
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
            hitGate = true;
            break;
          }
          toolResults.push({ type: "tool_result", tool_use_id: b.id, content: `Error: ${(err as Error).message}` });
        }
      }

      if (hitGate) return run;

      if (toolResults.length > 0) {
        run.messages = [
          ...run.messages,
          { role: "user", content: toolResults } as MessageParam,
        ];
      }

      run.iteration += 1;
      run.status = "running";
      await saveCheckpoint({ ...run }, ctx.supabaseUrl, ctx.supabaseKey);
    }

    run.status = "completed";
    await saveCheckpoint(run, ctx.supabaseUrl, ctx.supabaseKey);
  } catch (err) {
    run.status = "failed";
    run.error = (err as Error).message;
    await saveCheckpoint(run, ctx.supabaseUrl, ctx.supabaseKey);
  }

  return run;
}
