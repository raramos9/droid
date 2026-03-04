import { getSandbox, type Sandbox } from "@cloudflare/sandbox";
import { Octokit } from "@octokit/rest";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod.mjs";
import { createReadFileTool } from "../tools/readFile";
import { createWriteFileTool } from "../tools/writeFile";
import { createrunTestsTool } from "../tools/runTests";
import { createDirectoryTool } from "../tools/createDirectory";
import { setupGitCredentials } from "../lib/gitCredentials";
import {
  MAX_ISSUES,
  buildSandboxId,
  buildFileList,
  hasGitChanges,
} from "../lib/writeIssueHelpers";

export { Sandbox } from "@cloudflare/sandbox";

interface Env {
  Sandbox: DurableObjectNamespace<Sandbox>;
  GITHUB_TOKEN: string;
  ANTHROPIC_API_KEY: string;
  WEBHOOK_SECRET: string;
}

const SAFE_BRANCH_RE = /^[a-z0-9-]+$/;

function assertSafeBranchName(value: string, field: string): void {
  if (!SAFE_BRANCH_RE.test(value)) {
    throw new Error(`${field} contains invalid characters: ${value}`);
  }
}

const issueWriteSchema = z.array(
  z.object({
    title: z.string(),
    body: z.string(),
    prBody: z.string().optional(),
    filePath: z.string(),
    fixTitle: z.string(),
    branchTitle: z.string(),
  }),
);

export async function writeIssue(payload: any, env: Env): Promise<void> {
  const repo = payload.repository;
  const octokit = new Octokit({ auth: env.GITHUB_TOKEN });
  // Issue 5: unique sandbox ID per push SHA
  const sandbox = getSandbox(env.Sandbox, buildSandboxId(payload.after));

  try {
    console.log("Cloning repository...");
    // Issue 1: setupGitCredentials writes token to sandbox FS; clone URL has no token
    const cloneUrl = await setupGitCredentials(
      sandbox,
      env.GITHUB_TOKEN,
      repo.owner.login,
      repo.name,
    );
    const cloneResult = await sandbox.exec(
      `git clone --no-single-branch --branch=${payload.ref.replace("refs/heads/", "")} ${cloneUrl} /workspace/repo`,
    );
    console.log("Clone result:", cloneResult.exitCode, cloneResult.stderr);

    console.log("Fetching changed files...");
    const comparison = await octokit.repos.compareCommits({
      owner: repo.owner.login,
      repo: repo.name,
      base: payload.before,
      head: payload.after,
    });

    // Issue 6: use buildFileList (filters removed files, applies limit)
    const rawFiles = (comparison.data.files || []).slice(0, 5);
    const fileList = buildFileList(rawFiles);

    const filesWithContent = [];
    for (const f of fileList) {
      const content = await sandbox.readFile(`/workspace/repo/${f.path}`);
      filesWithContent.push({ path: f.path, patch: f.patch, content: content.content });
    }

    console.log("Analyzing with Claude");
    const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.parse({
      // Issue 8: updated model
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `Analyze these code changes for concrete, actionable issues
            focusing on bugs, security vulnerabilities, and best
            practices.

            Rules:
            - Report a maximum of 3 issues
            - Only report issues you are confident about
            - filePath must be the exact file path prefixed with
            /workspace/repo/
            - branchTitle must be short, lowercase, kebab-case (e.g.
            fix-null-check) using only alphanumeric characters and hyphens
            - fixTitle must be a concise PR title (e.g. "fix: add null
            check in handler")


        ${filesWithContent.map((f) => `File: ${f.path}\nContent:${f.content}\nPatch:${f.patch}`).join("\n\n")}
        `,
        },
      ],
      output_config: { format: zodOutputFormat(issueWriteSchema) },
    });

    console.log("Analyzing Codebase");

    if (!response.parsed_output) throw new Error("No parsed Output");

    // Issue 6: use MAX_ISSUES constant
    for (const issue of response.parsed_output.slice(0, MAX_ISSUES)) {
      // Issue 1: validate branchTitle before use in git commands
      assertSafeBranchName(issue.branchTitle, "branchTitle");

      await octokit.issues.create({
        owner: repo.owner.login,
        repo: repo.name,
        title: issue.title,
        body: issue.body,
      });

      await anthropic.beta.messages.toolRunner({
        // Issue 8: updated model
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: `For each of these issues, draft the code solution to the problem. Create the tests and test your code to ensure that it works properly.

            The repository is cloned at /workspace/repo. ALL file
            operations must use paths starting with /workspace/repo/.
            Never use paths like /droid/ or relative paths.


            Content: ${issue.body}\nThe repository is cloned at /workspace/repo. ALL
              file operations must use paths starting with
              /workspace/repo/.

              Here are the files available:
              ${filesWithContent.map((f) => `/workspace/repo/${f.path}`).join("\n")}

              For this issue:
              Title: ${issue.title}
            File Path: ${issue.filePath}\n
            Branch: ${issue.branchTitle}\n
            PR Title: ${issue.fixTitle}\n
        `,
          },
        ],
        tools: [
          createReadFileTool(sandbox),
          createDirectoryTool(sandbox),
          createWriteFileTool(sandbox),
          createrunTestsTool(sandbox),
        ],
      });

      // Issue 3: skip commit/push/PR if no changes were made
      const changed = await hasGitChanges(sandbox, "/workspace/repo");
      if (!changed) {
        console.log(`No changes for issue "${issue.title}", skipping commit/PR`);
        continue;
      }

      // Issue 2: individual exec calls instead of multiline template literal
      await sandbox.exec('git config user.email "bot@droid.dev"', { cwd: "/workspace/repo" });
      await sandbox.exec('git config user.name "Droid"', { cwd: "/workspace/repo" });
      await sandbox.exec(`git checkout -b fix/${issue.branchTitle}`, { cwd: "/workspace/repo" });
      await sandbox.exec("git add .", { cwd: "/workspace/repo" });
      await sandbox.exec(`git commit -m "fix: ${issue.fixTitle}"`, { cwd: "/workspace/repo" });
      await sandbox.exec(`git push origin HEAD:fix/${issue.branchTitle}`, { cwd: "/workspace/repo" });

      // Issue 7: include PR body
      await octokit.pulls.create({
        owner: repo.owner.login,
        repo: repo.name,
        head: `fix/${issue.branchTitle}`,
        base: payload.ref.replace("refs/heads/", ""),
        title: issue.fixTitle,
        body: issue.prBody ?? issue.body,
      });
    }
  } catch (error: any) {
    console.error("Review failed:", error);
  } finally {
    await sandbox.destroy();
  }
}
