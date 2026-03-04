import { z } from "zod";

export const pushPayloadSchema = z.object({
  repository: z.object({
    owner: z.object({ login: z.string() }),
    name: z.string(),
  }),
  ref: z.string(),
  before: z.string(),
  after: z.string(),
});

export const pullRequestPayloadSchema = z.object({
  action: z.string(),
  pull_request: z.object({
    number: z.number(),
    head: z.object({ ref: z.string(), sha: z.string() }),
    base: z.object({ ref: z.string(), sha: z.string() }),
  }),
  repository: z.object({
    owner: z.object({ login: z.string() }),
    name: z.string(),
  }),
});

export type PushPayload = z.infer<typeof pushPayloadSchema>;
export type PullRequestPayload = z.infer<typeof pullRequestPayloadSchema>;

export type Dispatch =
  | { agent: "writeIssue"; payload: PushPayload }
  | { agent: "reviewPR"; payload: PullRequestPayload };

export function fromGithubWebhook(
  event: string | null,
  payload: unknown,
): Dispatch | null {
  if (event === "push") {
    return { agent: "writeIssue", payload: pushPayloadSchema.parse(payload) };
  }

  if (event === "pull_request") {
    const parsed = pullRequestPayloadSchema.parse(payload);
    if (parsed.action === "opened" || parsed.action === "reopened") {
      return { agent: "reviewPR", payload: parsed };
    }
    return null;
  }

  return null;
}
