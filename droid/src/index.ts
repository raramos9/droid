import { proxyToSandbox, type Sandbox } from "@cloudflare/sandbox";
import { reviewPullRequest } from "./handlers/pullRequest";
import { writeIssue } from "./handlers/writeIssue";
import { verifySignature } from "./lib/verify";

export { Sandbox } from "@cloudflare/sandbox";

interface Env {
  Sandbox: DurableObjectNamespace<Sandbox>;
  GITHUB_TOKEN: string;
  ANTHROPIC_API_KEY: string;
  WEBHOOK_SECRET: string;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const proxyResponse = await proxyToSandbox(request, env);
    if (proxyResponse) return proxyResponse;

    const url = new URL(request.url);

    if (url.pathname === "/webhook" && request.method === "POST") {
      const signature = request.headers.get("x-hub-signature-256");
      const contentType = request.headers.get("content-type") || "";
      const body = await request.text();

      // Verify webhook signature
      if (
        !signature ||
        !(await verifySignature(body, signature, env.WEBHOOK_SECRET))
      ) {
        return Response.json({ error: "Invalid signature" }, { status: 401 });
      }

      const event = request.headers.get("x-github-event");

      // Parse payload (GitHub can send as JSON or form-encoded)
      let payload;
      if (contentType.includes("application/json")) {
        payload = JSON.parse(body);
      } else {
        // Handle form-encoded payload
        const params = new URLSearchParams(body);
        payload = JSON.parse(params.get("payload") || "{}");
      }

    
      // Handle opened and reopened PRs
      if (
        event === "pull_request" &&
        (payload.action === "opened" || payload.action === "reopened")
      ) {
        console.log(`Starting review for PR #${payload.pull_request.number}`);
        // Use waitUntil to ensure the review completes even after response is sent
        ctx.waitUntil(
          reviewPullRequest(payload, env).catch(console.error),
        );
        return Response.json({ message: "Review started" });
      }

      else if (
        event === "push"
      ) {
        console.log('Analyzing Codebase')
        // waitUntil to ensure analysis completes
        ctx.waitUntil(
          writeIssue(payload, env)
        );
        return Response.json({message: "Issue Review Started"})
      }

      return Response.json({ message: "Event ignored" });
    }

    return new Response(
      "Code Review Bot\n\nConfigure GitHub webhook to POST /webhook",
    );
  },
};
