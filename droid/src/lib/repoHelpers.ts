import { type Sandbox } from "@cloudflare/sandbox";

export const MAX_ISSUES = 3;

export function buildSandboxId(after: string): string {
  return `issue-analysis-${after.slice(0, 8)}`;
}

export function buildFileList(
  files: Array<{ status: string; filename: string; patch?: string }>,
  limit = 5,
): Array<{ path: string; patch: string }> {
  return files
    .filter((f) => f.status !== "removed")
    .slice(0, limit)
    .map((f) => ({ path: f.filename, patch: f.patch ?? "" }));
}

export async function hasGitChanges(
  sandbox: Sandbox,
  cwd: string,
): Promise<boolean> {
  const result = await sandbox.exec("git status --porcelain", { cwd });
  return result.stdout.trim().length > 0;
}

export async function findPackageJson(
  sandbox: Sandbox,
): Promise<string | null> {
  const result = await sandbox.exec(
    "find /workspace/repo -name package.json -not -path '*/node_modules/*' -maxdepth 5",
  );
  const first = result.stdout.trim().split("\n")[0];
  return first || null;
}
