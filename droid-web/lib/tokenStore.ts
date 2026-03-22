import { encryptToken } from "./crypto"
import { supabase } from "./supabase"

export async function upsertUserToken(githubLogin: string, accessToken: string): Promise<void> {
  const key = process.env.TOKEN_ENCRYPTION_KEY
  if (!key) {
    console.warn("TOKEN_ENCRYPTION_KEY not set — skipping user token storage")
    return
  }

  const { ciphertext, iv } = await encryptToken(accessToken, key)

  const { error } = await supabase
    .from("user_tokens")
    .upsert(
      { github_login: githubLogin, encrypted_token: ciphertext, iv, updated_at: new Date().toISOString() },
      { onConflict: "github_login" },
    )

  if (error) {
    throw new Error(error.message)
  }
}
