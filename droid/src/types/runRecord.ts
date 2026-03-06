import { z } from "zod";
import { agentResultSchema } from "../agents/base";

export const runRecordSchema = z.object({
  runId: z.string(),
  agent: z.string(),
  startedAt: z.string(),
  completedAt: z.string(),
  durationMs: z.number(),
  result: agentResultSchema,
});

export type RunRecord = z.infer<typeof runRecordSchema>;
