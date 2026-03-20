function supabaseHeaders(key: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
    apikey: key,
  };
}

export interface RepoConfig {
  userConfig: string;
  repoOverrides: string;
}

export async function loadRepoConfig(
  owner: string,
  repo: string,
  supabaseUrl: string,
  supabaseKey: string,
): Promise<RepoConfig> {
  const repoUrl =
    `${supabaseUrl}/rest/v1/enrolled_repos` +
    `?owner=eq.${encodeURIComponent(owner)}&repo=eq.${encodeURIComponent(repo)}` +
    `&select=installed_by,config_overrides&limit=1`;

  const repoRes = await fetch(repoUrl, { headers: supabaseHeaders(supabaseKey) });
  if (!repoRes.ok) {
    const text = await repoRes.text();
    throw new Error(`loadRepoConfig: enrolled_repos fetch failed (${repoRes.status}): ${text}`);
  }

  const repoRows: Array<{ installed_by: string | null; config_overrides: string | null }> =
    await repoRes.json();

  if (!repoRows.length || !repoRows[0].installed_by) {
    return { userConfig: "", repoOverrides: "" };
  }

  const { installed_by, config_overrides } = repoRows[0];

  const userUrl =
    `${supabaseUrl}/rest/v1/user_configs` +
    `?user_id=eq.${encodeURIComponent(installed_by)}&select=config_text&limit=1`;

  const userRes = await fetch(userUrl, { headers: supabaseHeaders(supabaseKey) });
  if (!userRes.ok) {
    const text = await userRes.text();
    throw new Error(`loadRepoConfig: user_configs fetch failed (${userRes.status}): ${text}`);
  }

  const userRows: Array<{ config_text: string }> = await userRes.json();
  const userConfig = userRows[0]?.config_text ?? "";

  return {
    userConfig,
    repoOverrides: config_overrides ?? "",
  };
}
