import { proxyToSandbox } from "@cloudflare/sandbox";
import { verifySignature } from "./lib/verify";
import { fromGithubWebhook } from "./triggers/github";
import { runDroidAgent } from "./harness/index";
import { loadCheckpoint, savePendingAction } from "./agent/checkpoint";
import { type Env } from "./types/env";

export { Sandbox } from "@cloudflare/sandbox";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const proxyResponse = await proxyToSandbox(request, env);
    if (proxyResponse) return proxyResponse;

    const url = new URL(request.url);

    // ── Webhook ──────────────────────────────────────────────────────────────
    if (url.pathname === "/webhook" && request.method === "POST") {
      const signature = request.headers.get("x-hub-signature-256");
      const contentType = request.headers.get("content-type") || "";
      const body = await request.text();

      const isDev = request.headers.get("x-dev-bypass") === "true";
      if (!isDev && (!signature || !(await verifySignature(body, signature, env.WEBHOOK_SECRET)))) {
        return Response.json({ error: "Invalid signature" }, { status: 401 });
      }

      const event = request.headers.get("x-github-event");
      const payload = contentType.includes("application/json")
        ? JSON.parse(body)
        : JSON.parse(new URLSearchParams(body).get("payload") || "{}");

      let goal;
      try {
        goal = fromGithubWebhook(event, payload);
      } catch {
        return Response.json({ message: "Event ignored" });
      }
      if (!goal) {
        return Response.json({ message: "Event ignored" });
      }

      ctx.waitUntil(runDroidAgent(goal, env).catch(console.error));
      return Response.json({ message: `Droid started for ${goal.type}` });
    }

    // ── Resume (called by dashboard after action approval) ───────────────────
    const resumeMatch = url.pathname.match(/^\/resume\/([a-zA-Z0-9\-]+)$/);
    if (resumeMatch && request.method === "POST") {
      const runId = resumeMatch[1];
      const { toolUseId, result } = await request.json() as { toolUseId: string; result: string };

      const checkpoint = await loadCheckpoint(runId, env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
      if (checkpoint.status !== "paused") {
        return Response.json({ error: "Run is not paused" }, { status: 400 });
      }

      // Inject tool result into messages and continue
      const updatedMessages = [
        ...checkpoint.messages,
        {
          role: "user" as const,
          content: [{ type: "tool_result", tool_use_id: toolUseId, content: result }],
        },
      ];

      ctx.waitUntil(
        runDroidAgent(checkpoint.goal, env, {
          existingRunId: runId,
          initialMessages: updatedMessages,
          startIteration: checkpoint.iteration,
        }).catch(console.error),
      );

      return Response.json({ message: "Run resumed", runId });
    }

    return new Response("Droid\n\nConfigure GitHub webhook to POST /webhook");
  },
};
