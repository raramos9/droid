import { Octokit } from "@octokit/rest";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod.mjs";
import { z } from "zod";
import { type Agent, type AgentResult } from "./base";
import { type PushPayload, pushPayloadSchema } from "../triggers/github";
import { buildTools } from "../tools/registry";
import { setupGitCredentials } from "../lib/gitCredentials";
import { MAX_ISSUES, buildFileList, hasGitChanges } from "../lib/repoHelpers";

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

export const writeIssueAgent: Agent<PushPayload> = {
  name: "writeIssue",
  inputSchema: pushPayloadSchema,
  tools: ["readFile", "writeFile", "runTests", "createDirectory"],

  async run(input, ctx): Promise<AgentResult> {
    const { sandbox, githubToken, anthropicApiKey } = ctx;
    const repo = input.repository;
    const octokit = new Octokit({ auth: githubToken });
    const anthropic = new Anthropic({ apiKey: anthropicApiKey });
    const artifacts: string[] = [];

    try {
      const cloneUrl = await setupGitCredentials(
        sandbox,
        githubToken,
        repo.owner.login,
        repo.name,
      );

      const branch = input.ref.replace("refs/heads/", "");
      const cloneResult = await sandbox.exec(
        `git clone --no-single-branch --branch=${branch} ${cloneUrl} /workspace/repo`,
      );
      console.log("Clone result:", cloneResult.exitCode, cloneResult.stderr);

      const comparison = await octokit.repos.compareCommits({
        owner: repo.owner.login,
        repo: repo.name,
        base: input.before,
        head: input.after,
      });

      const fileList = buildFileList(comparison.data.files || []);
      const filesWithContent = [];
      for (const f of fileList) {
        const file = await sandbox.readFile(`/workspace/repo/${f.path}`);
        filesWithContent.push({ path: f.path, patch: f.patch, content: file.content });
      }

      const response = await anthropic.messages.parse({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: `Analyze these code changes for concrete, actionable issues
              focusing on bugs, security vulnerabilities, and best practices.

              Rules:
              - Report a maximum of 3 issues
              - Only report issues you are confident about
              - filePath must be the exact file path prefixed with /workspace/repo/
              - branchTitle must be short, lowercase, kebab-case using only alphanumeric characters and hyphens
              - fixTitle must be a concise PR title (e.g. "fix: add null check in handler")

              ${filesWithContent.map((f) => `File: ${f.path}\nContent:${f.content}\nPatch:${f.patch}`).join("\n\n")}`,
          },
        ],
        output_config: { format: zodOutputFormat(issueWriteSchema) },
      });

      if (!response.parsed_output) throw new Error("No parsed output from Claude");

      for (const issue of response.parsed_output.slice(0, MAX_ISSUES)) {
        assertSafeBranchName(issue.branchTitle, "branchTitle");

        const created = await octokit.issues.create({
          owner: repo.owner.login,
          repo: repo.name,
          title: issue.title,
          body: issue.body,
        });
        artifacts.push(`Issue #${created.data.number} created: ${issue.title}`);

        await anthropic.beta.messages.toolRunner({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: `For this issue, draft the code solution. Create tests and verify the code works.

              The repository is cloned at /workspace/repo. ALL file operations must use paths starting with /workspace/repo/.

              Content: ${issue.body}

              Files available:
              ${filesWithContent.map((f) => `/workspace/repo/${f.path}`).join("\n")}

              Title: ${issue.title}
              File Path: ${issue.filePath}
              Branch: ${issue.branchTitle}
              PR Title: ${issue.fixTitle}`,
            },
          ],
          tools: buildTools(this.tools, sandbox) as any,
        });

        const changed = await hasGitChanges(sandbox, "/workspace/repo");
        if (!changed) {
          console.log(`No changes for issue "${issue.title}", skipping PR`);
          continue;
        }

        await sandbox.exec('git config user.email "bot@droid.dev"', { cwd: "/workspace/repo" });
        await sandbox.exec('git config user.name "Droid"', { cwd: "/workspace/repo" });
        await sandbox.exec(`git checkout -b fix/${issue.branchTitle}`, { cwd: "/workspace/repo" });
        await sandbox.exec("git add .", { cwd: "/workspace/repo" });
        await sandbox.exec(`git commit -m "fix: ${issue.fixTitle}"`, { cwd: "/workspace/repo" });
        await sandbox.exec(`git push origin HEAD:fix/${issue.branchTitle}`, { cwd: "/workspace/repo" });

        const pr = await octokit.pulls.create({
          owner: repo.owner.login,
          repo: repo.name,
          head: `fix/${issue.branchTitle}`,
          base: branch,
          title: issue.fixTitle,
          body: issue.prBody ?? issue.body,
        });
        artifacts.push(`PR #${pr.data.number} created: ${issue.fixTitle}`);
      }

      return {
        success: true,
        artifacts,
        usage: response.usage
          ? { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens }
          : undefined,
      };
    } catch (error: any) {
      console.error("writeIssue agent failed:", error);
      return { success: false, artifacts, error: error.message };
    }
  },
};
