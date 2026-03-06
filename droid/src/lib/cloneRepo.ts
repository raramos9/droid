import type { ToolContext } from "../types/agent";

export async function cloneRepo(
  sandbox: ToolContext["sandbox"],
  owner: string,
  repo: string,
  token: string,
): Promise<void> {
  // Write credentials file so the token never appears in a logged exec command
  await sandbox.writeFile(
    "/root/.git-credentials",
    `https://x-token-auth:${token}@github.com\n`,
  );

  const helperResult = await sandbox["exec"](
    "git config --global credential.helper store",
  );
  if (helperResult.exitCode !== 0) {
    throw new Error(`Clone failed: could not configure git credential helper: ${helperResult.stderr}`);
  }

  const cloneResult = await sandbox["exec"](
    `git clone https://github.com/${owner}/${repo}.git /workspace/repo`,
  );
  if (cloneResult.exitCode !== 0) {
    throw new Error(`Clone failed: ${cloneResult.stderr}`);
  }
}
