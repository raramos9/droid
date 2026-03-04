import { proxyToSandbox, type Sandbox } from "@cloudflare/sandbox";
import { verifySignature } from "./lib/verify";
import { fromGithubWebhook } from "./triggers/github";
import { runAgent } from "./harness/index";

export { Sandbox } from "@cloudflare/sandbox";

interface Env {
  Sandbox: DurableObjectNamespace<Sandbox>;
  GITHUB_TOKEN: string;
  ANTHROPIC_API_KEY: string;
  WEBHOOK_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const proxyResponse = await proxyToSandbox(request, env);
    if (proxyResponse) return proxyResponse;

    const url = new URL(request.url);

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

      const dispatch = fromGithubWebhook(event, payload);
      if (!dispatch) {
        return Response.json({ message: "Event ignored" });
      }

      ctx.waitUntil(runAgent(dispatch, env).catch(console.error));
      return Response.json({ message: `${dispatch.agent} started` });
    }

    return new Response("Code Review Bot\n\nConfigure GitHub webhook to POST /webhook");
  },
};
