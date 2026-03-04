import { type Sandbox } from "@cloudflare/sandbox";

export async function setupGitCredentials(
  sandbox: Sandbox,
  token: string,
  owner: string,
  repo: string,
): Promise<string> {
  await sandbox.writeFile(
    "/root/.git-credentials",
    `https://x-access-token:${token}@github.com\n`,
  );

  await sandbox.exec(
    "git config --global credential.helper 'store --file /root/.git-credentials'",
  );

  return `https://github.com/${owner}/${repo}.git`;
}
