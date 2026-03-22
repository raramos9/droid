import { decryptToken } from "./crypto";

function supabaseHeaders(key: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${key}`,
    "apikey": key,
  };
}

export async function getUserToken(
  owner: string,
  repo: string,
  supabaseUrl: string,
  supabaseKey: string,
  encryptionKey: string,
): Promise<string | null> {
  try {
    const enrolledRes = await fetch(
      `${supabaseUrl}/rest/v1/enrolled_repos?select=installed_by&owner=eq.${encodeURIComponent(owner)}&repo=eq.${encodeURIComponent(repo)}&order=created_at.desc&limit=1`,
      { headers: supabaseHeaders(supabaseKey) },
    );

    if (!enrolledRes.ok) {
      console.error(`getUserToken: enrolled_repos fetch failed (${enrolledRes.status})`);
      return null;
    }

    const enrolledRows: Array<{ installed_by: string }> = await enrolledRes.json();
    if (!enrolledRows.length) return null;

    const { installed_by } = enrolledRows[0];

    const tokenRes = await fetch(
      `${supabaseUrl}/rest/v1/user_tokens?select=encrypted_token,iv&github_login=eq.${encodeURIComponent(installed_by)}&limit=1`,
      { headers: supabaseHeaders(supabaseKey) },
    );

    if (!tokenRes.ok) {
      console.error(`getUserToken: user_tokens fetch failed (${tokenRes.status})`);
      return null;
    }

    const tokenRows: Array<{ encrypted_token: string; iv: string }> = await tokenRes.json();
    if (!tokenRows.length) return null;

    const { encrypted_token, iv } = tokenRows[0];
    const plaintext = await decryptToken(encrypted_token, iv, encryptionKey);
    return plaintext || null;
  } catch (err) {
    console.error("getUserToken failed:", (err as Error).message);
    return null;
  }
}
