import { z } from "zod";
import type { Goal } from "../types/agent";

const pushPayloadSchema = z.object({
  repository: z.object({ owner: z.object({ login: z.string() }), name: z.string() }),
  ref: z.string(),
  after: z.string(),
});

const pullRequestPayloadSchema = z.object({
  action: z.string(),
  pull_request: z.object({
    number: z.number(),
    title: z.string().optional().default(""),
    head: z.object({ ref: z.string(), sha: z.string() }),
    base: z.object({ ref: z.string(), sha: z.string() }),
  }),
  repository: z.object({ owner: z.object({ login: z.string() }), name: z.string() }),
});

const issuePayloadSchema = z.object({
  action: z.string(),
  issue: z.object({ number: z.number(), title: z.string(), body: z.string().optional().default("") }),
  repository: z.object({ owner: z.object({ login: z.string() }), name: z.string() }),
});

const issueCommentPayloadSchema = z.object({
  action: z.string(),
  issue: z.object({ number: z.number() }),
  comment: z.object({ body: z.string(), user: z.object({ login: z.string() }) }),
  repository: z.object({ owner: z.object({ login: z.string() }), name: z.string() }),
});

export function fromGithubWebhook(event: string | null, payload: unknown): Goal | null {
  if (event === "push") {
    const p = pushPayloadSchema.parse(payload);
    return {
      type: "push",
      repo: { owner: p.repository.owner.login, name: p.repository.name },
      context: { sha: p.after, ref: p.ref },
    };
  }

  if (event === "pull_request") {
    const p = pullRequestPayloadSchema.parse(payload);
    if (p.action !== "opened" && p.action !== "reopened") return null;
    return {
      type: "pull_request",
      repo: { owner: p.repository.owner.login, name: p.repository.name },
      context: { prNumber: p.pull_request.number, title: p.pull_request.title },
    };
  }

  if (event === "issues") {
    const p = issuePayloadSchema.parse(payload);
    if (p.action !== "opened") return null;
    return {
      type: "issue_created",
      repo: { owner: p.repository.owner.login, name: p.repository.name },
      context: { issueNumber: p.issue.number, title: p.issue.title, body: p.issue.body },
    };
  }

  if (event === "issue_comment") {
    const p = issueCommentPayloadSchema.parse(payload);
    if (p.action !== "created") return null;
    if (!p.comment.body.includes("@droid")) return null;
    return {
      type: "issue_comment",
      repo: { owner: p.repository.owner.login, name: p.repository.name },
      context: { issueNumber: p.issue.number, author: p.comment.user.login, comment: p.comment.body },
    };
  }

  return null;
}
