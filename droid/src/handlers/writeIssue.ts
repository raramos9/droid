import { getSandbox, type Sandbox } from "@cloudflare/sandbox";
import { Octokit } from "@octokit/rest";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod.mjs";
import { createReadFileTool } from "../tools/readFile";
import { createWriteFileTool } from "../tools/writeFile";
import { createrunTestsTool } from "../tools/runTests";
import { createDirectoryTool } from "../tools/createDirectory";

export { Sandbox } from "@cloudflare/sandbox";

interface Env {
  Sandbox: DurableObjectNamespace<Sandbox>;
  GITHUB_TOKEN: string;
  ANTHROPIC_API_KEY: string;
  WEBHOOK_SECRET: string;
}

const issueWriteSchema = z.array(
  z.object({
    title: z.string(),
    body: z.string(),
    filePath: z.string(),
    fixTitle: z.string(),
    branchTitle: z.string()
  }),
);

export async function writeIssue(payload: any, env: Env): Promise<void> {
  const repo = payload.repository;
  const octokit = new Octokit({ auth: env.GITHUB_TOKEN });
  const sandbox = getSandbox(env.Sandbox, `issue-analysis`);

  try {
    // clone repo and create test branch
    console.log("Cloning repository...");
    const cloneUrl = `https://${env.GITHUB_TOKEN}@github.com/${repo.owner.login}/${repo.name}.git`;
    await sandbox.exec(
      `git clone --no-single-branch --branch=${payload.ref.replace("refs/heads/", "")} ${cloneUrl} /workspace/repo`,
    );

    //  need to parse through all files in a repo

    // Get changed files
    console.log("Fetching changed files...");
    const comparison = await octokit.repos.compareCommits({
      owner: repo.owner.login,
      repo: repo.name,
      base: payload.before,
      head: payload.after,
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

    // analyze code base (claude)
    console.log("Analyzing with Claude");
    const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.parse({
      model: "claude-sonnet-4-5",
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
            fix-null-check)
            - fixTitle must be a concise PR title (e.g. "fix: add null
            check in handler")
                
        
        ${files.map((f) => `File: ${f.path}\nContent:${f.content}\nPatch:${f.patch}`).join("\n\n")}
        `,
        },
      ],
      output_config: { format: zodOutputFormat(issueWriteSchema) },
    });

    console.log("Analyzing Codebase");

    if (!response.parsed_output) throw new Error("No parsed Output");

    for (const issue of response.parsed_output.slice(0,1)) {

      await octokit.issues.create({
        owner: repo.owner.login,
        repo: repo.name,
        title: issue.title,
        body: issue.body,
      });

      const review = await anthropic.beta.messages.toolRunner({
        model: "claude-sonnet-4-5",
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
              ${files.map(f => `/workspace/repo/${f.path}`).join("\n")}

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

      await sandbox.exec(`git config user.email "bot@droid.dev" && git
      config user.name "Droid" && git checkout -b
      fix/${issue.branchTitle}`, { cwd: '/workspace/repo' })
      await sandbox.exec(`git add . && git commit -m "fix: ${issue.fixTitle} "`, { cwd: '/workspace/repo'})
      await sandbox.exec(`git push origin HEAD:fix/${issue.branchTitle}`, { cwd: '/workspace/repo'})

      await octokit.pulls.create({
        owner: repo.owner.login,
        repo: repo.name,
        head: `fix/${issue.branchTitle}`,
        base: payload.ref.replace('refs/heads/', ''),
        title: issue.fixTitle
      })

      console.log(review)

    
    }

  } catch (error: any) {
    console.error("Review failed:", error);
  } finally {
    await sandbox.destroy();
  }
}
