import { z } from "zod";
import { type Sandbox } from "@cloudflare/sandbox";

export type ToolName = "readFile" | "writeFile" | "runTests" | "createDirectory";

export interface AgentContext {
  sandbox: Sandbox;
  githubToken: string;
  anthropicApiKey: string;
}

export const agentResultSchema = z.object({
  success: z.boolean(),
  artifacts: z.array(z.string()),
  error: z.string().optional(),
  usage: z
    .object({
      inputTokens: z.number(),
      outputTokens: z.number(),
    })
    .optional(),
});

export type AgentResult = z.infer<typeof agentResultSchema>;

export interface Agent<TInput> {
  name: string;
  inputSchema: z.ZodSchema<TInput>;
  tools: ToolName[];
  run(input: TInput, ctx: AgentContext): Promise<AgentResult>;
}
