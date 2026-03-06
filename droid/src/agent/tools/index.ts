import type { ToolContext } from "../../types/agent";

export interface DroidTool {
  name: string;
  definition: {
    name: string;
    description: string;
    input_schema: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
  execute: (args: Record<string, unknown>, toolUseId?: string) => Promise<string>;
}

export class GatedActionError extends Error {
  constructor(
    public readonly tool: string,
    public readonly args: Record<string, unknown>,
    public readonly toolUseId: string,
  ) {
    super(`Gated action requires approval: ${tool}`);
    this.name = "GatedActionError";
  }
}

// Sanitize a path arg: only allow alphanumeric, slashes, dots, underscores, hyphens.
function sanitizePath(p: unknown): string {
  const s = String(p);
  if (!/^[a-zA-Z0-9/_.\-]+$/.test(s)) throw new Error(`Unsafe path argument: ${s}`);
  return s;
}

function makeGatedTool(
  name: string,
  description: string,
  properties: Record<string, unknown>,
  required: string[],
): DroidTool {
  return {
    name,
    definition: {
      name,
      description,
      input_schema: { type: "object", properties, required },
    },
    execute: async (args, toolUseId = "") => {
      throw new GatedActionError(name, args, toolUseId);
    },
  };
}

export function createFilesystemTools(sandbox: ToolContext["sandbox"]): DroidTool[] {
  return [
    {
      name: "readFile",
      definition: {
        name: "readFile",
        description: "Read the contents of a file in the sandbox",
        input_schema: {
          type: "object",
          properties: { filePath: { type: "string", description: "Absolute path to the file" } },
          required: ["filePath"],
        },
      },
      execute: async (args) => {
        try {
          const file = await sandbox.readFile(sanitizePath(args.filePath));
          return file.content;
        } catch {
          throw new Error("Error reading file");
        }
      },
    },
    {
      name: "writeFile",
      definition: {
        name: "writeFile",
        description: "Write content to a file in the sandbox",
        input_schema: {
          type: "object",
          properties: {
            filePath: { type: "string" },
            content: { type: "string" },
          },
          required: ["filePath", "content"],
        },
      },
      execute: async (args) => {
        try {
          await sandbox.writeFile(sanitizePath(args.filePath), args.content as string);
          return `File written successfully: ${args.filePath}`;
        } catch {
          throw new Error("Error writing file");
        }
      },
    },
    {
      name: "listFiles",
      definition: {
        name: "listFiles",
        description: "List files in a directory",
        input_schema: {
          type: "object",
          properties: { dirPath: { type: "string" } },
          required: ["dirPath"],
        },
      },
      execute: async (args) => {
        const dir = sanitizePath(args.dirPath);
        // sandbox.exec runs inside an isolated container — input is sanitized above
        const result = await sandbox.exec(`ls -la ${dir}`);
        return result.stdout || result.stderr;
      },
    },
    {
      name: "searchCode",
      definition: {
        name: "searchCode",
        description: "Search for a pattern in the codebase using grep",
        input_schema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search pattern (no shell metacharacters)" },
            dirPath: { type: "string" },
          },
          required: ["query", "dirPath"],
        },
      },
      execute: async (args) => {
        const dir = sanitizePath(args.dirPath);
        // Wrap query in single quotes and escape any internal single quotes
        const safeQuery = String(args.query).replace(/'/g, "'\\''");
        const result = await sandbox.exec(
          `grep -r --include="*.ts" -n '${safeQuery}' ${dir} || true`,
        );
        return result.stdout || "No matches found";
      },
    },
  ];
}

export function createShellTools(sandbox: ToolContext["sandbox"]): DroidTool[] {
  return [
    {
      name: "runCommand",
      definition: {
        name: "runCommand",
        description: "Run a shell command in the sandbox (e.g. tests, linters, build). All execution is isolated inside the sandbox container.",
        input_schema: {
          type: "object",
          properties: {
            command: { type: "string" },
            cwd: { type: "string", description: "Working directory" },
          },
          required: ["command", "cwd"],
        },
      },
      execute: async (args) => {
        const result = await sandbox.exec(args.command as string, {
          cwd: sanitizePath(args.cwd),
        });
        return `exit code: ${result.exitCode}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`;
      },
    },
  ];
}

export function createGithubReadTools(octokit: ToolContext["octokit"]): DroidTool[] {
  return [
    {
      name: "getIssue",
      definition: {
        name: "getIssue",
        description: "Fetch a GitHub issue by number",
        input_schema: {
          type: "object",
          properties: {
            owner: { type: "string" },
            repo: { type: "string" },
            issueNumber: { type: "number" },
          },
          required: ["owner", "repo", "issueNumber"],
        },
      },
      execute: async (args) => {
        const { data } = await octokit.issues.get({
          owner: args.owner,
          repo: args.repo,
          issue_number: args.issueNumber,
        });
        return JSON.stringify({ number: data.number, title: data.title, body: data.body });
      },
    },
    {
      name: "listIssues",
      definition: {
        name: "listIssues",
        description: "List open GitHub issues for a repository",
        input_schema: {
          type: "object",
          properties: {
            owner: { type: "string" },
            repo: { type: "string" },
          },
          required: ["owner", "repo"],
        },
      },
      execute: async (args) => {
        const { data } = await octokit.issues.list({
          owner: args.owner,
          repo: args.repo,
          state: "open",
        });
        return JSON.stringify(data.map((i: any) => ({ number: i.number, title: i.title })));
      },
    },
    {
      name: "getPR",
      definition: {
        name: "getPR",
        description: "Fetch a GitHub pull request by number",
        input_schema: {
          type: "object",
          properties: {
            owner: { type: "string" },
            repo: { type: "string" },
            pullNumber: { type: "number" },
          },
          required: ["owner", "repo", "pullNumber"],
        },
      },
      execute: async (args) => {
        const { data } = await octokit.pulls.get({
          owner: args.owner,
          repo: args.repo,
          pull_number: args.pullNumber,
        });
        return JSON.stringify({ number: data.number, title: data.title });
      },
    },
    {
      name: "getFileDiff",
      definition: {
        name: "getFileDiff",
        description: "Get the diff of changed files between two commits",
        input_schema: {
          type: "object",
          properties: {
            owner: { type: "string" },
            repo: { type: "string" },
            base: { type: "string" },
            head: { type: "string" },
          },
          required: ["owner", "repo", "base", "head"],
        },
      },
      execute: async (args) => {
        const { data } = await octokit.repos.compareCommits({
          owner: args.owner,
          repo: args.repo,
          base: args.base,
          head: args.head,
        });
        const files = (data.files || []).map((f: any) => ({
          filename: f.filename,
          patch: f.patch,
        }));
        return JSON.stringify(files);
      },
    },
  ];
}

export function createGatedTools(
  octokit: ToolContext["octokit"],
  sandbox: ToolContext["sandbox"],
): DroidTool[] {
  return [
    makeGatedTool(
      "createIssue",
      "Create a GitHub issue (requires approval before executing)",
      {
        owner: { type: "string" },
        repo: { type: "string" },
        title: { type: "string" },
        body: { type: "string" },
      },
      ["owner", "repo", "title", "body"],
    ),
    makeGatedTool(
      "createComment",
      "Post a comment on a GitHub issue or PR (requires approval)",
      {
        owner: { type: "string" },
        repo: { type: "string" },
        issueNumber: { type: "number" },
        body: { type: "string" },
      },
      ["owner", "repo", "issueNumber", "body"],
    ),
    makeGatedTool(
      "createPR",
      "Open a GitHub pull request (requires approval)",
      {
        owner: { type: "string" },
        repo: { type: "string" },
        head: { type: "string" },
        base: { type: "string" },
        title: { type: "string" },
        body: { type: "string" },
      },
      ["owner", "repo", "head", "base", "title", "body"],
    ),
    makeGatedTool(
      "pushCode",
      "Commit and push code changes to the remote repository (requires approval)",
      {
        repoPath: { type: "string" },
        branch: { type: "string" },
        message: { type: "string" },
      },
      ["repoPath", "branch", "message"],
    ),
    makeGatedTool(
      "mergePR",
      "Merge a GitHub pull request (requires approval)",
      {
        owner: { type: "string" },
        repo: { type: "string" },
        pullNumber: { type: "number" },
      },
      ["owner", "repo", "pullNumber"],
    ),
  ];
}

export function buildAllTools(
  sandbox: ToolContext["sandbox"],
  octokit: ToolContext["octokit"],
): DroidTool[] {
  return [
    ...createFilesystemTools(sandbox),
    ...createShellTools(sandbox),
    ...createGithubReadTools(octokit),
    ...createGatedTools(octokit, sandbox),
  ];
}
