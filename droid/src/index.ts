import { getSandbox, proxyToSandbox, type Sandbox } from "@cloudflare/sandbox";
import { Octokit } from "@octokit/rest";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod.mjs";

export { Sandbox } from "@cloudflare/sandbox";

const issueWriteSchema = z.object({
  title: z.string(),
  body: z.string()
});


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

async function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );
  const expected =
    "sha256=" +
    Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  return signature === expected;
}

async function reviewPullRequest(payload: any, env: Env): Promise<void> {
  const pr = payload.pull_request;
  const repo = payload.repository;
  const octokit = new Octokit({ auth: env.GITHUB_TOKEN });
  const sandbox = getSandbox(env.Sandbox, `review-${pr.number}`);

  try {
    // Post initial comment
    console.log("Posting initial comment...");
    await octokit.issues.createComment({
      owner: repo.owner.login,
      repo: repo.name,
      issue_number: pr.number,
      body: "Code review in progress...",
    });
    // Clone repository
    console.log("Cloning repository...");
    const cloneUrl = `https://${env.GITHUB_TOKEN}@github.com/${repo.owner.login}/${repo.name}.git`;
    await sandbox.exec(
      `git clone --depth=1 --branch=${pr.head.ref} ${cloneUrl} /workspace/repo`,
    );

    // Get changed files
    console.log("Fetching changed files...");
    const comparison = await octokit.repos.compareCommits({
      owner: repo.owner.login,
      repo: repo.name,
      base: pr.base.sha,
      head: pr.head.sha,
    });

    const files = [];
    for (const file of (comparison.data.files || []).slice(0, 5)) {
      if (file.status !== "removed") {
        const content = await sandbox.readFile(
          `/workspace/repo/${file.filename}`,
        );
        files.push({
          path: file.filename,
          patch: file.patch || "",
          content: content.content,
        });
      }
    }

    // Generate review with Claude
    console.log(`Analyzing ${files.length} files with Claude...`);
    const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `Review this PR:

Title: ${pr.title}

Changed files:
${files.map((f) => `File: ${f.path}\nDiff:\n${f.patch}\n\nContent:\n${f.content.substring(0, 1000)}`).join("\n\n")}

Provide a brief code review focusing on bugs, security, and best practices.`,
        },
      ],
    });

    const review =
      response.content[0]?.type === "text"
        ? response.content[0].text
        : "No review generated";

    // Post review comment
    console.log("Posting review...");
    await octokit.issues.createComment({
      owner: repo.owner.login,
      repo: repo.name,
      issue_number: pr.number,
      body: `## Code Review\n\n${review}\n\n---\n*Generated by Claude*`,
    });
    console.log("Review complete!");
  } catch (error: any) {
    console.error("Review failed:", error);
    await octokit.issues.createComment({
      owner: repo.owner.login,
      repo: repo.name,
      issue_number: pr.number,
      body: `Review failed: ${error.message}`,
    });
  } finally {
    await sandbox.destroy();
  }
}

async function writeIssue(payload: any, env: Env): Promise<void> {
  const repo = payload.repository
  const octokit = new Octokit({ auth: env.GITHUB_TOKEN });
  const sandbox = getSandbox(env.Sandbox, `issue-analysis`);

  try {
    
  // clone repo and create test branch
  console.log("Cloning repository...");
    const cloneUrl = `https://${env.GITHUB_TOKEN}@github.com/${repo.owner.login}/${repo.name}.git`;
    await sandbox.exec(
      `git clone --depth=1 --branch=test-review ${cloneUrl} /workspace/repo`,
    );

  //  need to parse through all files in a repo

  const files = await sandbox.listFiles("/workspace/repo", {recursive: true})
  const fileContents = []
  for (const fileInfo of files.files) { 
    if (fileInfo.type === "file"){ 
      if (!(fileInfo.absolutePath.includes("node_modules") || fileInfo.absolutePath.includes(".git"))) {
        const content = await sandbox.readFile(fileInfo.absolutePath)
        fileContents.push({
          path: fileInfo.absolutePath,
          content: content
        })
      }

    }
  }

  // analyze code base (claude)
  console.log("Analyzing with Claude")
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.parse({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `Analyze this codebase for issues focusing on bugs, security, and best practices: 
      
        
        ${fileContents.map(f => `File: ${f.path}\nContent:${f.content.content}`).join("\n\n")}
        `
      }
    ],
    output_config: {format: zodOutputFormat(issueWriteSchema)}
  });

     
      console.log("Analyzing Codebase") 

      if(!response.parsed_output) throw new Error("No parsed Output")

      await octokit.issues.create({
        owner: repo.owner.login,
        repo: repo.name,
        title: response.parsed_output.title,
        body: response.parsed_output?.body
      })
      
    } catch(error: any) {
      console.error("Review failed:", error);
    } finally { 
      await sandbox.destroy();
    }

}

// writeIssue (octokit, sandbox, payload)
// clone repo 
// analyze codebase 
// generate issues 